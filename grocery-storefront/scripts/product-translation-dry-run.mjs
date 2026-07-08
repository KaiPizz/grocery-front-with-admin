#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_ENDPOINT = 'https://zira-ai.com/graphql/storefront';
const DEFAULT_CHANNEL = 'kenmito';
const DEFAULT_LIMIT = 25;
const DEFAULT_PAGE_SIZE = 80;
const DEFAULT_BATCH_SIZE = 1;
const DEFAULT_MODEL = process.env.OPENAI_TRANSLATION_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
const OPENAI_TIMEOUT_MS = 120_000;

const PRODUCT_TRANSLATION_QUERY = `
  query ProductTranslationDryRun($channel: String!, $first: Int!, $after: String) {
    products(channel: $channel, first: $first, after: $after) {
      edges {
        cursor
        node {
          id
          name
          slug
          description
          ingredients
          countryOfOrigin
          category { name slug }
          translation(languageCode: "en") {
            language
            name
            description
            shortDescription
          }
          variants {
            sku
          }
        }
      }
      pageInfo { hasNextPage endCursor }
      totalCount
    }
  }
`;

function unquoteEnvValue(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function loadEnvValue(key) {
  for (const fileName of ['.env.local', '.env']) {
    const filePath = path.join(process.cwd(), fileName);
    if (!fs.existsSync(filePath)) continue;

    const contents = fs.readFileSync(filePath, 'utf8');
    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex === -1) continue;

      const candidateKey = trimmed.slice(0, separatorIndex).trim();
      if (candidateKey === key) {
        return unquoteEnvValue(trimmed.slice(separatorIndex + 1));
      }
    }
  }

  return null;
}

function printUsage(exitCode = 0, errorMessage = null) {
  if (errorMessage) {
    console.error(`Error: ${errorMessage}`);
    console.error('');
  }

  console.log('Usage: node scripts/product-translation-dry-run.mjs [options]');
  console.log('');
  console.log('Generate a review-only English product translation batch. Does not write to DB.');
  console.log('');
  console.log('Options:');
  console.log('  --endpoint <url>       GraphQL endpoint');
  console.log('  --channel <slug>       Storefront channel slug');
  console.log(`  --limit <n>            Max products to translate (default: ${DEFAULT_LIMIT})`);
  console.log(`  --page-size <n>        Product fetch page size (default: ${DEFAULT_PAGE_SIZE})`);
  console.log(`  --batch-size <n>       Products per AI request (default: ${DEFAULT_BATCH_SIZE})`);
  console.log(`  --model <name>         OpenAI chat model (default: ${DEFAULT_MODEL})`);
  console.log('  --output <path>        Markdown report path');
  console.log('  --csv <path>           CSV detail report path');
  console.log('  --json <path>          JSON detail report path');
  console.log('  --no-ai                Only export candidates, with empty proposed translations');
  console.log('  --help                 Show this help message');

  process.exit(exitCode);
}

function parseArgs() {
  const options = {
    endpoint: process.env.NEXT_PUBLIC_GRAPHQL_URL
      || loadEnvValue('NEXT_PUBLIC_GRAPHQL_URL')
      || DEFAULT_ENDPOINT,
    channel: process.env.NEXT_PUBLIC_CHANNEL
      || loadEnvValue('NEXT_PUBLIC_CHANNEL')
      || DEFAULT_CHANNEL,
    limit: DEFAULT_LIMIT,
    pageSize: DEFAULT_PAGE_SIZE,
    batchSize: DEFAULT_BATCH_SIZE,
    model: DEFAULT_MODEL,
    output: 'docs/product-translation-en-dry-run.md',
    csv: 'docs/product-translation-en-dry-run.csv',
    json: 'docs/product-translation-en-dry-run.json',
    useAi: true,
  };

  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--help') printUsage(0);
    if (arg === '--no-ai') {
      options.useAi = false;
      continue;
    }
    if (!arg.startsWith('--')) printUsage(1, `Unexpected argument "${arg}"`);

    const key = arg.slice(2);
    const value = args[index + 1];
    if (value == null || value.startsWith('--')) {
      printUsage(1, `Missing value for "${arg}"`);
    }

    switch (key) {
      case 'endpoint':
        options.endpoint = value;
        break;
      case 'channel':
        options.channel = value;
        break;
      case 'limit':
        options.limit = parsePositiveInt(value, '--limit');
        break;
      case 'page-size':
        options.pageSize = parsePositiveInt(value, '--page-size');
        break;
      case 'batch-size':
        options.batchSize = parsePositiveInt(value, '--batch-size');
        break;
      case 'model':
        options.model = value;
        break;
      case 'output':
        options.output = value;
        break;
      case 'csv':
        options.csv = value;
        break;
      case 'json':
        options.json = value;
        break;
      default:
        printUsage(1, `Unknown option "${arg}"`);
    }

    index += 1;
  }

  return options;
}

