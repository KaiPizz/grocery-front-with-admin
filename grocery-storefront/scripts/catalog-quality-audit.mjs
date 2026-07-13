#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const DEFAULT_ENDPOINT = 'https://zira-ai.com/graphql/storefront';
const DEFAULT_CHANNEL = 'kenmito';
const DEFAULT_SITE_URL = 'https://asiandeligo.eshoper.pro';
const PAGE_SIZE = 100;
const DEFAULT_IMAGE_CONCURRENCY = 12;

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
  console.log('  --review-csv <path>    Compact blocker/manual-review queue');
  console.log('  --json <path>          JSON summary path');
  console.log('  --variant-json <path>  Read-only DB variant export with EAN/barcode fields');
  console.log('  --manual-findings <path> Reviewed SKU-level findings to merge into the audit');
  console.log('  --check-images         Verify every unique catalog image URL over HTTP');
  console.log('  --image-concurrency <n> Concurrent image checks (default: 12)');
  console.log('  --site-url <url>       Public storefront origin used for links');
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
    reviewCsv: 'docs/catalog-quality-review-queue.csv',
    json: 'docs/catalog-quality-audit.json',
    variantJson: null,
    manualFindings: null,
    checkImages: false,
    imageConcurrency: DEFAULT_IMAGE_CONCURRENCY,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL,
  };

  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--help') printUsage(0);
    if (arg === '--all') {
      options.limit = null;
      continue;
    }
    if (arg === '--check-images') {
      options.checkImages = true;
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
      case 'review-csv':
        options.reviewCsv = value;
        break;
      case 'json':
        options.json = value;
        break;
      case 'variant-json':
        options.variantJson = value;
        break;
      case 'manual-findings':
        options.manualFindings = value;
        break;
      case 'image-concurrency': {
        const parsed = Number.parseInt(value, 10);
        if (!Number.isInteger(parsed) || parsed < 1 || parsed > 50) {
          printUsage(1, `Invalid --image-concurrency "${value}"`);
        }
        options.imageConcurrency = parsed;
        break;
      }
      case 'site-url':
        options.siteUrl = value.replace(/\/$/, '');
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

function loadVariantRows(filePath) {
  if (!filePath) return [];

  const resolvedPath = path.resolve(process.cwd(), filePath);
  const payload = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
  if (!Array.isArray(payload)) {
    throw new Error(`Variant audit input must be a JSON array: ${resolvedPath}`);
  }

  return payload;
}

function getProductImageUrls(product, siteUrl) {
  const candidates = [
    product.thumbnail?.url,
    ...(product.media ?? [])
      .filter((media) => {
        const mediaType = normalizeText(media.type).toLowerCase();
        return !mediaType || mediaType.includes('image');
      })
      .map((media) => media.url),
  ];
  const urls = new Set();

  for (const candidate of candidates) {
    const value = normalizeText(candidate);
    if (!value) continue;

    try {
      urls.add(new URL(value, siteUrl).toString());
    } catch {
      urls.add(value);
    }
  }

  return [...urls];
}

async function requestImage(url, method) {
  const response = await fetch(url, {
    method,
    redirect: 'follow',
    headers: {
      'User-Agent': 'AsiaDeliGo-Catalog-Audit/1.0',
      ...(method === 'GET' ? { Range: 'bytes=0-1023' } : {}),
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (method === 'GET') {
    await response.body?.cancel();
  }

  return response;
}

async function checkImageUrl(url) {
  try {
    let response = await requestImage(url, 'HEAD');
    if (!response.ok && [403, 405, 501].includes(response.status)) {
      response = await requestImage(url, 'GET');
    }

    return {
      ok: response.ok,
      status: response.status,
      contentType: response.headers.get('content-type'),
      finalUrl: response.url,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      contentType: null,
      finalUrl: url,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function verifyImageUrls(products, options) {
  if (!options.checkImages) return new Map();

  const urls = [...new Set(products.flatMap((product) => getProductImageUrls(product, options.siteUrl)))];
  const results = new Map();
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < urls.length) {
      const url = urls[nextIndex];
      nextIndex += 1;
      results.set(url, await checkImageUrl(url));
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(options.imageConcurrency, urls.length) }, () => worker()),
  );

  return results;
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

const SKU_PATTERN = /^ADG-\d{6}$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UNICODE_SLUG_PATTERN = /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u;
const GTIN_LENGTHS = new Set([8, 12, 13, 14]);
const LEGACY_BRAND_MARKERS = ['kamito', 'kenmito'];
const MANUAL_FINDING_ISSUES = new Set([
  'verified_image_identity_mismatch',
  'possible_physical_duplicate',
]);

export function loadManualFindings(filePath) {
  if (!filePath) return [];

  const payload = JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf8'));
  const findings = Array.isArray(payload) ? payload : payload.findings;
  if (!Array.isArray(findings)) {
    throw new Error(`Manual findings file must contain an array: ${filePath}`);
  }

  const seen = new Set();
  return findings.map((finding, index) => {
    const sku = normalizeText(finding?.sku).toUpperCase();
    const issue = normalizeText(finding?.issue);
    const key = `${sku}:${issue}`;

    if (!SKU_PATTERN.test(sku)) {
      throw new Error(`Invalid manual finding SKU at row ${index + 1}: ${sku || '(empty)'}`);
    }
    if (!MANUAL_FINDING_ISSUES.has(issue)) {
      throw new Error(`Unsupported manual finding issue at row ${index + 1}: ${issue || '(empty)'}`);
    }
    if (seen.has(key)) {
      throw new Error(`Duplicate manual finding: ${key}`);
    }
    seen.add(key);

    return {
      sku,
      issue,
      note: normalizeText(finding?.note),
    };
  });
}

function indexManualFindings(products, findings) {
  const productsBySku = new Map();
  for (const product of products) {
    for (const sku of getVariantSkus(product)) {
      if (!productsBySku.has(sku)) productsBySku.set(sku, []);
      productsBySku.get(sku).push(product.id);
    }
  }

  const issuesBySku = new Map();
  for (const finding of findings) {
    const matches = productsBySku.get(finding.sku) ?? [];
    if (matches.length !== 1) {
      throw new Error(`Manual finding ${finding.sku} matched ${matches.length} catalog products; expected exactly one`);
    }
    if (!issuesBySku.has(finding.sku)) issuesBySku.set(finding.sku, []);
    issuesBySku.get(finding.sku).push(finding.issue);
  }

  return issuesBySku;
}

function normalizeLookup(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeGtin(value) {
  return normalizeText(value).replace(/[\s-]+/g, '');
}

export function isValidGtin(value) {
  const gtin = normalizeGtin(value);
  if (!GTIN_LENGTHS.has(gtin.length) || !/^\d+$/.test(gtin)) return false;

  const digits = [...gtin].map(Number);
  const checkDigit = digits.pop();
  const sum = digits
    .reverse()
    .reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);

  return (10 - (sum % 10)) % 10 === checkDigit;
}

function getVariantIdentifier(row) {
  const ean = normalizeText(row?.ean);
  const barcode = normalizeText(row?.barcode);
  const productEan = normalizeText(row?.ean_standard);

  if (ean) return { value: ean, source: 'ean' };
  if (barcode) return { value: barcode, source: 'barcode' };
  if (productEan) return { value: productEan, source: 'product_ean_standard' };
  return null;
}

function hasLegacyBrandMarker(value) {
  return includesAny(value, LEGACY_BRAND_MARKERS);
}

function hasLegacyMediaMarker(value) {
  const normalized = normalizeText(value);
  return hasLegacyBrandMarker(normalized)
    || /\/products\/(?:kimchi|kamito|kenmito)-\d+/i.test(normalized)
    || /(?:^|\.)kimchi\.pl$/i.test((() => {
      try {
        return new URL(normalized).hostname;
      } catch {
        return '';
      }
    })());
}

function hasImageAlt(product) {
  if (hasText(product.thumbnail?.url) && hasText(product.thumbnail?.alt)) return true;
  return (product.media ?? []).some((media) => hasText(media.url) && hasText(media.alt));
}

function hasDietaryTag(product, expectedTags) {
  return (product.dietaryTags ?? [])
    .map(normalizeLookup)
    .some((tag) => expectedTags.some((expected) => tag.includes(expected)));
}

function hasExplicitAllergen(product, terms) {
  const allergens = [
    ...(product.allergens ?? []),
    ...(product.mayContainAllergens ?? []),
  ].map(normalizeLookup).join(' ');

  return terms.some((term) => allergens.includes(term));
}

function hasIngredientCandidate(product, patterns) {
  const text = normalizeLookup(product.ingredients);
  return patterns.some((pattern) => pattern.test(text));
}

const ANIMAL_INGREDIENT_PATTERNS = [
  /(?:^|[^\p{L}])beef(?:$|[^\p{L}])/u,
  /(?:^|[^\p{L}])pork(?:$|[^\p{L}])/u,
  /(?:^|[^\p{L}])chicken(?:$|[^\p{L}])/u,
  /(?:^|[^\p{L}])duck(?:$|[^\p{L}])/u,
  /(?:^|[^\p{L}])fish(?:$|[^\p{L}])/u,
  /(?:^|[^\p{L}])shrimp(?:$|[^\p{L}])/u,
  /(?:^|[^\p{L}])prawn(?:$|[^\p{L}])/u,
  /(?:^|[^\p{L}])squid(?:$|[^\p{L}])/u,
  /(?:^|[^\p{L}])octopus(?:$|[^\p{L}])/u,
  /(?:^|[^\p{L}])tuna(?:$|[^\p{L}])/u,
  /(?:^|[^\p{L}])salmon(?:$|[^\p{L}])/u,
  /(?:^|[^\p{L}])meat(?:$|[^\p{L}])/u,
  /(?:^|[^\p{L}])wołow\p{L}*/u,
  /(?:^|[^\p{L}])wolow\p{L}*/u,
  /(?:^|[^\p{L}])wieprz\p{L}*/u,
  /(?:^|[^\p{L}])kurcz\p{L}*/u,
  /(?:^|[^\p{L}])kacz\p{L}*/u,
  // The previous bare `ryb` substring also matched ryboflawina and
  // rybonukleotyd, incorrectly flagging nine vegetarian products.
  /(?:^|[^\p{L}])ryb(?!oflaw|onukleot)\p{L}*/u,
  /(?:^|[^\p{L}])krewet\p{L}*/u,
  /(?:^|[^\p{L}])kalm\p{L}*/u,
  /(?:^|[^\p{L}])tuńczy\p{L}*/u,
  /(?:^|[^\p{L}])tunczy\p{L}*/u,
  /(?:^|[^\p{L}])łososi\p{L}*/u,
  /(?:^|[^\p{L}])lososi\p{L}*/u,
];

const VEGAN_INGREDIENT_PATTERNS = [
  ...ANIMAL_INGREDIENT_PATTERNS,
  /(?:^|[^\p{L}])eggs?(?:$|[^\p{L}])/u,
  /(?:^|[^\p{L}])honey(?:$|[^\p{L}])/u,
  /(?:^|[^\p{L}])jaj\p{L}*/u,
  /(?:^|[^\p{L}])miód\p{L}*/u,
  /(?:^|[^\p{L}])miod\p{L}*/u,
  /(?:^|[^\p{L}])serwat\p{L}*/u,
  /(?:^|[^\p{L}])whey(?:$|[^\p{L}])/u,
  /(?:^|[^\p{L}])gelatin\p{L}*/u,
  /(?:^|[^\p{L}])żelatyn\p{L}*/u,
  /(?:^|[^\p{L}])zelatyn\p{L}*/u,
];

export function findDietaryIngredientConflicts(ingredients) {
  const product = { ingredients };
  return {
    animal: hasIngredientCandidate(product, ANIMAL_INGREDIENT_PATTERNS),
    vegan: hasIngredientCandidate(product, VEGAN_INGREDIENT_PATTERNS),
  };
}

function getImageAudit(product, options, imageResults) {
  const urls = getProductImageUrls(product, options.siteUrl);
  const checked = urls.map((url) => imageResults.get(url)).filter(Boolean);
  const failed = checked.filter((result) => !result.ok);

  return {
    urls,
    failed,
    allFailed: options.checkImages && urls.length > 0 && checked.length === urls.length && failed.length === checked.length,
  };
}

export function getIssueSeverity(issue) {
  const blockerIssues = new Set([
    'missing_image',
    'no_loadable_image',
    'missing_sku',
    'duplicate_sku',
    'invalid_sku_format',
    'missing_slug',
    'duplicate_slug',
    'invalid_slug_format',
    'missing_price',
    'missing_stock',
    'negative_stock',
    'missing_category',
    'no_variants',
    'verified_image_identity_mismatch',
  ]);
  const reviewIssues = new Set([
    'broken_image_url',
    'invalid_ean',
    'duplicate_ean',
    'out_of_stock',
    'gluten_free_allergen_conflict',
    'vegetarian_ingredient_conflict_candidate',
    'vegan_ingredient_conflict_candidate',
    'possible_physical_duplicate',
  ]);
  const backlogIssues = new Set([
    'legacy_image_key',
    'missing_ean',
    'missing_allergens',
    'missing_ingredients',
    'missing_nutrition',
    'missing_country',
    'missing_storage_zone',
    'missing_unit_price',
  ]);

  if (blockerIssues.has(issue)) return 'blocker';
  if (reviewIssues.has(issue)) return 'review';
  if (backlogIssues.has(issue)) return 'backlog';
  return 'polish';
}

function getHighestSeverity(issues) {
  if (issues.some((issue) => getIssueSeverity(issue) === 'blocker')) return 'blocker';
  if (issues.some((issue) => getIssueSeverity(issue) === 'review')) return 'review';
  if (issues.some((issue) => getIssueSeverity(issue) === 'backlog')) return 'backlog';
  return issues.length > 0 ? 'polish' : 'clean';
}

function normalizeCategoryForComparison(value) {
  return normalizeLookup(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replaceAll('ł', 'l')
    .replace(/(^|-)i(-|$)/g, '-')
    .replace(/[^a-z0-9]+/g, '-');
}

function levenshteinDistance(left, right) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[right.length];
}

function findCategoryOverlapCandidates(categories) {
  const candidates = [];

  for (let leftIndex = 0; leftIndex < categories.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < categories.length; rightIndex += 1) {
      const left = categories[leftIndex];
      const right = categories[rightIndex];
      const leftKey = normalizeCategoryForComparison(left.slug || left.name);
      const rightKey = normalizeCategoryForComparison(right.slug || right.name);
      const maxLength = Math.max(leftKey.length, rightKey.length);
      if (maxLength < 5) continue;

      const similarity = 1 - (levenshteinDistance(leftKey, rightKey) / maxLength);
      if (similarity < 0.78) continue;

      candidates.push({
        left: { name: left.name, slug: left.slug, productsCount: left.products?.totalCount ?? 0 },
        right: { name: right.name, slug: right.slug, productsCount: right.products?.totalCount ?? 0 },
        similarity: Number(similarity.toFixed(2)),
      });
    }
  }

  return candidates.sort((left, right) => right.similarity - left.similarity);
}

function getIssues(product, context) {
  const {
    duplicateSkus,
    duplicateSlugs,
    duplicateEans,
    variantRowsByProduct,
    imageResults,
    options,
    manualIssuesBySku,
  } = context;
  const skus = getVariantSkus(product);
  const variantRows = variantRowsByProduct.get(product.id) ?? [];
  const identifiers = variantRows.map(getVariantIdentifier).filter(Boolean);
  const imageAudit = getImageAudit(product, options, imageResults);
  const stockValues = (product.variants ?? [])
    .map((variant) => variant.quantityAvailable)
    .filter((value) => value != null)
    .map(Number);
  const currencies = new Set([
    product.pricing?.priceRange?.start?.gross?.currency,
    ...(product.variants ?? []).map((variant) => variant.pricing?.price?.gross?.currency),
  ].map(normalizeText).filter(Boolean));
  const hasEnglishName = hasText(product.translation?.name);
  const hasEnglishDescription = hasText(product.translation?.description)
    || hasText(product.translation?.shortDescription);
  const glutenFree = hasDietaryTag(product, ['gluten-free', 'gluten free', 'bezgluten']);
  const vegetarian = hasDietaryTag(product, ['vegetarian', 'wegetaria', 'vege']);
  const vegan = hasDietaryTag(product, ['vegan', 'wegan']);
  const issueChecks = {
    missing_image: !hasProductImage(product),
    missing_image_alt: hasProductImage(product) && !hasImageAlt(product),
    broken_image_url: imageAudit.failed.length > 0,
    no_loadable_image: imageAudit.allFailed,
    legacy_image_key: imageAudit.urls.some(hasLegacyMediaMarker),
    missing_sku: skus.length === 0,
    duplicate_sku: skus.some((sku) => duplicateSkus.has(sku)),
    invalid_sku_format: skus.some((sku) => !SKU_PATTERN.test(sku)),
    legacy_sku: skus.some((sku) => /^(?:kimchi|kamito|kenmito)[-_]/i.test(sku)),
    missing_slug: !hasText(product.slug),
    duplicate_slug: duplicateSlugs.has(normalizeLookup(product.slug)),
    invalid_slug_format: hasText(product.slug) && !SLUG_PATTERN.test(product.slug),
    slug_too_long: normalizeText(product.slug).length > 120,
    slug_contains_sku: /(?:^|-)adg-?\d{6}(?:-|$)/i.test(normalizeText(product.slug)),
    legacy_slug: hasLegacyBrandMarker(product.slug),
    missing_price: !hasPositivePrice(product),
    inconsistent_currency: currencies.size > 1,
    missing_stock: !hasStockValue(product),
    negative_stock: stockValues.some((value) => value < 0),
    out_of_stock: isOutOfStock(product),
    missing_category: !hasText(product.category?.slug),
    invalid_category_slug: hasText(product.category?.slug) && !UNICODE_SLUG_PATTERN.test(product.category.slug),
    non_ascii_category_slug: hasText(product.category?.slug) && !SLUG_PATTERN.test(product.category.slug),
    missing_description: !hasText(product.description),
    missing_ingredients: !hasText(product.ingredients),
    missing_allergens: !hasArray(product.allergens),
    missing_nutrition: !hasNutritionFacts(product),
    missing_country: !hasText(product.countryOfOrigin),
    missing_storage_zone: !hasText(product.storageZone),
    missing_unit_price: product.pricePerUnit == null || !hasText(product.unitOfMeasure),
    missing_english_translation: !hasEnglishName,
    missing_english_description: !hasEnglishDescription,
    untranslated_english_name_candidate: hasEnglishName
      && normalizeLookup(product.translation.name) === normalizeLookup(product.name),
    missing_ean: options.variantJson && variantRows.length > 0 && identifiers.length === 0,
    invalid_ean: identifiers.some(({ value }) => !isValidGtin(value)),
    duplicate_ean: identifiers.some(({ value }) => duplicateEans.has(normalizeGtin(value))),
    ean_in_fallback_field: identifiers.some(({ source }) => source !== 'ean'),
    gluten_free_allergen_conflict: glutenFree
      && hasExplicitAllergen(product, ['gluten', 'wheat', 'pszen', 'jęcz', 'jecz', 'rye', 'żyto', 'zyto']),
    vegetarian_ingredient_conflict_candidate: vegetarian
      && hasIngredientCandidate(product, ANIMAL_INGREDIENT_PATTERNS),
    vegan_ingredient_conflict_candidate: vegan
      && hasIngredientCandidate(product, VEGAN_INGREDIENT_PATTERNS),
    no_variants: (product.variants ?? []).length === 0,
  };

  const automaticIssues = Object.entries(issueChecks)
    .filter(([, hasIssue]) => hasIssue)
    .map(([issue]) => issue);
  const manualIssues = skus.flatMap((sku) => manualIssuesBySku.get(sku) ?? []);

  return [...new Set([...automaticIssues, ...manualIssues])];
}

function summarize(products, categories, options, variantRows, imageResults, manualFindings) {
  const duplicateSkus = getDuplicateMap(products.flatMap(getVariantSkus));
  const duplicateSlugs = getDuplicateMap(products.map((product) => normalizeLookup(product.slug)));
  const duplicateNames = getDuplicateMap(products.map((product) => normalizeLookup(product.name)));
  const variantRowsByProduct = new Map();
  const identifiers = [];

  for (const row of variantRows) {
    const productId = normalizeText(row.product_id);
    if (!variantRowsByProduct.has(productId)) variantRowsByProduct.set(productId, []);
    variantRowsByProduct.get(productId).push(row);

    const identifier = getVariantIdentifier(row);
    if (identifier) identifiers.push({ ...identifier, row });
  }

  const duplicateEans = getDuplicateMap(identifiers.map(({ value }) => normalizeGtin(value)));
  const issueCounts = new Map();
  const severityCounts = new Map();
  const categoryCounts = new Map();
  const storageZoneCounts = new Map();
  const dietaryTagCounts = new Map();
  const allergenCounts = new Map();
  const countryCounts = new Map();
  const stockValueCounts = new Map();
  const imageDomainCounts = new Map();
  const imageProductsByUrl = new Map();
  const productsWithIssues = [];
  const kamitoMentions = [];
  const glutenCandidatesWithoutTag = [];
  const vegetarianCandidatesWithoutTag = [];
  let productsWithStock100 = 0;
  let productsWithAnyEan = 0;

  const issueContext = {
    duplicateSkus,
    duplicateSlugs,
    duplicateEans,
    variantRowsByProduct,
    imageResults,
    options,
    manualIssuesBySku: indexManualFindings(products, manualFindings),
  };

  for (const product of products) {
    const issues = getIssues(product, issueContext);
    const severity = getHighestSeverity(issues);
    for (const issue of issues) pushCount(issueCounts, issue);
    pushCount(severityCounts, severity);
    if (issues.length > 0) productsWithIssues.push({ product, issues, severity });

    pushCount(categoryCounts, product.category?.name ?? product.category?.slug);
    if (hasText(product.storageZone)) pushCount(storageZoneCounts, product.storageZone);
    for (const tag of product.dietaryTags ?? []) pushCount(dietaryTagCounts, tag);
    for (const allergen of product.allergens ?? []) pushCount(allergenCounts, allergen);
    if (hasText(product.countryOfOrigin)) pushCount(countryCounts, product.countryOfOrigin);

    const stockValues = (product.variants ?? []).map((variant) => Number(variant.quantityAvailable));
    if (stockValues.length > 0 && stockValues.every((value) => value === 100)) productsWithStock100 += 1;
    for (const stockValue of stockValues) pushCount(stockValueCounts, String(stockValue));

    const productIdentifiers = (variantRowsByProduct.get(product.id) ?? [])
      .map(getVariantIdentifier)
      .filter(Boolean);
    if (productIdentifiers.length > 0) productsWithAnyEan += 1;

    for (const imageUrl of getProductImageUrls(product, options.siteUrl)) {
      try {
        pushCount(imageDomainCounts, new URL(imageUrl).hostname);
      } catch {
        pushCount(imageDomainCounts, '(invalid URL)');
      }

      if (!imageProductsByUrl.has(imageUrl)) imageProductsByUrl.set(imageUrl, new Set());
      imageProductsByUrl.get(imageUrl).add(product.id);
    }

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

  productsWithIssues.sort((left, right) => {
    const priority = { blocker: 0, review: 1, backlog: 2, polish: 3, clean: 4 };
    if (priority[left.severity] !== priority[right.severity]) {
      return priority[left.severity] - priority[right.severity];
    }
    if (right.issues.length !== left.issues.length) return right.issues.length - left.issues.length;
    return left.product.name.localeCompare(right.product.name);
  });

  const oversizedThreshold = Math.max(150, Math.ceil(products.length * 0.15));
  const duplicateCategorySlugs = getDuplicateMap(categories.map((category) => normalizeLookup(category.slug)));
  const categoryOverlapCandidates = findCategoryOverlapCandidates(categories);

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
    invalidSlug: hasText(category.slug) && !UNICODE_SLUG_PATTERN.test(category.slug),
    nonAsciiSlug: hasText(category.slug) && !SLUG_PATTERN.test(category.slug),
    duplicateSlug: duplicateCategorySlugs.has(normalizeLookup(category.slug)),
    oversized: (category.products?.totalCount ?? 0) > oversizedThreshold,
    provisional: includesAny(`${category.name} ${category.slug}`, ['tymczas', 'unmapped', 'uncategor', 'pozostałe produkty']),
  }));

  const duplicateImageUrls = [...imageProductsByUrl.entries()]
    .filter(([, productIds]) => productIds.size > 1)
    .map(([url, productIds]) => ({ url, productCount: productIds.size }))
    .sort((left, right) => right.productCount - left.productCount);
  const brokenImageUrls = [...imageResults.entries()]
    .filter(([, result]) => !result.ok)
    .map(([url, result]) => ({ url, ...result }));
  const validIdentifiers = identifiers.filter(({ value }) => isValidGtin(value));
  const duplicateNameGroups = [...duplicateNames.keys()].map((normalizedName) => ({
    normalizedName,
    products: products
      .filter((product) => normalizeLookup(product.name) === normalizedName)
      .map((product) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        skus: getVariantSkus(product),
      })),
  }));

  return {
    duplicateSkus: [...duplicateSkus.entries()].sort(),
    duplicateSlugs: [...duplicateSlugs.entries()].sort(),
    issueCounts: sortCountMap(issueCounts),
    severityCounts: sortCountMap(severityCounts),
    categoryCounts: sortCountMap(categoryCounts),
    storageZoneCounts: sortCountMap(storageZoneCounts),
    dietaryTagCounts: sortCountMap(dietaryTagCounts),
    allergenCounts: sortCountMap(allergenCounts),
    countryCounts: sortCountMap(countryCounts),
    stockValueCounts: sortCountMap(stockValueCounts),
    imageDomainCounts: sortCountMap(imageDomainCounts),
    duplicateNames: [...duplicateNames.entries()].sort(),
    duplicateNameGroups,
    duplicateEans: [...duplicateEans.entries()].sort(),
    duplicateImageUrls,
    brokenImageUrls,
    productsWithIssues,
    kamitoMentions,
    glutenCandidatesWithoutTag,
    vegetarianCandidatesWithoutTag,
    categoryAudit,
    categoryOverlapCandidates,
    categoryStructure: {
      total: categories.length,
      rootCategories: categories.filter((category) => Number(category.level ?? 0) === 0).length,
      categoriesWithChildren: categories.filter((category) => (category.children?.edges?.length ?? 0) > 0).length,
      provisionalCategories: categoryAudit.filter((category) => category.provisional).length,
      provisionalProducts: categoryAudit
        .filter((category) => category.provisional)
        .reduce((total, category) => total + category.productsCount, 0),
    },
    productsWithStock100,
    variantAudit: {
      available: Boolean(options.variantJson),
      rows: variantRows.length,
      productsWithAnyEan,
      productsMissingEan: options.variantJson ? products.length - productsWithAnyEan : null,
      identifiers: identifiers.length,
      validIdentifiers: validIdentifiers.length,
      invalidIdentifiers: identifiers.length - validIdentifiers.length,
      eanFieldCount: identifiers.filter(({ source }) => source === 'ean').length,
      fallbackFieldCount: identifiers.filter(({ source }) => source !== 'ean').length,
    },
    imageAudit: {
      enabled: options.checkImages,
      checkedUrls: imageResults.size,
      brokenUrls: brokenImageUrls.length,
    },
    variantRowsByProduct,
    imageResults,
    manualFindings,
  };
}

