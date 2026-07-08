#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_ENDPOINT = 'https://zira-ai.com/graphql/storefront';
const DEFAULT_CHANNEL = 'asiandeligo';
const PAGE_SIZE = 100;

const OUT_OF_STOCK_QUERY = `
  query OutOfStockLaunchReview($channel: String!, $first: Int!, $after: String) {
    products(channel: $channel, first: $first, after: $after) {
      edges {
        cursor
        node {
          id
          name
          slug
          thumbnail { url alt }
          category { name slug }
          pricing {
            priceRange {
              start { gross { amount currency } }
            }
          }
          variants {
            id
            name
            sku
            quantityAvailable
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

  console.log('Usage: node scripts/out-of-stock-launch-review.mjs [options]');
  console.log('');
  console.log('Read-only launch review for out-of-stock products. Does not write stock or product visibility.');
  console.log('');
  console.log('Options:');
  console.log('  --endpoint <url>       GraphQL endpoint');
  console.log('  --channel <slug>       Storefront channel slug');
  console.log('  --output <path>        Markdown report path');
  console.log('  --json <path>          JSON detail report path');
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
    output: 'docs/out-of-stock-launch-review.md',
    json: 'docs/out-of-stock-launch-review.json',
  };

  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help') printUsage(0);
    if (!arg.startsWith('--')) printUsage(1, `Unexpected argument "${arg}"`);

    const value = args[index + 1];
    if (value == null || value.startsWith('--')) {
      printUsage(1, `Missing value for "${arg}"`);
    }

    switch (arg.slice(2)) {
      case 'endpoint':
        options.endpoint = value;
        break;
      case 'channel':
        options.channel = value;
        break;
      case 'output':
        options.output = value;
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

async function requestGraphql(endpoint, variables) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: OUT_OF_STOCK_QUERY, variables }),
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

async function fetchProducts(options) {
  const products = [];
  let after = null;
  let totalCount = null;

  do {
    const page = await requestGraphql(options.endpoint, {
      channel: options.channel,
      first: PAGE_SIZE,
      after,
    });

    totalCount = page.totalCount;
    for (const edge of page.edges ?? []) {
      products.push(edge.node);
    }

    after = page.pageInfo?.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);

  return { products, totalCount };
}

function isOutOfStock(product) {
  const variants = product.variants ?? [];
  if (variants.length === 0) return false;
  return variants.every((variant) => Number(variant.quantityAvailable ?? 0) <= 0);
}

function getPrimarySku(product) {
  return product.variants?.map((variant) => variant.sku).filter(Boolean).join('|') || '';
}

function getPrimaryPrice(product) {
  const variantPrice = product.variants?.[0]?.pricing?.price?.gross;
  const productPrice = product.pricing?.priceRange?.start?.gross;
  const amount = variantPrice?.amount ?? productPrice?.amount ?? null;
  const currency = variantPrice?.currency ?? productPrice?.currency ?? '';
  return amount == null ? '' : `${amount} ${currency}`.trim();
}

function toReviewRow(product) {
  return {
    sku: getPrimarySku(product),
    name: product.name,
    slug: product.slug,
    productPath: `/products/${product.slug}`,
    category: product.category?.name || '',
    categorySlug: product.category?.slug || '',
    price: getPrimaryPrice(product),
    stockValues: (product.variants ?? []).map((variant) => variant.quantityAvailable ?? '').join('|'),
    storefrontHandling: 'visible; add-to-cart disabled',
    ownerDecisionNeeded: 'restock in POS/admin, keep visible as out-of-stock, or hide intentionally',
  };
}

function escapeMarkdown(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function buildMarkdown(rows, meta) {
  const lines = [
    '# Asia Deli Go Out-Of-Stock Launch Review',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Endpoint: ${meta.endpoint}`,
    `Channel: ${meta.channel}`,
    `Products inspected: ${meta.inspected}${meta.totalCount ? ` / ${meta.totalCount}` : ''}`,
    `Out-of-stock products: ${rows.length}`,
    `JSON detail report: ${meta.json}`,
    '',
    'No database writes were performed.',
    '',
    '## Decision',
    '',
    '- Do not invent stock quantities.',
    '- Storefront should keep these products visible but disable add-to-cart and show out-of-stock copy.',
    '- Before launch, owner/admin should restock in POS/admin, keep visible as out-of-stock, or explicitly approve hiding selected SKUs.',
    '',
    '## SKU Checklist',
    '',
    '| SKU | Product | Category | Price | Stock | Storefront | Owner action |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  ];

  for (const row of rows) {
    lines.push([
      row.sku,
      `[${row.name}](${row.productPath})`,
      row.category,
      row.price,
      row.stockValues,
      row.storefrontHandling,
      row.ownerDecisionNeeded,
    ].map(escapeMarkdown).join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
  }

  lines.push('');
  return lines.join('\n');
}

async function main() {
  const options = parseArgs();
  const { products, totalCount } = await fetchProducts(options);
  const rows = products.filter(isOutOfStock).map(toReviewRow).sort((left, right) => left.sku.localeCompare(right.sku));

  writeFile(options.json, `${JSON.stringify(rows, null, 2)}\n`);
  writeFile(options.output, buildMarkdown(rows, {
    ...options,
    inspected: products.length,
    totalCount,
  }));

  console.log(`Inspected ${products.length}${totalCount ? ` / ${totalCount}` : ''} products; found ${rows.length} out-of-stock products.`);
  console.log(`Markdown: ${options.output}`);
  console.log(`JSON: ${options.json}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