function parsePositiveInt(value, label) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    printUsage(1, `Invalid ${label} "${value}"`);
  }
  return parsed;
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasEnglishTranslation(product) {
  const translation = product.translation;
  return Boolean(
    translation
    && translation.language?.toLowerCase() === 'en'
    && (hasText(translation.name) || hasText(translation.description) || hasText(translation.shortDescription))
  );
}

async function requestProducts(endpoint, variables) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: PRODUCT_TRANSLATION_QUERY, variables }),
  });

  const payload = await response.json();
  if (!response.ok || payload.errors?.length) {
    const message = payload.errors
      ?.map((error) => error.message)
      .filter(Boolean)
      .join(' - ');
    throw new Error(message || `GraphQL request failed with status ${response.status}`);
  }

  return payload.data.products;
}

async function fetchTranslationCandidates(options) {
  const candidates = [];
  let after = null;
  let inspected = 0;

  while (candidates.length < options.limit) {
    const page = await requestProducts(options.endpoint, {
      channel: options.channel,
      first: options.pageSize,
      after,
    });

    for (const edge of page.edges ?? []) {
      inspected += 1;
      const product = edge.node;
      if (!hasEnglishTranslation(product)) {
        candidates.push(product);
        if (candidates.length >= options.limit) break;
      }
    }

    if (!page.pageInfo?.hasNextPage || !page.pageInfo?.endCursor) break;
    after = page.pageInfo.endCursor;
  }

  return { candidates, inspected };
}

function compactProductForPrompt(product) {
  const sourceDescription = clean(product.description);
  const descriptionIsTooLong = sourceDescription.length > 280;
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: descriptionIsTooLong ? '' : sourceDescription,
    descriptionNote: descriptionIsTooLong ? 'source description omitted because it is long or claim-heavy' : '',
    category: product.category?.name || '',
    countryOfOrigin: product.countryOfOrigin || '',
    sku: product.variants?.[0]?.sku || '',
  };
}