function csvEscape(value) {
  const stringValue = value == null ? '' : String(value);
  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replaceAll('"', '""')}"`;
  }
  return stringValue;
}

function writeCsv(filePath, options, summary) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const rows = [
    [
      'id',
      'name',
      'slug',
      'product_url',
      'category',
      'skus',
      'eans',
      'ean_sources',
      'price_amounts',
      'stock_values',
      'image_urls',
      'broken_image_urls',
      'dietary_tags',
      'allergens',
      'english_name',
      'english_description',
      'severity',
      'issues',
    ],
  ];

  for (const { product, issues, severity } of summary.productsWithIssues) {
    const identifiers = (summary.variantRowsByProduct.get(product.id) ?? [])
      .map(getVariantIdentifier)
      .filter(Boolean);
    const imageUrls = getProductImageUrls(product, options.siteUrl);
    const brokenImageUrls = imageUrls.filter((url) => summary.imageResults.get(url)?.ok === false);

    rows.push([
      product.id,
      product.name,
      product.slug,
      `${options.siteUrl}/products/${encodeURIComponent(product.slug)}`,
      product.category?.name ?? '',
      getVariantSkus(product).join('|'),
      identifiers.map(({ value }) => value).join('|'),
      identifiers.map(({ source }) => source).join('|'),
      getGrossAmounts(product).join('|'),
      (product.variants ?? []).map((variant) => variant.quantityAvailable ?? '').join('|'),
      imageUrls.join('|'),
      brokenImageUrls.join('|'),
      (product.dietaryTags ?? []).join('|'),
      (product.allergens ?? []).join('|'),
      product.translation?.name ?? '',
      product.translation?.description ?? product.translation?.shortDescription ?? '',
      severity,
      issues.join('|'),
    ]);
  }

  fs.writeFileSync(filePath, rows.map((row) => row.map(csvEscape).join(',')).join('\n') + '\n');
}

