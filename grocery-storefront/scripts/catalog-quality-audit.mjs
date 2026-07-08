#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_ENDPOINT = 'https://zira-ai.com/graphql/storefront';
const DEFAULT_CHANNEL = 'kenmito';
const PAGE_SIZE = 100;

const CATALOG_AUDIT_QUERY = `
  query CatalogQualityAudit($channel: String!, $first: Int!, $after: String) {
    products(channel: $channel, first: $first, after: $after) {
      edges {
        cursor
        node {
          id
          name
          slug
          description
          translation(languageCode: "en") {
            name
            description
            shortDescription
          }
          thumbnail { url alt }
          media { url alt type sortOrder }
          allergens
          mayContainAllergens
          dietaryTags
          certifications
          countryOfOrigin
          pricePerUnit
          unitOfMeasure
          storageZone
          ingredients
          spiceLevel
          isAlcohol
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
          category { id name slug }
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

const CATEGORY_AUDIT_QUERY = `
  query CategoryQualityAudit($channel: String!) {
    categories(channel: $channel, first: 200) {
      edges {
        node {
          id
          slug
          name
          level
          description
          backgroundImage { url alt }
          products(channel: $channel, first: 0) { totalCount }
          children(first: 20) {
            edges { node { id slug name level } }
          }
        }
      }
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

  console.log('Usage: node scripts/catalog-quality-audit.mjs [options]');
  console.log('');
  console.log('Read-only audit for Asia Deli Go storefront catalog completeness.');
  console.log('');
  console.log('Options:');
  console.log('  --endpoint <url>       GraphQL endpoint');
  console.log('  --channel <slug>       Storefront channel slug');
  console.log('  --limit <n>            Max products to inspect');
  console.log('  --all                  Inspect all products returned by the API');
  console.log('  --output <path>        Markdown report path');
  console.log('  --csv <path>           CSV detail report path');
  console.log('  --json <path>          JSON summary path');
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
    limit: null,
    output: 'docs/catalog-quality-audit.md',
    csv: 'docs/catalog-quality-audit.csv',
    json: 'docs/catalog-quality-audit.json',
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

async function requestGraphql(endpoint, query, variables) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  const payload = await response.json();
  if (!response.ok || payload.errors?.length) {
    const message = payload.errors
      ?.map((error) => error.message)
      .filter(Boolean)
      .join(' - ');
    throw new Error(message || `GraphQL request failed with status ${response.status}`);
  }

  return payload.data;
}

async function fetchProducts(options) {
  const products = [];
  let after = null;
  let totalCount = null;

  do {
    const remaining = options.limit == null ? PAGE_SIZE : options.limit - products.length;
    const first = Math.min(PAGE_SIZE, remaining);
    if (first <= 0) break;

    const data = await requestGraphql(options.endpoint, CATALOG_AUDIT_QUERY, {
      channel: options.channel,
      first,
      after,
    });

    const connection = data.products;
    totalCount = connection.totalCount;
    for (const edge of connection.edges ?? []) {
      products.push(edge.node);
    }

    after = connection.pageInfo?.endCursor ?? null;
    if (!connection.pageInfo?.hasNextPage) break;
  } while (options.limit == null || products.length < options.limit);

  return { products, totalCount };
}

async function fetchCategories(options) {
  const data = await requestGraphql(options.endpoint, CATEGORY_AUDIT_QUERY, {
    channel: options.channel,
  });

  return {
    categories: data.categories?.edges?.map((edge) => edge.node) ?? [],
    totalCount: data.categories?.totalCount ?? null,
  };
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeText(value) {
  return hasText(value) ? value.trim() : '';
}

function hasArray(value) {
  return Array.isArray(value) && value.length > 0;
}

function getVariantSkus(product) {
  return (product.variants ?? [])
    .map((variant) => normalizeText(variant.sku))
    .filter(Boolean);
}

function getGrossAmounts(product) {
  const productRangeAmount = product.pricing?.priceRange?.start?.gross?.amount;
  const variantAmounts = (product.variants ?? [])
    .map((variant) => variant.pricing?.price?.gross?.amount)
    .filter((amount) => amount != null);

  return [productRangeAmount, ...variantAmounts].filter((amount) => amount != null);
}

function hasPositivePrice(product) {
  return getGrossAmounts(product).some((amount) => Number(amount) > 0);
}

function hasStockValue(product) {
  return (product.variants ?? []).some((variant) => variant.quantityAvailable != null);
}

function isOutOfStock(product) {
  const variants = product.variants ?? [];
  if (variants.length === 0) return false;
  return variants.every((variant) => Number(variant.quantityAvailable ?? 0) <= 0);
}

function hasProductImage(product) {
  const thumbnailUrl = normalizeText(product.thumbnail?.url);
  if (thumbnailUrl) return true;

  return (product.media ?? []).some((media) => {
    const url = normalizeText(media.url);
    const type = normalizeText(media.type).toLowerCase();
    return url && (!type || type.includes('image'));
  });
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

function getDuplicateMap(values) {
  const map = new Map();
  for (const value of values) {
    if (!value) continue;
    map.set(value, (map.get(value) ?? 0) + 1);
  }
  return new Map([...map.entries()].filter(([, count]) => count > 1));
}

function pushCount(map, key, increment = 1) {
  const normalized = normalizeText(key) || '(blank)';
  map.set(normalized, (map.get(normalized) ?? 0) + increment);
}

function sortCountMap(map) {
  return [...map.entries()].sort((left, right) => {
    if (right[1] !== left[1]) return right[1] - left[1];
    return left[0].localeCompare(right[0]);
  });
}

function includesAny(value, needles) {
  const haystack = normalizeText(value).toLowerCase();
  return needles.some((needle) => haystack.includes(needle));
}

function productSearchText(product) {
  return [
    product.name,
    product.slug,
    product.description,
    product.ingredients,
    product.category?.name,
    product.category?.slug,
  ].filter(Boolean).join(' ');
}

function getIssues(product, duplicateSkus, duplicateSlugs) {
  const skus = getVariantSkus(product);
  const issueChecks = {
    missing_image: !hasProductImage(product),
    missing_sku: skus.length === 0,
    duplicate_sku: skus.some((sku) => duplicateSkus.has(sku)),
    missing_slug: !hasText(product.slug),
    duplicate_slug: duplicateSlugs.has(normalizeText(product.slug)),
    missing_price: !hasPositivePrice(product),
    missing_stock: !hasStockValue(product),
    out_of_stock: isOutOfStock(product),
    missing_category: !hasText(product.category?.slug),
    missing_description: !hasText(product.description),
    missing_ingredients: !hasText(product.ingredients),
    missing_allergens: !hasArray(product.allergens),
    missing_nutrition: !hasNutritionFacts(product),
    missing_country: !hasText(product.countryOfOrigin),
    missing_storage_zone: !hasText(product.storageZone),
    missing_unit_price: product.pricePerUnit == null || !hasText(product.unitOfMeasure),
    missing_english_translation: !hasText(product.translation?.name),
    no_variants: (product.variants ?? []).length === 0,
  };

  return Object.entries(issueChecks)
    .filter(([, hasIssue]) => hasIssue)
    .map(([issue]) => issue);
}

function summarize(products, categories) {
  const duplicateSkus = getDuplicateMap(products.flatMap(getVariantSkus));
  const duplicateSlugs = getDuplicateMap(products.map((product) => normalizeText(product.slug)));
  const issueCounts = new Map();
  const categoryCounts = new Map();
  const storageZoneCounts = new Map();
  const dietaryTagCounts = new Map();
  const allergenCounts = new Map();
  const countryCounts = new Map();
  const productsWithIssues = [];
  const kamitoMentions = [];
  const glutenCandidatesWithoutTag = [];
  const vegetarianCandidatesWithoutTag = [];

  for (const product of products) {
    const issues = getIssues(product, duplicateSkus, duplicateSlugs);
    for (const issue of issues) pushCount(issueCounts, issue);
    if (issues.length > 0) productsWithIssues.push({ product, issues });

    pushCount(categoryCounts, product.category?.name ?? product.category?.slug);
    if (hasText(product.storageZone)) pushCount(storageZoneCounts, product.storageZone);
    for (const tag of product.dietaryTags ?? []) pushCount(dietaryTagCounts, tag);
    for (const allergen of product.allergens ?? []) pushCount(allergenCounts, allergen);
    if (hasText(product.countryOfOrigin)) pushCount(countryCounts, product.countryOfOrigin);

    const text = productSearchText(product);
    const tags = (product.dietaryTags ?? []).map((tag) => normalizeText(tag).toLowerCase());
    if (includesAny(text, ['kamito', 'kenmito'])) {
      kamitoMentions.push(product);
    }
    if (
      includesAny(text, ['bezgluten', 'gluten free', 'gluten-free'])
      && !tags.some((tag) => tag.includes('gluten'))
    ) {
      glutenCandidatesWithoutTag.push(product);
    }
    if (
      includesAny(text, ['vegetarian', 'wegetaria', 'vege'])
      && !tags.some((tag) => tag.includes('vegetarian') || tag.includes('wegetaria') || tag.includes('vege'))
    ) {
      vegetarianCandidatesWithoutTag.push(product);
    }
  }

  const categoryAudit = categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    level: category.level,
    productsCount: category.products?.totalCount ?? 0,
    childrenCount: category.children?.edges?.length ?? 0,
    missingDescription: !hasText(category.description),
    missingImage: !hasText(category.backgroundImage?.url),
    hasLegacyName: includesAny(`${category.name} ${category.slug}`, ['kamito', 'kenmito']),
  }));

  return {
    duplicateSkus: [...duplicateSkus.entries()].sort(),
    duplicateSlugs: [...duplicateSlugs.entries()].sort(),
    issueCounts: sortCountMap(issueCounts),
    categoryCounts: sortCountMap(categoryCounts),
    storageZoneCounts: sortCountMap(storageZoneCounts),
    dietaryTagCounts: sortCountMap(dietaryTagCounts),
    allergenCounts: sortCountMap(allergenCounts),
    countryCounts: sortCountMap(countryCounts),
    productsWithIssues,
    kamitoMentions,
    glutenCandidatesWithoutTag,
    vegetarianCandidatesWithoutTag,
    categoryAudit,
  };
}