function getSourceBrand(productName) {
  const parts = String(productName || '').split(' - ').map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return '';
  const tail = parts[parts.length - 1];
  const normalizedTail = tail
    .replace(/\b(biała|biały|białe|różowa|różowy|mleczna|mleczny|ciemna|ciemny|jasna|jasny|zestaw)\b/gi, ' ')
    .replace(/\b(i|oraz|and)\b/gi, ' ')
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:g|kg|ml|l|szt\.?|sheets?|pcs?)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = normalizedTail.split(/\s+/).filter(Boolean);
  const trailingBrandWords = [];
  for (let index = words.length - 1; index >= 0; index -= 1) {
    const word = words[index];
    if (/^(?:[A-Z][\p{L}0-9&.'-]*|[A-Z0-9]{2,})$/u.test(word)) {
      trailingBrandWords.unshift(word);
      if (trailingBrandWords.length >= 4) break;
      continue;
    }
    break;
  }
  if (trailingBrandWords.length) return trailingBrandWords.join(' ');

  if (words.length <= 2) return normalizedTail;
  return words.slice(-2).join(' ');
}

function normalizeProposedName(name) {
  return clean(name)
    .replace(/^Algi Sushi Nori\b/i, 'Sushi Nori Seaweed')
    .replace(/^Algi nori do sushi\b/i, 'Nori Seaweed for Sushi')
    .replace(/\bszt\.?\b/gi, 'pcs');
}

function detectReviewNotes(product, proposedName, proposedDescription) {
  const notes = [];
  const combined = `${proposedName} ${proposedDescription}`;
  const brand = getSourceBrand(product.name);

  if (brand && !combined.toLowerCase().includes(brand.toLowerCase())) {
    notes.push(`review_brand_missing:${brand}`);
  }

  if (/\b(algi|listk(?:ów|i)|szt\.?|zalewie|grzyby|pianka|krem|balsam)\b/i.test(combined)) {
    notes.push('review_possible_polish_terms');
  }

  if (/(source of|minerals|protein|vitamin|healthy|health|supports)/i.test(combined)) {
    notes.push('review_possible_claim');
  }

  if ((proposedDescription || '').length > 240) {
    notes.push('review_description_too_long');
  }

  return notes;
}

function getOpenAiKey() {
  return process.env.OPENAI_API_KEY || loadEnvValue('OPENAI_API_KEY');
}

async function translateBatchWithOpenAi(products, options) {
  const apiKey = getOpenAiKey();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set. Use --no-ai to export candidates only.');
  }

  const systemPrompt = [
    'You translate Polish grocery and Asian food storefront product catalog content into clear English.',
    'Return only strict JSON with this shape: {"translations":[{"id":"...","name":"...","description":"...","notes":"..."}]}.',
    'Return exactly one translation row for each input product id. Never reuse text from another product.',
    'Translate Polish words to English, but keep brand names, product-line names, SKUs, weights, sizes, counts, flavors, and package quantities exactly accurate.',
    'The translated name must preserve the key product identity, package size/count, and brand when present.',
    'Do not shorten the name to a generic phrase. Do not drop size/count/brand.',
    'Do not invent legal, nutrition, allergen, origin, medical, discount, halal, vegan, health, or country-of-origin claims.',
    'Do not include nutrient claims such as source of protein, minerals, vitamins, healthy, or supports health.',
    'Avoid claim-like words including healthy, rich in, natural, supports, vitamin, mineral, low calorie, diet, and better alternative.',
    'Do not write notes like "Product from ...". Do not guess country of origin.',
    'Description must be a concise neutral storefront sentence, maximum 220 characters.',
    'Do not translate full long source descriptions; summarize only the product identity and use.',
    'If source description is empty or too long, write one short neutral storefront description from the product name and category only.',
    'Use this glossary: algi = seaweed; listków = sheets; szt. = pieces; grzyby = mushrooms; marynowane = marinated; zalewa = marinade; pianka = foam; krem = cream; balsam = lotion; słodko-ostry = sweet and spicy.',
    'Do not copy expiry, return policy, stock, or short-date warnings into notes or description.',
    'Use customer-friendly English. Avoid marketing hype and emojis.',
    'Use notes only for real translation uncertainty, otherwise use an empty string.',
  ].join(' ');

  const userPrompt = JSON.stringify({
    locale: 'en',
    products: products.map(compactProductForPrompt),
  });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS),
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message || `OpenAI request failed with status ${response.status}`);
  }

  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI response did not include content');

  const parsed = JSON.parse(content);
  const rows = Array.isArray(parsed.translations) ? parsed.translations : [];
  const map = new Map();
  for (const row of rows) {
    if (row?.id) map.set(row.id, row);
  }
  return map;
}

