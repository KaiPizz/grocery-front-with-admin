#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_ENDPOINT = 'https://zira-ai.com/graphql/storefront';
const DEFAULT_CHANNEL = 'kenmito';
const DEFAULT_LIMIT = 80;
const PAGE_SIZE = 100;
const SOURCE_BASE = 'https://kimchi.pl/product-pol-';
const DEFAULT_CONCURRENCY = 4;
const DEFAULT_DELAY_MS = 0;
const DEFAULT_RETRIES = 2;
const DEFAULT_CHECKPOINT_EVERY = 0;
const DEFAULT_RESUME_EXISTING = false;

const QUERY = `
  query KimchiSourceMetadataDryRun($channel: String!, $first: Int!, $after: String) {
    products(channel: $channel, first: $first, after: $after) {
      edges {
        node {
          id
          name
          slug
          ingredients
          allergens
          countryOfOrigin
          storageZone
          nutritionFacts {
            calories
            fat
            saturatedFat
            carbs
            sugar
            fiber
            protein
            salt
            servingSize
          }
          category { name slug }
          variants { sku }
        }
      }
      pageInfo { hasNextPage endCursor }
      totalCount
    }
  }
`;

const ALLERGEN_PATTERNS = [
  ['cereals', /\b(pszenic|gluten|jęczmień|jeczmien|żyto|zyto|owies|orkisz|zboż|zboz|mąka pszenna|maka pszenna)\b/iu],
  ['crustaceans', /\b(skorupiak|krewetk|krab|homar|rak)\b/iu],
  ['eggs', /\b(jaj|jaja|jajko|albumin)\b/iu],
  ['fish', /\b(ryb|bonito|tuńczyk|tunczyk|anchovy|anchois)\b/iu],
  ['peanuts', /\b(orzeszki ziemne|orzechy ziemne|arachid)\b/iu],
  ['soybeans', /\b(soj|soja|sos sojowy|lecytyna sojowa|nasiona soi)\b/iu],
  ['milk', /\b(mleko|mleka|mleczny|mleczna|laktoz|serwatk|nabiał|nabial)\b/iu],
  ['nuts', /\b(orzechy|orzech|pistacj|migdał|migdal|nerkow|laskow|włoski|wloski|macadamia)\b/iu],
  ['celery', /\b(seler)\b/iu],
  ['mustard', /\b(gorczyc|musztard)\b/iu],
  ['sesame', /\b(sezam)\b/iu],
  ['sulphites', /\b(siarczyn|dwutlenek siarki|siarka)\b/iu],
  ['lupin', /\b(łubin|lubin)\b/iu],
  ['molluscs', /\b(mięczak|mieczak|małż|malz|omułek|omulek|ostryg|kałamarnic|kalmarnic)\b/iu],
];

const NUTRITION_LABELS = [
  ['energy', /\bwartość energetyczna\b|\bwartosc energetyczna\b/iu],
  ['fat', /^tłuszcz(?:e)?$|^tluszcz(?:e)?$/iu],
  ['saturatedFat', /kwasy tłuszczowe nasycone|kwasy tluszczowe nasycone/iu],
  ['carbs', /^węglowodany$|^weglowodany$/iu],
  ['sugar', /w tym cukry/iu],
  ['fiber', /^błonnik$|^blonnik$/iu],
  ['protein', /^białko$|^bialko$/iu],
  ['salt', /^sól$|^sol$/iu],
];

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

    for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex === -1) continue;

      const candidateKey = trimmed.slice(0, separatorIndex).trim();
      if (candidateKey === key) return unquoteEnvValue(trimmed.slice(separatorIndex + 1));
    }
  }
  return null;
}