function csvEscape(value) {
  const stringValue = value == null ? '' : String(value);
  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replaceAll('"', '""')}"`;
  }
  return stringValue;
}

function writeCsv(filePath, summary) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const rows = [
    [
      'id',
      'name',
      'slug',
      'category',
      'skus',
      'price_amounts',
      'stock_values',
      'dietary_tags',
      'allergens',
      'issues',
    ],
  ];

  for (const { product, issues } of summary.productsWithIssues) {
    rows.push([
      product.id,
      product.name,
      product.slug,
      product.category?.name ?? '',
      getVariantSkus(product).join('|'),
      getGrossAmounts(product).join('|'),
      (product.variants ?? []).map((variant) => variant.quantityAvailable ?? '').join('|'),
      (product.dietaryTags ?? []).join('|'),
      (product.allergens ?? []).join('|'),
      issues.join('|'),
    ]);
  }

  fs.writeFileSync(filePath, rows.map((row) => row.map(csvEscape).join(',')).join('\n') + '\n');
}

function issueLabel(issue) {
  return issue.replaceAll('_', ' ');
}

function formatProductLine(product, issues = []) {
  const sku = getVariantSkus(product)[0] ?? '-';
  const category = product.category?.name ?? '-';
  const suffix = issues.length > 0 ? ` — ${issues.map(issueLabel).join(', ')}` : '';
  return `- ${product.name} (${sku}, ${category})${suffix}`;
}