async function translateCandidates(candidates, options) {
  if (!options.useAi) {
    return candidates.map((product) => ({
      product,
      proposedName: '',
      proposedDescription: '',
      notes: 'candidate_only_no_ai',
      status: 'candidate',
    }));
  }

  const results = [];
  const batchSize = options.batchSize;
  const totalBatches = Math.ceil(candidates.length / batchSize);
  for (let index = 0; index < candidates.length; index += batchSize) {
    const batch = candidates.slice(index, index + batchSize);
    const batchNumber = Math.floor(index / batchSize) + 1;
    console.error(`Translating batch ${batchNumber}/${totalBatches} (${batch.length} products)...`);
    const translated = await translateBatchWithOpenAi(batch, options);
    for (const product of batch) {
      const row = translated.get(product.id) ?? {};
      const proposedName = normalizeProposedName(row.name);
      const proposedDescription = clean(row.description);
      const reviewNotes = detectReviewNotes(product, proposedName, proposedDescription);
      const notes = [clean(row.notes), ...reviewNotes].filter(Boolean).join('; ');
      results.push({
        product,
        proposedName,
        proposedDescription,
        notes,
        status: proposedName
          ? reviewNotes.length > 0
            ? 'needs_review'
            : 'translated'
          : 'missing_translation',
      });
    }
    console.error(`Translated batch ${batchNumber}/${totalBatches}.`);
  }

  return results;
}

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function csvEscape(value) {
  const text = String(value ?? '');
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function buildCsv(rows) {
  const header = [
    'id',
    'slug',
    'sku',
    'category',
    'sourceName',
    'proposedEnglishName',
    'sourceDescription',
    'proposedEnglishDescription',
    'status',
    'notes',
  ];

  const lines = [header.join(',')];
  for (const row of rows) {
    const product = row.product;
    lines.push([
      product.id,
      product.slug,
      product.variants?.[0]?.sku || '',
      product.category?.name || '',
      product.name,
      row.proposedName,
      product.description || '',
      row.proposedDescription,
      row.status,
      row.notes,
    ].map(csvEscape).join(','));
  }

  return `${lines.join('\n')}\n`;
}

function buildMarkdown(rows, meta) {
  const translated = rows.filter((row) => row.status === 'translated').length;
  const lines = [
    '# Product English Translation Dry Run',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Channel: ${meta.channel}`,
    `Endpoint: ${meta.endpoint}`,
    `Model: ${meta.useAi ? meta.model : 'none (--no-ai)'}`,
    `Candidates inspected: ${meta.inspected}`,
    `Rows selected: ${rows.length}`,
    `Rows translated: ${translated}`,
    '',
    'No database writes were performed.',
    '',
    '## Sample',
    '',
    '| Slug | Source name | Proposed English name | Status |',
    '| --- | --- | --- | --- |',
  ];

  for (const row of rows.slice(0, 20)) {
    lines.push([
      row.product.slug,
      row.product.name,
      row.proposedName || '-',
      row.status,
    ].map((value) => String(value).replace(/\|/g, '\\|')).join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
  }

  lines.push('', `CSV detail report: ${meta.csv}`, `JSON detail report: ${meta.json}`, '');
  return lines.join('\n');
}

async function main() {
  const options = parseArgs();
  const { candidates, inspected } = await fetchTranslationCandidates(options);
  const rows = await translateCandidates(candidates, options);

  writeFile(options.csv, buildCsv(rows));
  writeFile(options.json, `${JSON.stringify(rows.map((row) => ({
    id: row.product.id,
    slug: row.product.slug,
    sku: row.product.variants?.[0]?.sku || null,
    category: row.product.category?.name || null,
    sourceName: row.product.name,
    proposedEnglishName: row.proposedName,
    sourceDescription: row.product.description || null,
    proposedEnglishDescription: row.proposedDescription,
    status: row.status,
    notes: row.notes,
  })), null, 2)}\n`);
  writeFile(options.output, buildMarkdown(rows, { ...options, inspected }));

  console.log(`Inspected ${inspected} products; wrote ${rows.length} translation candidates.`);
  console.log(`Markdown: ${options.output}`);
  console.log(`CSV: ${options.csv}`);
  console.log(`JSON: ${options.json}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
