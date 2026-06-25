#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_ENDPOINT = 'https://zira-ai.com/graphql/storefront';
const DEFAULT_CHANNEL = 'kenmito';
const DEFAULT_LIMIT = 300;
const PAGE_SIZE = 100;

const PRODUCT_AUDIT_QUERY = `
  query ProductMetadataAudit($channel: String!, $first: Int!, $after: String) {
    products(channel: $channel, first: $first, after: $after) {
      edges {
        cursor
        node {
          id
          name
          slug
          description
          ingredients
          allergens
          dietaryTags
          countryOfOrigin
          pricePerUnit
          unitOfMeasure
          storageZone
          spiceLevel
          isAlcohol
          calories
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
          variants {
            sku
            pricing { price { gross { amount currency } } }
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

  console.log('Usage: node scripts/product-metadata-audit.mjs [options]');
  console.log('');
  console.log('Read-only audit for storefront product food metadata coverage.');
  console.log('');
  console.log('Options:');
  console.log('  --endpoint <url>       GraphQL endpoint');
  console.log('  --channel <slug>       Storefront channel slug');
  console.log(`  --limit <n>            Max products to inspect (default: ${DEFAULT_LIMIT})`);
  console.log('  --all                  Inspect all products returned by the API');
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
    output: 'docs/product-metadata-audit.md',
    csv: 'docs/product-metadata-audit.csv',
  };

  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--help') {
      printUsage(0);
    }

    if (arg === '--all') {
      options.limit = null;
      continue;
    }

    if (!arg.startsWith('--')) {
      printUsage(1, `Unexpected argument "${arg}"`);
    }

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
      case 'limit': {
        const parsed = Number.parseInt(value, 10);
        if (!Number.isInteger(parsed) || parsed < 1) {
          printUsage(1, `Invalid --limit "${value}"`);
        }
        options.limit = parsed;
        break;
      }
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

async function requestGraphql(endpoint, variables) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: PRODUCT_AUDIT_QUERY, variables }),
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

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasArray(value) {
  return Array.isArray(value) && value.length > 0;
}

function hasNutritionFacts(product) {
  const facts = product.nutritionFacts;
  if (!facts || typeof facts !== 'object') return false;

  return [
    facts.calories,
    facts.fat,
    facts.saturatedFat,
    facts.carbs,
    facts.sugar,
    facts.fiber,
    facts.protein,
    facts.salt,
    facts.servingSize,
  ].some((value) => value != null && String(value).trim() !== '');
}

function hasSku(product) {
  return product.variants?.some((variant) => hasText(variant.sku)) ?? false;
}

function hasGrossPrice(product) {
  return product.variants?.some((variant) => {
    const amount = variant.pricing?.price?.gross?.amount;
    return amount != null && String(amount).trim() !== '';
  }) ?? false;
}

function getMissingFields(product) {
  const checks = {
    sku: hasSku(product),
    grossPrice: hasGrossPrice(product),
    description: hasText(product.description),
    ingredients: hasText(product.ingredients),
    allergens: hasArray(product.allergens),
    nutritionFacts: hasNutritionFacts(product),
    countryOfOrigin: hasText(product.countryOfOrigin),
    storageZone: hasText(product.storageZone),
    unitPrice: product.pricePerUnit != null && hasText(product.unitOfMeasure),
    category: hasText(product.category?.slug),
  };

  return Object.entries(checks)
    .filter(([, present]) => !present)
    .map(([field]) => field);
}

function summarize(products) {
  const fields = [
    'sku',
    'grossPrice',
    'description',
    'ingredients',
    'allergens',
    'nutritionFacts',
    'countryOfOrigin',
    'storageZone',
    'unitPrice',
    'category',
  ];

  const counts = Object.fromEntries(fields.map((field) => [field, 0]));
  const productsWithMissing = [];

  for (const product of products) {
    const missingFields = getMissingFields(product);
    for (const field of fields) {
      if (!missingFields.includes(field)) {
        counts[field] += 1;
      }
    }

    if (missingFields.length > 0) {
      productsWithMissing.push({ product, missingFields });
    }
  }

  return { counts, productsWithMissing };
}

function csvEscape(value) {
  const text = value == null ? '' : String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function writeCsv(filePath, productsWithMissing) {
  const header = [
    'id',
    'slug',
    'name',
    'category',
    'firstSku',
    'missingFields',
    'countryOfOrigin',
    'unitOfMeasure',
    'pricePerUnit',
  ];

  const rows = productsWithMissing.map(({ product, missingFields }) => [
    product.id,
    product.slug,
    product.name,
    product.category?.slug ?? '',
    product.variants?.find((variant) => hasText(variant.sku))?.sku ?? '',
    missingFields.join('|'),
    product.countryOfOrigin ?? '',
    product.unitOfMeasure ?? '',
    product.pricePerUnit ?? '',
  ]);

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n') + '\n',
  );
}

function writeMarkdown(filePath, options, totalCount, products, summary, csvPath) {
  const inspected = products.length;
  const lines = [
    '# Product Metadata Audit',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Channel: ${options.channel}`,
    `Endpoint: ${options.endpoint}`,
    `Inspected products: ${inspected}${totalCount ? ` / ${totalCount}` : ''}`,
    `Mode: ${options.limit == null ? 'full catalog' : `limited to ${options.limit}`}`,
    '',
    'This is a read-only dry-run report. It does not mutate product data.',
    '',
    '## Coverage',
    '',
    '| Field | Present | Missing | Coverage |',
    '| --- | ---: | ---: | ---: |',
  ];

  for (const [field, present] of Object.entries(summary.counts)) {
    const missing = inspected - present;
    const coverage = inspected > 0 ? `${Math.round((present / inspected) * 100)}%` : '0%';
    lines.push(`| ${field} | ${present} | ${missing} | ${coverage} |`);
  }

  lines.push(
    '',
    '## Highest Priority Missing Fields',
    '',
  );

  const priorityFields = ['unitPrice', 'allergens', 'nutritionFacts', 'countryOfOrigin', 'storageZone'];
  for (const field of priorityFields) {
    const missing = inspected - summary.counts[field];
    lines.push(`- ${field}: ${missing} products missing`);
  }

  lines.push(
    '',
    '## Sample Products With Missing Data',
    '',
    '| Product | Category | First SKU | Missing fields |',
    '| --- | --- | --- | --- |',
  );

  for (const { product, missingFields } of summary.productsWithMissing.slice(0, 40)) {
    const firstSku = product.variants?.find((variant) => hasText(variant.sku))?.sku ?? '';
    lines.push(
      `| ${product.name} | ${product.category?.slug ?? ''} | ${firstSku} | ${missingFields.join(', ')} |`,
    );
  }

  lines.push(
    '',
    '## Recommended Next Step',
    '',
    '1. Backfill deterministic unit prices only when product weight/volume can be parsed safely.',
    '2. Do not infer allergens or nutrition facts from product names; import them from supplier/catalog sources.',
    '3. Re-run this report after each import and review the CSV before any production data write.',
    '',
    `CSV detail report: ${csvPath}`,
    '',
  );

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, lines.join('\n'));
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
    for (const edge of page.edges ?? []) {
      products.push(edge.node);
    }

    if (!page.pageInfo?.hasNextPage || !page.pageInfo.endCursor) {
      break;
    }

    after = page.pageInfo.endCursor;
  }

  return { products, totalCount };
}

async function main() {
  const options = parseArgs();
  console.log(`Read-only audit: channel=${options.channel}, limit=${options.limit ?? 'all'}`);

  const { products, totalCount } = await fetchProducts(options);
  const summary = summarize(products);

  writeCsv(options.csv, summary.productsWithMissing);
  writeMarkdown(options.output, options, totalCount, products, summary, options.csv);

  console.log(`Inspected ${products.length}${totalCount ? ` / ${totalCount}` : ''} products.`);
  console.log(`Markdown report: ${options.output}`);
  console.log(`CSV report: ${options.csv}`);

  for (const [field, present] of Object.entries(summary.counts)) {
    const missing = products.length - present;
    console.log(`${field}: present=${present}, missing=${missing}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