function writeMarkdown(filePath, options, totalCount, products, categoryTotalCount, categories, summary, csvPath, jsonPath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  const inspected = products.length;
  const lines = [
    '# Asia Deli Go Catalog Quality Audit',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Endpoint: ${options.endpoint}`,
    `Channel: ${options.channel}`,
    `Inspected products: ${inspected}${totalCount ? ` / ${totalCount}` : ''}`,
    `Inspected categories: ${categories.length}${categoryTotalCount ? ` / ${categoryTotalCount}` : ''}`,
    `CSV detail report: ${csvPath}`,
    `JSON summary: ${jsonPath}`,
    '',
    '## Executive Summary',
    '',
    `- Products with at least one issue: ${summary.productsWithIssues.length} / ${inspected}`,
    `- Duplicate SKU values: ${summary.duplicateSkus.length}`,
    `- Duplicate slug values: ${summary.duplicateSlugs.length}`,
    `- Legacy Kamito/Kenmito mentions: ${summary.kamitoMentions.length}`,
    `- Categories with zero products: ${summary.categoryAudit.filter((category) => category.productsCount === 0).length}`,
    `- Categories missing description: ${summary.categoryAudit.filter((category) => category.missingDescription).length}`,
    `- Categories missing image: ${summary.categoryAudit.filter((category) => category.missingImage).length}`,
    '',
    '## Product Issue Counts',
    '',
  ];

  for (const [issue, count] of summary.issueCounts) {
    lines.push(`- ${issueLabel(issue)}: ${count}`);
  }

  lines.push('', '## Category Distribution', '');
  for (const category of summary.categoryAudit.sort((left, right) => right.productsCount - left.productsCount)) {
    const notes = [
      category.productsCount === 0 ? 'zero products' : null,
      category.missingDescription ? 'missing description' : null,
      category.missingImage ? 'missing image' : null,
      category.hasLegacyName ? 'legacy name' : null,
    ].filter(Boolean);
    lines.push(`- ${category.name} (${category.slug}): ${category.productsCount}${notes.length ? ` — ${notes.join(', ')}` : ''}`);
  }

  lines.push('', '## Filter Value Coverage', '');
  lines.push('### Dietary Tags');
  if (summary.dietaryTagCounts.length === 0) {
    lines.push('- No dietary tags found.');
  } else {
    for (const [tag, count] of summary.dietaryTagCounts) lines.push(`- ${tag}: ${count}`);
  }

  lines.push('', '### Storage Zones');
  if (summary.storageZoneCounts.length === 0) {
    lines.push('- No storage zones found.');
  } else {
    for (const [zone, count] of summary.storageZoneCounts) lines.push(`- ${zone}: ${count}`);
  }

  lines.push('', '### Top Allergens');
  if (summary.allergenCounts.length === 0) {
    lines.push('- No allergens found.');
  } else {
    for (const [allergen, count] of summary.allergenCounts.slice(0, 20)) lines.push(`- ${allergen}: ${count}`);
  }

  lines.push('', '### Top Countries Of Origin');
  if (summary.countryCounts.length === 0) {
    lines.push('- No countries found.');
  } else {
    for (const [country, count] of summary.countryCounts.slice(0, 20)) lines.push(`- ${country}: ${count}`);
  }

  lines.push('', '## Specific Filter Gaps', '');
  lines.push(`- Gluten-free text candidates without dietary gluten tag: ${summary.glutenCandidatesWithoutTag.length}`);
  for (const product of summary.glutenCandidatesWithoutTag.slice(0, 20)) lines.push(formatProductLine(product));
  lines.push(`- Vegetarian text candidates without vegetarian tag: ${summary.vegetarianCandidatesWithoutTag.length}`);
  for (const product of summary.vegetarianCandidatesWithoutTag.slice(0, 20)) lines.push(formatProductLine(product));

  lines.push('', '## Top Product Fix Queue', '');
  for (const { product, issues } of summary.productsWithIssues.slice(0, 80)) {
    lines.push(formatProductLine(product, issues));
  }

  lines.push('', '## Recommended Next Batch', '');
  lines.push('1. Fix critical storefront display blockers first: missing image, missing category, missing price, missing SKU, no variants.');
  lines.push('2. Normalize category assignment for oversized or ambiguous categories before adding more menu/filter UI.');
  lines.push('3. Add or backfill dietary tags for gluten-free and vegetarian only after confirming source data, because guessing food claims is risky.');
  lines.push('4. Treat country, storage zone, unit price, allergens, nutrition, and ingredients as launch polish fields; prioritize high-traffic categories first.');

  fs.writeFileSync(filePath, lines.join('\n') + '\n');
}

function writeJson(filePath, options, totalCount, products, categoryTotalCount, categories, summary) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  const payload = {
    generatedAt: new Date().toISOString(),
    endpoint: options.endpoint,
    channel: options.channel,
    inspectedProducts: products.length,
    totalProducts: totalCount,
    inspectedCategories: categories.length,
    totalCategories: categoryTotalCount,
    issueCounts: Object.fromEntries(summary.issueCounts),
    categoryCounts: Object.fromEntries(summary.categoryCounts),
    storageZoneCounts: Object.fromEntries(summary.storageZoneCounts),
    dietaryTagCounts: Object.fromEntries(summary.dietaryTagCounts),
    allergenCounts: Object.fromEntries(summary.allergenCounts),
    countryCounts: Object.fromEntries(summary.countryCounts),
    duplicateSkus: summary.duplicateSkus,
    duplicateSlugs: summary.duplicateSlugs,
    legacyMentions: summary.kamitoMentions.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      category: product.category?.name ?? null,
    })),
    glutenCandidatesWithoutTag: summary.glutenCandidatesWithoutTag.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      category: product.category?.name ?? null,
    })),
    vegetarianCandidatesWithoutTag: summary.vegetarianCandidatesWithoutTag.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      category: product.category?.name ?? null,
    })),
    categoryAudit: summary.categoryAudit,
  };

  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2) + '\n');
}

async function main() {
  const options = parseArgs();
  const [{ products, totalCount }, { categories, totalCount: categoryTotalCount }] = await Promise.all([
    fetchProducts(options),
    fetchCategories(options),
  ]);
  const summary = summarize(products, categories);

  writeCsv(options.csv, summary);
  writeJson(options.json, options, totalCount, products, categoryTotalCount, categories, summary);
  writeMarkdown(options.output, options, totalCount, products, categoryTotalCount, categories, summary, options.csv, options.json);

  console.log(`Inspected ${products.length}${totalCount ? ` / ${totalCount}` : ''} products.`);
  console.log(`Inspected ${categories.length}${categoryTotalCount ? ` / ${categoryTotalCount}` : ''} categories.`);
  console.log(`Products with issues: ${summary.productsWithIssues.length}`);
  console.log(`Duplicate SKU values: ${summary.duplicateSkus.length}`);
  console.log(`Duplicate slug values: ${summary.duplicateSlugs.length}`);
  console.log(`Wrote ${options.output}`);
  console.log(`Wrote ${options.csv}`);
  console.log(`Wrote ${options.json}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
