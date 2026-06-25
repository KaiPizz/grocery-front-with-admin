#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_ENDPOINT = 'https://zira-ai.com/graphql/storefront';
const DEFAULT_CHANNEL = 'kenmito';
const DEFAULT_LIMIT = 300;
const PAGE_SIZE = 100;

const QUERY = `
  query UnitPriceDryRun($channel: String!, $first: Int!, $after: String) {
    products(channel: $channel, first: $first, after: $after) {
      edges {
        node {
          id
          name
          slug
          pricePerUnit
          unitOfMeasure
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

const UNIT_TO_BASE = {
  g: { unitOfMeasure: 'KG', factor: 1000 },
  kg: { unitOfMeasure: 'KG', factor: 1 },
  ml: { unitOfMeasure: 'LITER', factor: 1000 },
  l: { unitOfMeasure: 'LITER', factor: 1 },
};

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

    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
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

  console.log('Usage: node scripts/unit-price-backfill-dry-run.mjs [options]');
  console.log('');
  console.log('Dry-run only. Computes candidate pricePerUnit/unitOfMeasure from gross price and product name.');
  console.log('');
  console.log('Options:');
  console.log('  --endpoint <url>       GraphQL endpoint');
  console.log('  --channel <slug>       Storefront channel slug');
  console.log(`  --limit <n>            Max products to inspect (default: ${DEFAULT_LIMIT})`);
  console.log('  --all                  Inspect all products returned by the API');
  console.log('  --output <path>        Markdown report path');
  console.log('  --csv <path>           CSV candidate report path');
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
    output: 'docs/unit-price-backfill-dry-run.md',
    csv: 'docs/unit-price-backfill-dry-run.csv',
  };

  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help') printUsage(0);
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
    const message = payload.errors
      ?.map((error) => error.message)
      .filter(Boolean)
      .join(' - ');
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

function parseNumber(value) {
  return Number.parseFloat(String(value).replace(',', '.'));
}

function getGrossPrice(product) {
  for (const variant of product.variants ?? []) {
    const amount = variant.pricing?.price?.gross?.amount;
    const parsed = parseNumber(amount);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function normalizeUnit(unit) {
  const lower = unit.toLowerCase();
  if (lower === 'lt' || lower === 'ltr' || lower === 'litr' || lower === 'litry') return 'l';
  return lower;
}

function toBaseAmount(quantity, unit) {
  const normalizedUnit = normalizeUnit(unit);
  const config = UNIT_TO_BASE[normalizedUnit];
  if (!config) return null;

  return {
    amount: quantity / config.factor,
    unitOfMeasure: config.unitOfMeasure,
  };
}

function addCandidate(candidates, source, quantity, unit, multiplier = 1) {
  const base = toBaseAmount(quantity * multiplier, unit);
  if (!base || !Number.isFinite(base.amount) || base.amount <= 0) return;

  candidates.push({
    amount: base.amount,
    unitOfMeasure: base.unitOfMeasure,
    source,
  });
}

function parsePackQuantityFromName(name) {
  const text = name.replace(/\u00a0/g, ' ');
  const candidates = [];

  const multipackPattern = /(?:^|[^\d])(\d{1,3})\s*[x×]\s*(\d+(?:[,.]\d+)?)\s*(kg|g|ml|l|lt|ltr)\b/gi;
  for (const match of text.matchAll(multipackPattern)) {
    addCandidate(candidates, match[0].trim(), parseNumber(match[2]), match[3], Number.parseInt(match[1], 10));
  }

  const parenthesizedTotalPattern = /\((\d+(?:[,.]\d+)?)\s*(kg|g|ml|l|lt|ltr)\)/gi;
  for (const match of text.matchAll(parenthesizedTotalPattern)) {
    addCandidate(candidates, match[0].trim(), parseNumber(match[1]), match[2]);
  }

  const plainMeasurePattern = /(?:^|[^\d])(\d+(?:[,.]\d+)?)\s*(kg|g|ml|l|lt|ltr)\b/gi;
  for (const match of text.matchAll(plainMeasurePattern)) {
    addCandidate(candidates, match[0].trim(), parseNumber(match[1]), match[2]);
  }

  const unique = new Map();
  for (const candidate of candidates) {
    const key = `${candidate.unitOfMeasure}:${candidate.amount.toFixed(6)}`;
    if (!unique.has(key)) unique.set(key, candidate);
  }

  return Array.from(unique.values());
}

function getCandidate(product) {
  if (product.pricePerUnit != null && product.unitOfMeasure) {
    return { status: 'skip_existing', reason: 'Already has pricePerUnit/unitOfMeasure' };
  }

  const grossPrice = getGrossPrice(product);
  if (!grossPrice) {
    return { status: 'skip_no_price', reason: 'No positive gross price' };
  }

  const measurements = parsePackQuantityFromName(product.name ?? '');
  if (measurements.length === 0) {
    return { status: 'skip_no_measure', reason: 'No weight/volume in product name' };
  }

  const baseUnits = new Set(measurements.map((candidate) => candidate.unitOfMeasure));
  if (baseUnits.size > 1) {
    return {
      status: 'skip_ambiguous',
      reason: 'Mixed weight/volume measurements',
      measurements,
    };
  }

  const largest = measurements.reduce((best, candidate) => (
    candidate.amount > best.amount ? candidate : best
  ));

  const smallerConflict = measurements.some((candidate) => {
    if (candidate === largest) return false;
    const ratio = largest.amount / candidate.amount;
    return ratio < 1.9 || ratio > 100;
  });

  if (measurements.length > 1 && smallerConflict) {
    return {
      status: 'skip_ambiguous',
      reason: 'Multiple plausible package sizes',
      measurements,
    };
  }

  const pricePerUnit = Number((grossPrice / largest.amount).toFixed(2));
  if (!Number.isFinite(pricePerUnit) || pricePerUnit <= 0) {
    return { status: 'skip_invalid', reason: 'Computed invalid unit price', measurements };
  }

  return {
    status: 'candidate',
    grossPrice,
    packageAmount: largest.amount,
    unitOfMeasure: largest.unitOfMeasure,
    pricePerUnit,
    source: largest.source,
    measurements,
  };
}

function csvEscape(value) {
  const text = value == null ? '' : String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function writeCsv(filePath, rows) {
  const header = [
    'status',
    'id',
    'slug',
    'name',
    'category',
    'firstSku',
    'grossPrice',
    'packageAmount',
    'unitOfMeasure',
    'pricePerUnit',
    'source',
    'reason',
  ];
  const data = rows.map(({ product, result }) => [
    result.status,
    product.id,
    product.slug,
    product.name,
    product.category?.slug ?? '',
    product.variants?.find((variant) => variant.sku)?.sku ?? '',
    result.grossPrice ?? '',
    result.packageAmount ?? '',
    result.unitOfMeasure ?? '',
    result.pricePerUnit ?? '',
    result.source ?? '',
    result.reason ?? '',
  ]);

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    [header, ...data].map((row) => row.map(csvEscape).join(',')).join('\n') + '\n',
  );
}

function writeMarkdown(filePath, options, totalCount, rows, csvPath) {
  const inspected = rows.length;
  const counts = rows.reduce((acc, row) => {
    acc[row.result.status] = (acc[row.result.status] ?? 0) + 1;
    return acc;
  }, {});

  const candidates = rows.filter((row) => row.result.status === 'candidate');
  const lines = [
    '# Unit Price Backfill Dry Run',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Channel: ${options.channel}`,
    `Endpoint: ${options.endpoint}`,
    `Inspected products: ${inspected}${totalCount ? ` / ${totalCount}` : ''}`,
    `Mode: ${options.limit == null ? 'full catalog' : `limited to ${options.limit}`}`,
    '',
    'This report is read-only. It computes candidate pricePerUnit/unitOfMeasure values but does not write them.',
    '',
    '## Summary',
    '',
    '| Status | Count |',
    '| --- | ---: |',
  ];

  for (const [status, count] of Object.entries(counts).sort()) {
    lines.push(`| ${status} | ${count} |`);
  }

  lines.push(
    '',
    '## Candidate Sample',
    '',
    '| Product | SKU | Package | Price | Candidate unit price | Source |',
    '| --- | --- | ---: | ---: | ---: | --- |',
  );

  for (const { product, result } of candidates.slice(0, 40)) {
    const sku = product.variants?.find((variant) => variant.sku)?.sku ?? '';
    lines.push(
      `| ${product.name} | ${sku} | ${result.packageAmount} ${result.unitOfMeasure} | ${result.grossPrice} | ${result.pricePerUnit} / ${result.unitOfMeasure} | ${result.source} |`,
    );
  }

  lines.push(
    '',
    '## Apply Safety Rules',
    '',
    '- Apply only rows with `status=candidate` after human review.',
    '- Do not apply ambiguous rows automatically.',
    '- Re-run product metadata audit after applying candidates.',
    '',
    `CSV detail report: ${csvPath}`,
    '',
  );

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, lines.join('\n'));
}

async function main() {
  const options = parseArgs();
  console.log(`Unit price dry-run: channel=${options.channel}, limit=${options.limit ?? 'all'}`);
  const { products, totalCount } = await fetchProducts(options);
  const rows = products.map((product) => ({ product, result: getCandidate(product) }));

  writeCsv(options.csv, rows);
  writeMarkdown(options.output, options, totalCount, rows, options.csv);

  const counts = rows.reduce((acc, row) => {
    acc[row.result.status] = (acc[row.result.status] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`Inspected ${products.length}${totalCount ? ` / ${totalCount}` : ''} products.`);
  console.log(`Markdown report: ${options.output}`);
  console.log(`CSV report: ${options.csv}`);
  for (const [status, count] of Object.entries(counts).sort()) {
    console.log(`${status}: ${count}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