function printUsage(exitCode = 0, errorMessage = null) {
  if (errorMessage) {
    console.error(`Error: ${errorMessage}`);
    console.error('');
  }

  console.log('Usage: node scripts/kimchi-source-metadata-dry-run.mjs [options]');
  console.log('');
  console.log('Read-only scraper for kimchi.pl product metadata. Writes CSV/Markdown only.');
  console.log('');
  console.log('Options:');
  console.log('  --endpoint <url>       GraphQL endpoint');
  console.log('  --channel <slug>       Storefront channel slug');
  console.log(`  --limit <n>            Max products to inspect (default: ${DEFAULT_LIMIT})`);
  console.log('  --all                  Inspect all products returned by the API');
  console.log('  --concurrency <n>      Source fetch concurrency');
  console.log('  --delay-ms <n>         Delay before each source request');
  console.log('  --retries <n>          Retry count for 429/timeouts');
  console.log('  --checkpoint-every <n> Write partial CSV after every n completed rows');
  console.log('  --resume-existing      Reuse completed rows from the target CSV and fetch only missing/error rows');
  console.log('  --output <path>        Markdown report path');
  console.log('  --csv <path>           CSV detail report path');
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
    concurrency: DEFAULT_CONCURRENCY,
    delayMs: DEFAULT_DELAY_MS,
    retries: DEFAULT_RETRIES,
    checkpointEvery: DEFAULT_CHECKPOINT_EVERY,
    resumeExisting: DEFAULT_RESUME_EXISTING,
    output: 'docs/kimchi-source-metadata-dry-run.md',
    csv: 'docs/kimchi-source-metadata-dry-run.csv',
  };

  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help') printUsage(0);
    if (arg === '--all') {
      options.limit = null;
      continue;
    }
    if (arg === '--resume-existing') {
      options.resumeExisting = true;
      continue;
    }

    if (!arg.startsWith('--')) printUsage(1, `Unexpected argument "${arg}"`);
    const key = arg.slice(2);
    const value = args[index + 1];
    if (value == null || value.startsWith('--')) printUsage(1, `Missing value for "${arg}"`);

    switch (key) {
      case 'endpoint':
        options.endpoint = value;
        break;
      case 'channel':
        options.channel = value;
        break;
      case 'limit':
        options.limit = parsePositiveInteger(value, '--limit');
        break;
      case 'concurrency':
        options.concurrency = parsePositiveInteger(value, '--concurrency');
        break;
      case 'delay-ms':
        options.delayMs = parseNonNegativeInteger(value, '--delay-ms');
        break;
      case 'retries':
        options.retries = parseNonNegativeInteger(value, '--retries');
        break;
      case 'checkpoint-every':
        options.checkpointEvery = parseNonNegativeInteger(value, '--checkpoint-every');
        break;
      case 'output':
        options.output = value;
        break;
      case 'csv':
        options.csv = value;
        break;
      default:
        printUsage(1, `Unknown option "${arg}"`);
    }
    index += 1;
  }

  return options;
}

function parsePositiveInteger(value, label) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) printUsage(1, `Invalid ${label} "${value}"`);
  return parsed;
}

function parseNonNegativeInteger(value, label) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 0) printUsage(1, `Invalid ${label} "${value}"`);
  return parsed;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestGraphql(endpoint, variables) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: QUERY, variables }),
  });

  const responseText = await response.text();
  let payload;
  try {
    payload = JSON.parse(responseText);
  } catch {
    const preview = responseText.replace(/\s+/g, ' ').slice(0, 240);
    throw new Error(`GraphQL returned non-JSON response with status ${response.status}: ${preview}`);
  }

  if (!response.ok || payload.errors?.length) {
    const message = payload.errors?.map((error) => error.message).filter(Boolean).join(' - ');
    throw new Error(message || `GraphQL request failed with status ${response.status}`);
  }
  return payload.data.products;
}

async function fetchProducts(options) {
  const products = [];
  let after = null;
  let totalCount = null;

  while (true) {
    const remaining = options.limit == null ? PAGE_SIZE : options.limit - products.length;
    if (remaining <= 0) break;

    const first = Math.min(PAGE_SIZE, remaining);
    const page = await requestGraphql(options.endpoint, {
      channel: options.channel,
      first,
      after,
    });

    totalCount = page.totalCount;
    for (const edge of page.edges ?? []) products.push(edge.node);

    if (!page.pageInfo?.hasNextPage || !page.pageInfo.endCursor) break;
    after = page.pageInfo.endCursor;
  }
  return { products, totalCount };
}