function writeReviewCsv(filePath, options, summary) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const rows = [[
    'severity',
    'sku',
    'name',
    'product_url',
    'category',
    'stock_values',
    'dietary_tags',
    'allergens',
    'issues',
  ]];

  for (const { product, issues, severity } of summary.productsWithIssues) {
    if (!['blocker', 'review'].includes(severity)) continue;

    rows.push([
      severity,
      getVariantSkus(product).join('|'),
      product.name,
      `${options.siteUrl}/products/${encodeURIComponent(product.slug)}`,
      product.category?.name ?? '',
      (product.variants ?? []).map((variant) => variant.quantityAvailable ?? '').join('|'),
      (product.dietaryTags ?? []).join('|'),
      (product.allergens ?? []).join('|'),
      issues.filter((issue) => ['blocker', 'review'].includes(getIssueSeverity(issue))).join('|'),
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

function writeMarkdown(filePath, options, totalCount, products, categoryTotalCount, categories, summary, csvPath, reviewCsvPath, jsonPath) {
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
    `CSV blocker/review queue: ${reviewCsvPath}`,
    `JSON summary: ${jsonPath}`,
    `Manual findings: ${options.manualFindings ?? 'none'}`,
    '',
    '## Executive Summary',
    '',
    `- Products with at least one issue: ${summary.productsWithIssues.length} / ${inspected}`,
    `- Blocker products: ${summary.severityCounts.find(([severity]) => severity === 'blocker')?.[1] ?? 0}`,
    `- Products requiring data review: ${summary.severityCounts.find(([severity]) => severity === 'review')?.[1] ?? 0}`,
    `- Products in metadata backlog: ${summary.severityCounts.find(([severity]) => severity === 'backlog')?.[1] ?? 0}`,
    `- Polish-only products: ${summary.severityCounts.find(([severity]) => severity === 'polish')?.[1] ?? 0}`,
    `- Duplicate SKU values: ${summary.duplicateSkus.length}`,
    `- Duplicate slug values: ${summary.duplicateSlugs.length}`,
    `- Normalized product-name collisions: ${summary.duplicateNames.length}`,
    `- Verified image/product identity mismatches: ${summary.manualFindings.filter((finding) => finding.issue === 'verified_image_identity_mismatch').length}`,
    `- Possible physical duplicate rows: ${summary.manualFindings.filter((finding) => finding.issue === 'possible_physical_duplicate').length}`,
    `- Legacy Kamito/Kenmito mentions: ${summary.kamitoMentions.length}`,
    `- Products whose active variants all have stock exactly 100: ${summary.productsWithStock100}`,
    `- Products with an EAN/GTIN candidate: ${summary.variantAudit.available ? `${summary.variantAudit.productsWithAnyEan} / ${inspected}` : 'not checked (no --variant-json)'}`,
    `- Valid EAN/GTIN candidates: ${summary.variantAudit.available ? `${summary.variantAudit.validIdentifiers} / ${summary.variantAudit.identifiers}` : 'not checked'}`,
    `- Unique image URLs checked: ${summary.imageAudit.enabled ? summary.imageAudit.checkedUrls : 'not checked'}`,
    `- Broken image URLs: ${summary.imageAudit.enabled ? summary.imageAudit.brokenUrls : 'not checked'}`,
    `- Image URLs reused by multiple products: ${summary.duplicateImageUrls.length}`,
    `- Image URLs still using legacy KIMCHI-* object keys: ${summary.issueCounts.find(([issue]) => issue === 'legacy_image_key')?.[1] ?? 0}`,
    `- Categories with zero products: ${summary.categoryAudit.filter((category) => category.productsCount === 0).length}`,
    `- Categories missing description: ${summary.categoryAudit.filter((category) => category.missingDescription).length}`,
    `- Categories missing image: ${summary.categoryAudit.filter((category) => category.missingImage).length}`,
    `- Oversized categories: ${summary.categoryAudit.filter((category) => category.oversized).length}`,
    `- Provisional/unmapped categories: ${summary.categoryStructure.provisionalCategories} (${summary.categoryStructure.provisionalProducts} products)`,
    `- Similar category-name pairs requiring merge review: ${summary.categoryOverlapCandidates.length}`,
    '',
    '## Launch Gates',
    '',
    `- Product/catalog blockers: ${summary.severityCounts.find(([severity]) => severity === 'blocker')?.[1] ?? 0}`,
    '- A verified image/product identity mismatch is a launch blocker until the row is corrected or unpublished.',
    `- Safety claim conflicts requiring human confirmation: ${(summary.issueCounts.find(([issue]) => issue === 'gluten_free_allergen_conflict')?.[1] ?? 0) + (summary.issueCounts.find(([issue]) => issue === 'vegetarian_ingredient_conflict_candidate')?.[1] ?? 0) + (summary.issueCounts.find(([issue]) => issue === 'vegan_ingredient_conflict_candidate')?.[1] ?? 0)}`,
    '- Missing EAN does not block the storefront UI, but it blocks reliable scanner/POS receiving and should remain a separate owner/supplier data project.',
    '- Stock value 100 is treated as a known temporary placeholder, not verified physical inventory.',
    '- All checked product images are served from the owned img.zira.pl domain; legacy KIMCHI-* appears only inside object paths.',
    '- Empty allergen/dietary fields are treated as unverified, never auto-filled from product names.',
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
      category.invalidSlug ? 'invalid slug' : null,
      category.nonAsciiSlug ? 'non-ASCII slug (SEO polish)' : null,
      category.duplicateSlug ? 'duplicate slug' : null,
      category.oversized ? 'oversized' : null,
      category.provisional ? 'provisional/unmapped' : null,
    ].filter(Boolean);
    lines.push(`- ${category.name} (${category.slug}): ${category.productsCount}${notes.length ? ` — ${notes.join(', ')}` : ''}`);
  }

  lines.push('', '### Taxonomy Structure', '');
  lines.push(`- Categories: ${summary.categoryStructure.total}`);
  lines.push(`- Root-level categories: ${summary.categoryStructure.rootCategories}`);
  lines.push(`- Categories with children: ${summary.categoryStructure.categoriesWithChildren}`);
  lines.push(`- Provisional/unmapped categories: ${summary.categoryStructure.provisionalCategories} (${summary.categoryStructure.provisionalProducts} products)`);
  lines.push('- A flat 72-category filter is functional but needs consolidation before it is considered launch-clean.');
  lines.push('', '### Similar Category Merge Candidates');
  if (summary.categoryOverlapCandidates.length === 0) {
    lines.push('- No high-similarity category pairs found.');
  } else {
    for (const candidate of summary.categoryOverlapCandidates) {
      lines.push(`- ${candidate.left.name} (${candidate.left.productsCount}) ↔ ${candidate.right.name} (${candidate.right.productsCount}), similarity ${candidate.similarity}`);
    }
  }

  lines.push('', '## Product Name Collision Review', '');
  if (summary.duplicateNameGroups.length === 0) {
    lines.push('- No normalized product-name collisions.');
  } else {
    lines.push('- A matching name is a review signal, not proof that two catalog rows are the same physical product.');
    for (const group of summary.duplicateNameGroups) {
      lines.push(`- ${group.products[0]?.name ?? group.normalizedName}`);
      for (const product of group.products) {
        lines.push(`  - ${product.skus.join('|') || '-'}: ${options.siteUrl}/products/${encodeURIComponent(product.slug)}`);
      }
    }
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

  lines.push('', '### Stock Values');
  for (const [stockValue, count] of summary.stockValueCounts) lines.push(`- ${stockValue}: ${count}`);

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

  lines.push('', '## EAN / GTIN Audit', '');
  if (!summary.variantAudit.available) {
    lines.push('- Not checked. Supply `--variant-json` from the read-only tenant-scoped DB export.');
  } else {
    lines.push(`- Active variant rows matched: ${summary.variantAudit.rows}`);
    lines.push(`- Products with an identifier: ${summary.variantAudit.productsWithAnyEan} / ${inspected}`);
    lines.push(`- Products missing an identifier: ${summary.variantAudit.productsMissingEan}`);
    lines.push(`- Valid checksums: ${summary.variantAudit.validIdentifiers}`);
    lines.push(`- Invalid checksums/formats: ${summary.variantAudit.invalidIdentifiers}`);
    lines.push(`- Values in product_variants.ean: ${summary.variantAudit.eanFieldCount}`);
    lines.push(`- Values found only in fallback barcode/product fields: ${summary.variantAudit.fallbackFieldCount}`);
    lines.push(`- Duplicate normalized identifiers: ${summary.duplicateEans.length}`);
  }

  lines.push('', '## Image Audit', '');
  if (!summary.imageAudit.enabled) {
    lines.push('- HTTP availability was not checked. Re-run with `--check-images`.');
  } else {
    lines.push(`- Unique URLs checked: ${summary.imageAudit.checkedUrls}`);
    lines.push(`- Broken URLs: ${summary.imageAudit.brokenUrls}`);
    for (const image of summary.brokenImageUrls.slice(0, 30)) {
      lines.push(`- ${image.status ?? 'network error'}: ${image.url}`);
    }
  }

  lines.push('', '### Image Source Domains');
  for (const [domain, count] of summary.imageDomainCounts) lines.push(`- ${domain}: ${count}`);

  lines.push('', '### Most Reused Image URLs');
  if (summary.duplicateImageUrls.length === 0) {
    lines.push('- No image URL is shared by multiple products.');
  } else {
    for (const image of summary.duplicateImageUrls.slice(0, 30)) {
      lines.push(`- ${image.productCount} products: ${image.url}`);
    }
  }

  lines.push('', '## Specific Filter Gaps', '');
  lines.push(`- Gluten-free text candidates without dietary gluten tag: ${summary.glutenCandidatesWithoutTag.length}`);
  for (const product of summary.glutenCandidatesWithoutTag.slice(0, 20)) lines.push(formatProductLine(product));
  lines.push(`- Vegetarian text candidates without vegetarian tag: ${summary.vegetarianCandidatesWithoutTag.length}`);
  for (const product of summary.vegetarianCandidatesWithoutTag.slice(0, 20)) lines.push(formatProductLine(product));

  lines.push('', '## Top Product Fix Queue', '');
  for (const { product, issues, severity } of summary.productsWithIssues.slice(0, 100)) {
    lines.push(`${formatProductLine(product, issues)} [${severity}]`);
  }

  lines.push('', '## Recommended Next Batch', '');
  lines.push('1. Fix blocker rows first: image availability, SKU/slug, price, stock field, category and variant structure.');
  lines.push('2. Send explicit gluten-free/vegetarian/vegan conflict candidates for human confirmation; never infer food safety claims automatically.');
  lines.push('3. Build EAN collection around supplier labels or owner photos; online lookup may suggest candidates but must not be accepted without barcode verification.');
  lines.push('4. Replace temporary stock 100 with POS/physical inventory only when the owner is ready; do not treat it as audited inventory.');
  lines.push('5. Backfill English descriptions and high-value food metadata after launch blockers are closed.');

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
    severityCounts: Object.fromEntries(summary.severityCounts),
    categoryCounts: Object.fromEntries(summary.categoryCounts),
    storageZoneCounts: Object.fromEntries(summary.storageZoneCounts),
    dietaryTagCounts: Object.fromEntries(summary.dietaryTagCounts),
    allergenCounts: Object.fromEntries(summary.allergenCounts),
    countryCounts: Object.fromEntries(summary.countryCounts),
    stockValueCounts: Object.fromEntries(summary.stockValueCounts),
    imageDomainCounts: Object.fromEntries(summary.imageDomainCounts),
    productsWithStock100: summary.productsWithStock100,
    manualFindingsFile: options.manualFindings,
    manualFindings: summary.manualFindings,
    variantAudit: summary.variantAudit,
    imageAudit: summary.imageAudit,
    duplicateSkus: summary.duplicateSkus,
    duplicateSlugs: summary.duplicateSlugs,
    duplicateNames: summary.duplicateNames,
    duplicateNameGroups: summary.duplicateNameGroups,
    duplicateEans: summary.duplicateEans,
    duplicateImageUrls: summary.duplicateImageUrls,
    brokenImageUrls: summary.brokenImageUrls,
    productsWithIssues: summary.productsWithIssues.map(({ product, issues, severity }) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      category: product.category?.name ?? null,
      skus: getVariantSkus(product),
      severity,
      issues,
    })),
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
    categoryStructure: summary.categoryStructure,
    categoryOverlapCandidates: summary.categoryOverlapCandidates,
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
  const variantRows = loadVariantRows(options.variantJson);
  const manualFindings = loadManualFindings(options.manualFindings);
  const imageResults = await verifyImageUrls(products, options);
  const summary = summarize(products, categories, options, variantRows, imageResults, manualFindings);

  writeCsv(options.csv, options, summary);
  writeReviewCsv(options.reviewCsv, options, summary);
  writeJson(options.json, options, totalCount, products, categoryTotalCount, categories, summary);
  writeMarkdown(options.output, options, totalCount, products, categoryTotalCount, categories, summary, options.csv, options.reviewCsv, options.json);

  console.log(`Inspected ${products.length}${totalCount ? ` / ${totalCount}` : ''} products.`);
  console.log(`Inspected ${categories.length}${categoryTotalCount ? ` / ${categoryTotalCount}` : ''} categories.`);
  console.log(`Products with issues: ${summary.productsWithIssues.length}`);
  console.log(`Duplicate SKU values: ${summary.duplicateSkus.length}`);
  console.log(`Duplicate slug values: ${summary.duplicateSlugs.length}`);
  if (summary.variantAudit.available) {
    console.log(`Products with EAN/GTIN candidate: ${summary.variantAudit.productsWithAnyEan}/${products.length}`);
  }
  if (summary.imageAudit.enabled) {
    console.log(`Broken image URLs: ${summary.imageAudit.brokenUrls}/${summary.imageAudit.checkedUrls}`);
  }
  console.log(`Wrote ${options.output}`);
  console.log(`Wrote ${options.csv}`);
  console.log(`Wrote ${options.reviewCsv}`);
  console.log(`Wrote ${options.json}`);
}

const isDirectExecution = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectExecution) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