function firstSku(product) {
  return product.variants?.find((variant) => variant?.sku?.trim())?.sku?.trim() ?? '';
}

function kimchiNumericId(product) {
  const sku = firstSku(product);
  const fromSku = sku.match(/^KIMCHI-(\d+)$/i)?.[1];
  if (fromSku) return fromSku;
  return product.slug?.match(/^KIMCHI-(\d+)$/i)?.[1] ?? null;
}

function compactText(value) {
  return String(value ?? '')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function cleanMarkdown(value) {
  return compactText(value)
    .replace(/!\[[^\]]*]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/\*\*/g, '')
    .replace(/#{1,6}\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function productSection(markdown) {
  const firstHeading = markdown.search(/\n#\s+/);
  if (firstHeading === -1) return markdown;
  return markdown.slice(firstHeading);
}

function splitLines(markdown) {
  return compactText(markdown)
    .split('\n')
    .map((line) => cleanMarkdown(line))
    .filter(Boolean);
}

function lineAfterLabel(lines, labelPattern) {
  const index = lines.findIndex((line) => labelPattern.test(line));
  if (index === -1) return '';

  const inline = lines[index].replace(labelPattern, '').replace(/^[-:–\s]+/, '').trim();
  if (inline) return inline;
  return lines[index + 1] ?? '';
}

function blockAfterLabel(section, labelPattern, stopPatterns, maxChars = 1800) {
  const lines = splitLines(section);
  const startIndex = lines.findIndex((line) => labelPattern.test(line));
  if (startIndex === -1) return '';

  const first = lines[startIndex].replace(labelPattern, '').replace(/^[-:–\s]+/, '').trim();
  const values = first ? [first] : [];

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (stopPatterns.some((pattern) => pattern.test(line))) break;
    if (values.join(' ').length >= maxChars) break;
    values.push(line);
  }

  return values.join(' ').trim();
}

function linesAfterLabel(section, labelPattern, stopPatterns, maxChars = 1800) {
  const lines = splitLines(section);
  const startIndex = lines.findIndex((line) => labelPattern.test(line));
  if (startIndex === -1) return [];

  const first = lines[startIndex].replace(labelPattern, '').replace(/^[-:–\s]+/, '').trim();
  const values = first ? [first] : [];

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (stopPatterns.some((pattern) => pattern.test(line))) break;
    if (values.join(' ').length >= maxChars) break;
    values.push(line);
  }

  return values;
}

function extractAllergenWarning(section) {
  return blockAfterLabel(
    section,
    /^Ostrzeżenie o alergenach\b/i,
    [
      /^Kraj pochodzenia\b/i,
      /^Pełny skład\b/i,
      /^Składniki?\b/i,
      /^Skład\b/i,
      /^Wartości odżywcze\b/i,
      /^Przechowywać\b/i,
      /^Dieta\b/i,
      /^Informacje dodatkowe\b/i,
    ],
    1200,
  );
}

function extractStorageText(section) {
  const lines = splitLines(section);
  const line = lines.find((candidate) => /przechowywać|przechowywac|po otwarciu|lodówce|lodowce|zamrażarce|zamrazarce|suchym.*chłodnym|suchym.*chlodnym/i.test(candidate));
  if (!line) return '';
  return line.replace(/^[-*]\s*/, '').trim();
}

function inferStorageZone(storageText) {
  const text = storageText.toLocaleLowerCase('pl-PL');
  if (!text) return '';
  if (/zamraż|zamraz|mroż|mroz|-\s?18|−\s?18/.test(text)) return 'FROZEN';
  if (/such|wilgoc|słonecz|slonecz|pokoj|temperatur|chłodn|chlodn/.test(text) && /po otwarciu.*lodów|po otwarciu.*lodow/.test(text)) {
    return 'AMBIENT';
  }
  if (/przechowywać w lodów|przechowywac w lodow|przechowywać.*0\s?-\s?6|przechowywac.*0\s?-\s?6|przechowywać.*2\s?-\s?8|przechowywac.*2\s?-\s?8/.test(text)) {
    return 'CHILLED';
  }
  if (/such|wilgoc|słonecz|slonecz|pokoj|temperatur|chłodn|chlodn|po otwarciu.*lodów|po otwarciu.*lodow/.test(text)) return 'AMBIENT';
  return '';
}

function extractIngredients(section) {
  return blockAfterLabel(
    section,
    /^(Pełny skład|Składniki?|Skład)\b/i,
    [
      /^Wartości odżywcze\b/i,
      /^Dieta\b/i,
      /^Cechy produktu\b/i,
      /^Informacje dodatkowe\b/i,
      /^Aktualne informacje\b/i,
      /^Opis\b/i,
    ],
    3000,
  );
}

function detectAllergens(rawText) {
  const haystack = cleanMarkdown(rawText).toLocaleLowerCase('pl-PL');
  const codes = [];
  for (const [code, pattern] of ALLERGEN_PATTERNS) {
    if (pattern.test(haystack)) codes.push(code);
  }
  return codes;
}

function parseNumber(value) {
  if (!value) return '';
  const match = String(value).replace(',', '.').match(/-?\d+(?:\.\d+)?/);
  return match ? Number.parseFloat(match[0]) : '';
}

function parseGramNumber(value) {
  if (!value) return '';
  const text = String(value).replace(',', '.');
  const number = parseNumber(text);
  if (number === '') return '';
  if (/\bmg\b/i.test(text)) return Number((number / 1000).toFixed(4));
  return number;
}

function extractNutritionBlock(section) {
  return blockAfterLabel(
    section,
    /^Wartości odżywcze\b/i,
    [
      /^Dieta\b/i,
      /^Cechy produktu\b/i,
      /^Informacje dodatkowe\b/i,
      /^Aktualne informacje\b/i,
      /^Producent\b/i,
      /^Kraj pochodzenia\b/i,
    ],
    1400,
  );
}

function parseNutrition(section) {
  const lines = linesAfterLabel(
    section,
    /^Wartości odżywcze\b/i,
    [
      /^Dieta\b/i,
      /^Cechy produktu\b/i,
      /^Informacje dodatkowe\b/i,
      /^Aktualne informacje\b/i,
      /^Producent\b/i,
      /^Kraj pochodzenia\b/i,
    ],
    1400,
  );
  if (lines.length === 0) return { raw: '', servingSize: '', facts: {} };

  const headingMatch = section.match(/Wartości odżywcze\s*\(([^)]{2,80})\)/i);
  const servingSize = headingMatch ? headingMatch[1].trim() : '';
  const block = lines.join('\n');
  const facts = {};

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    for (const [field, pattern] of NUTRITION_LABELS) {
      if (!pattern.test(line)) continue;

      const inline = line.replace(pattern, '').trim();
      const candidate = /\d/.test(inline) ? inline : (lines[index + 1] || '');
      if (field === 'energy') {
        const kcalMatch = candidate.match(/(\d+(?:[,.]\d+)?)\s*kcal/i);
        const kjMatch = candidate.match(/(\d+(?:[,.]\d+)?)\s*kj/i);
        if (kcalMatch) facts.calories = parseNumber(kcalMatch[1]);
        if (kjMatch) facts.energyKj = parseNumber(kjMatch[1]);
      } else {
        facts[field] = parseGramNumber(candidate);
      }
    }
  }

  return { raw: block, servingSize, facts };
}

function extractTraits(section, labelPattern, stopPatterns) {
  const block = blockAfterLabel(section, labelPattern, stopPatterns, 500);
  if (!block) return [];
  return [...new Set(block.split(/(?=[A-ZĄĆĘŁŃÓŚŹŻ])/).map((value) => value.trim()).filter(Boolean))];
}

function sourceDecision(row) {
  const hasAny = Boolean(
    row.rawAllergenWarning
    || row.candidateAllergens
    || row.rawStorageText
    || row.rawIngredients
    || row.nutritionRaw,
  );
  if (row.sourceStatus !== 200) return 'fetch_error';
  if (!hasAny) return 'no_metadata_found';
  return 'review_candidate';
}

async function fetchKimchiMarkdown(id, options) {
  const sourceUrl = `${SOURCE_BASE}${id}.html`;
  const readerUrl = `https://r.jina.ai/${sourceUrl}`;

  for (let attempt = 0; attempt <= options.retries; attempt += 1) {
    if (options.delayMs > 0) await sleep(options.delayMs);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(readerUrl, {
        headers: { 'User-Agent': 'Kenmito metadata dry-run (+https://kenmito.enail.pro)' },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const text = await response.text();
      if (response.ok) return { sourceUrl, status: 200, markdown: text };

      if (response.status === 429 && attempt < options.retries) {
        await sleep(15000 * (attempt + 1));
        continue;
      }

      return { sourceUrl, status: response.status, markdown: text, fetchError: true };
    } catch (error) {
      if (attempt < options.retries) {
        await sleep(8000 * (attempt + 1));
        continue;
      }
      return {
        sourceUrl,
        status: `fetch_error:${error?.name === 'AbortError' ? 'timeout' : error?.message ?? 'unknown'}`,
        markdown: '',
        fetchError: true,
      };
    }
  }

  return { sourceUrl, status: 'fetch_error:unknown', markdown: '', fetchError: true };
}

function csvEscape(value) {
  const text = value == null ? '' : String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function writeCsv(filePath, rows) {
  const header = [
    'decision',
    'id',
    'slug',
    'name',
    'category',
    'firstSku',
    'sourceUrl',
    'sourceStatus',
    'currentIngredientsPresent',
    'currentAllergensPresent',
    'currentNutritionPresent',
    'currentStorageZone',
    'rawAllergenWarning',
    'candidateAllergens',
    'rawStorageText',
    'candidateStorageZone',
    'rawIngredients',
    'nutritionServingSize',
    'nutritionCaloriesKcal',
    'nutritionEnergyKj',
    'nutritionFat',
    'nutritionSaturatedFat',
    'nutritionCarbs',
    'nutritionSugar',
    'nutritionFiber',
    'nutritionProtein',
    'nutritionSalt',
    'nutritionRaw',
    'dietTraits',
    'productTraits',
  ];

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    [header, ...rows.map((row) => header.map((key) => row[key] ?? ''))]
      .map((row) => row.map(csvEscape).join(','))
      .join('\n') + '\n',
  );
}

function parseCsv(text) {
  const records = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      records.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }

  if (field || row.length > 0) {
    row.push(field);
    records.push(row);
  }

  return records;
}

function readExistingRows(filePath) {
  if (!fs.existsSync(filePath)) return new Map();
  const records = parseCsv(fs.readFileSync(filePath, 'utf8'));
  const header = records.shift();
  if (!header?.length) return new Map();

  const byId = new Map();
  for (const record of records) {
    const row = {};
    for (let index = 0; index < header.length; index += 1) {
      row[header[index]] = record[index] ?? '';
    }
    if (!row.id) continue;
    byId.set(row.id, row);
  }
  return byId;
}

function writeMarkdown(filePath, options, totalCount, rows, csvPath) {
  const counts = rows.reduce((acc, row) => {
    acc[row.decision] = (acc[row.decision] ?? 0) + 1;
    return acc;
  }, {});

  const withAllergens = rows.filter((row) => row.candidateAllergens).length;
  const withNutrition = rows.filter((row) => row.nutritionRaw).length;
  const withStorage = rows.filter((row) => row.rawStorageText).length;
  const withIngredients = rows.filter((row) => row.rawIngredients).length;

  const lines = [
    '# Kimchi Source Metadata Dry Run',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Channel: ${options.channel}`,
    `Endpoint: ${options.endpoint}`,
    `Source: ${SOURCE_BASE}{id}.html via r.jina.ai`,
    `Catalog total: ${totalCount ?? 'unknown'}`,
    `Inspected products: ${rows.length}`,
    '',
    'This is a read-only scrape report. It does not mutate product data.',
    '',
    '## Summary',
    '',
    '| Metric | Count |',
    '| --- | ---: |',
    `| review_candidate | ${counts.review_candidate ?? 0} |`,
    `| no_metadata_found | ${counts.no_metadata_found ?? 0} |`,
    `| fetch_error | ${counts.fetch_error ?? 0} |`,
    `| rows with candidate allergens | ${withAllergens} |`,
    `| rows with nutrition block | ${withNutrition} |`,
    `| rows with storage text | ${withStorage} |`,
    `| rows with ingredients text | ${withIngredients} |`,
    '',
    '## Sample Candidates',
    '',
    '| SKU | Product | Allergens | Storage | Nutrition | Source |',
    '| --- | --- | --- | --- | --- | --- |',
  ];

  for (const row of rows.filter((candidate) => candidate.decision === 'review_candidate').slice(0, 40)) {
    lines.push(`| ${row.firstSku} | ${row.name} | ${row.candidateAllergens || '-'} | ${row.candidateStorageZone || '-'} | ${row.nutritionRaw ? 'yes' : 'no'} | ${row.sourceUrl} |`);
  }

  lines.push(
    '',
    '## Review Notes',
    '',
    '- Candidate allergen codes are extracted from kimchi.pl source text and still require review before DB apply.',
    '- Nutrition values are parsed from source blocks when labels are present; keep raw nutrition text in the CSV for verification.',
    '- Storage zone is inferred conservatively from storage text: dry/shelf = AMBIENT, fridge/cool = CHILLED, freezer/frozen = FROZEN.',
    '- Cosmetic/non-food rows should be excluded before any legal food metadata apply.',
    '',
    `CSV detail report: ${csvPath}`,
    '',
  );

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, lines.join('\n'));
}

async function mapWithConcurrency(items, concurrency, mapper, onProgress = null) {
  const results = new Array(items.length);
  let nextIndex = 0;
  let completedCount = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
      completedCount += 1;
      if (onProgress) onProgress(results, completedCount);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

async function main() {
  const options = parseArgs();
  console.log(`Read-only kimchi.pl scrape: channel=${options.channel}, limit=${options.limit ?? 'all'}, concurrency=${options.concurrency}, delayMs=${options.delayMs}, retries=${options.retries}, resume=${options.resumeExisting ? 'yes' : 'no'}`);

  const { products, totalCount } = await fetchProducts(options);
  const existingRows = options.resumeExisting ? readExistingRows(options.csv) : new Map();
  const reusableRows = new Map(
    [...existingRows.entries()].filter(([, row]) => row.decision && row.decision !== 'fetch_error'),
  );
  const productsToFetch = products.filter((product) => !reusableRows.has(product.id));
  const fetchedRows = new Map();

  if (options.resumeExisting) {
    console.log(`Resume checkpoint: reusable=${reusableRows.size}, refetch-or-missing=${productsToFetch.length}, catalog=${products.length}`);
  }

  await mapWithConcurrency(productsToFetch, options.concurrency, async (product, index) => {
    if ((index + 1) % 20 === 0) console.log(`Fetched source metadata for ${index + 1}/${products.length}`);

    const id = kimchiNumericId(product);
    const baseRow = {
      id: product.id,
      slug: product.slug,
      name: product.name,
      category: product.category?.slug ?? '',
      firstSku: firstSku(product),
      sourceUrl: id ? `${SOURCE_BASE}${id}.html` : '',
      sourceStatus: '',
      currentIngredientsPresent: product.ingredients?.trim() ? 'yes' : 'no',
      currentAllergensPresent: Array.isArray(product.allergens) && product.allergens.length > 0 ? 'yes' : 'no',
      currentNutritionPresent: product.nutritionFacts ? 'yes' : 'no',
      currentStorageZone: product.storageZone ?? '',
      rawAllergenWarning: '',
      candidateAllergens: '',
      rawStorageText: '',
      candidateStorageZone: '',
      rawIngredients: '',
      nutritionServingSize: '',
      nutritionCaloriesKcal: '',
      nutritionEnergyKj: '',
      nutritionFat: '',
      nutritionSaturatedFat: '',
      nutritionCarbs: '',
      nutritionSugar: '',
      nutritionFiber: '',
      nutritionProtein: '',
      nutritionSalt: '',
      nutritionRaw: '',
      dietTraits: '',
      productTraits: '',
      decision: '',
    };

    if (!id) return { ...baseRow, decision: 'skip_no_kimchi_id' };

    const source = await fetchKimchiMarkdown(id, options);
    const row = { ...baseRow, sourceUrl: source.sourceUrl, sourceStatus: source.status };
    if (source.fetchError) return { ...row, decision: 'fetch_error' };

    const section = productSection(source.markdown);
    const allergenWarning = extractAllergenWarning(section);
    const rawIngredients = extractIngredients(section);
    const rawStorageText = extractStorageText(section);
    const nutrition = parseNutrition(section);
    const allergenSourceText = [allergenWarning, rawIngredients].filter(Boolean).join(' ');
    const candidateAllergens = detectAllergens(allergenSourceText);
    const dietTraits = extractTraits(section, /^Dieta\b/i, [/^Cechy produktu\b/i, /^Kupująć\b/i, /^Cena produktu\b/i]);
    const productTraits = extractTraits(section, /^Cechy produktu\b/i, [/^Kupująć\b/i, /^Cena produktu\b/i, /^PayPo\b/i]);

    const filled = {
      ...row,
      rawAllergenWarning: allergenWarning,
      candidateAllergens: candidateAllergens.join('|'),
      rawStorageText,
      candidateStorageZone: inferStorageZone(rawStorageText),
      rawIngredients,
      nutritionServingSize: nutrition.servingSize,
      nutritionCaloriesKcal: nutrition.facts.calories ?? '',
      nutritionEnergyKj: nutrition.facts.energyKj ?? '',
      nutritionFat: nutrition.facts.fat ?? '',
      nutritionSaturatedFat: nutrition.facts.saturatedFat ?? '',
      nutritionCarbs: nutrition.facts.carbs ?? '',
      nutritionSugar: nutrition.facts.sugar ?? '',
      nutritionFiber: nutrition.facts.fiber ?? '',
      nutritionProtein: nutrition.facts.protein ?? '',
      nutritionSalt: nutrition.facts.salt ?? '',
      nutritionRaw: nutrition.raw,
      dietTraits: dietTraits.join('|'),
      productTraits: productTraits.join('|'),
    };

    return { ...filled, decision: sourceDecision(filled) };
  }, (partialRows, completedCount) => {
    for (const row of partialRows.filter(Boolean)) fetchedRows.set(row.id, row);
    if (options.checkpointEvery > 0 && completedCount % options.checkpointEvery === 0) {
      const mergedRows = products
        .map((product) => fetchedRows.get(product.id) ?? reusableRows.get(product.id))
        .filter(Boolean);
      writeCsv(options.csv, mergedRows);
      console.log(`Checkpoint CSV: ${mergedRows.length}/${products.length} rows, fetched ${completedCount}/${productsToFetch.length}`);
    }
  });

  const rows = products
    .map((product) => fetchedRows.get(product.id) ?? reusableRows.get(product.id))
    .filter(Boolean);

  writeCsv(options.csv, rows);
  writeMarkdown(options.output, options, totalCount, rows, options.csv);

  const counts = rows.reduce((acc, row) => {
    acc[row.decision] = (acc[row.decision] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`Inspected ${rows.length}${totalCount ? ` / ${totalCount}` : ''} products.`);
  for (const [decision, count] of Object.entries(counts)) console.log(`${decision}: ${count}`);
  console.log(`Rows with candidate allergens: ${rows.filter((row) => row.candidateAllergens).length}`);
  console.log(`Rows with nutrition block: ${rows.filter((row) => row.nutritionRaw).length}`);
  console.log(`Rows with storage text: ${rows.filter((row) => row.rawStorageText).length}`);
  console.log(`Rows with ingredients text: ${rows.filter((row) => row.rawIngredients).length}`);
  console.log(`Wrote ${options.output}`);
  console.log(`Wrote ${options.csv}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
