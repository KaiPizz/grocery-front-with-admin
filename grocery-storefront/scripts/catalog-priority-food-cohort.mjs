#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const DEFAULT_ENDPOINT = 'https://zira-ai.com/graphql/storefront';
const DEFAULT_CHANNEL = 'asiandeligo';
const DEFAULT_LIMIT = 200;
const PAGE_SIZE = 100;
const DEFAULT_MAPPING = 'docs/asiandeligo-sku-slug-source-20260708.json';
const DEFAULT_MARKDOWN = 'docs/asiandeligo-priority-food-cohort.md';
const DEFAULT_CSV = 'docs/asiandeligo-priority-food-cohort.csv';
const DEFAULT_JSON = 'docs/asiandeligo-priority-food-cohort.json';
const DEFAULT_SITE_URL = 'https://asiandeligo.eshoper.pro';
const KIMCHI_SOURCE_BASE = 'https://kimchi.pl/product-pol-';

const PRODUCTS_QUERY = `
  query PriorityFoodCohort($channel: String!, $first: Int!, $after: String) {
    products(channel: $channel, first: $first, after: $after) {
      edges {
        cursor
        node {
          id
          name
          slug
          description
          thumbnail { url alt }
          ingredients
          allergens
          mayContainAllergens
          countryOfOrigin
          pricePerUnit
          unitOfMeasure
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
          category { id name slug }
          pricing {
            priceRange { start { gross { amount currency } } }
          }
          variants {
            id
            sku
            quantityAvailable
          }
        }
      }
      pageInfo { hasNextPage endCursor }
      totalCount
    }
  }
`;

export const PRIORITY_GROUPS = [
  {
    id: 'sauces_pastes_spices',
    label: 'Sauces, pastes, and spices',
    quota: 40,
    rawSlugs: [
      'sosy-marynaty',
      'sosy-i-marynaty',
      'sosy-marynaty-oleje',
      'sos-sojowy',
      'sosy-sojowe',
      'pasty-smakowe',
      'pasty',
      'przyprawy',
      'przyprawy-jednoskładnikowe',
      'octy-i-winne-przyprawy',
      'ocet-ryżowy-do-sushi',
      'oleje',
      'oleje-sezamowe',
      'pasta-miso',
      'wasabi',
      'sezam',
      'mleczko-kokosowe',
      'buliony',
      'zupy-buliony',
      'mąki-panierki-tapioka',
      'sól',
    ],
    keywords: ['sos', 'pasta', 'przypraw', 'olej', 'ocet', 'miso', 'wasabi', 'sezam', 'bulion', 'marynat'],
  },
  {
    id: 'noodles_rice_ramen',
    label: 'Noodles, rice, and ramen',
    quota: 40,
    rawSlugs: [
      'ramyun-ramen',
      'ryż-i-inne-ziarna',
      'ryż-do-sushi-i-nie-tylko',
      'makaron-pszenny',
      'makaron-ryżowy',
      'makaron-konjac',
      'makaron-szklisty',
      'makaron-gryczany',
      'makarony',
      'kluski-tteok-do-dań',
      'duża-micha',
    ],
    keywords: ['ramen', 'ramyun', 'makaron', 'ryż', 'ryz', 'kluski', 'tteok', 'noodle'],
  },
  {
    id: 'snacks_sweets',
    label: 'Snacks and sweets',
    quota: 30,
    rawSlugs: ['słodycze-przekąski', 'słodycze-japońskie', 'japońskie-ciasto-ryżowe'],
    keywords: ['słodyc', 'slodyc', 'przekąsk', 'przekask', 'chips', 'czekolad', 'snack'],
  },
  {
    id: 'drinks_tea_coffee',
    label: 'Drinks, tea, and coffee',
    quota: 25,
    rawSlugs: ['napoje', 'herbaty', 'kawy', 'syropy'],
    keywords: ['napoj', 'herbat', 'kawa', 'syrop', 'drink', 'tea', 'coffee'],
  },
  {
    id: 'ready_meals',
    label: 'Ready meals',
    quota: 20,
    rawSlugs: ['dania-gotowe'],
    keywords: ['dania-gotowe', 'dania gotowe', 'ready meal'],
  },
  {
    id: 'kimchi_pickles',
    label: 'Kimchi and pickles',
    quota: 15,
    rawSlugs: [
      'kimchi',
      'owoce-marynowane-warzywa',
      'marynowane-warzywa-i-owoce',
      'imbir-marynowany',
    ],
    keywords: ['kimchi', 'kiszon', 'marynowan', 'pickl', 'ferment'],
  },
  {
    id: 'sushi_seaweed',
    label: 'Sushi and seaweed',
    quota: 15,
    rawSlugs: ['arkusze-nori-gim', 'papier-ryżowy', 'wakame-miyeok'],
    keywords: ['nori', 'gim', 'papier ryżowy', 'papier ryzowy', 'wakame', 'miyeok', 'algi'],
  },
  {
    id: 'mushrooms_tofu_vegetables',
    label: 'Mushrooms, tofu, and vegetables',
    quota: 15,
    rawSlugs: [
      'grzyby-shiitake',
      'inne-grzyby-azjatyckie',
      'grzyby-mun',
      'kombu-dasima',
      'tofu',
      'świeże-produkty',
    ],
    keywords: ['grzyb', 'shiitake', 'mun', 'kombu', 'dasima', 'tofu', 'śwież', 'swiez'],
  },
];

const NON_FOOD_CATEGORY_SLUGS = new Set([
  'koreańskie-kosmetyki',
  'komplety-do-sushi-i-herbaty',
  'pałeczki-i-sztućce',
  'noże',
  'patelnie-wok-grill',
  'miski',
  'parowary-bambusowe',
  'patelnie-tamago',
  'koty-szczęścia-i-inne-gadżety',
  'maty-do-zwijania',
  'foremki',
  'moździerze',
  'zaparzacze-do-kawy',
  'naczynia',
  'prezenty',
  'zestawy-do-sushi',
]);

const HIDDEN_CATEGORY_MARKERS = [
  'kategoria tymczasowa',
  'unmapped',
  'pozostałe produkty',
  'pozostale produkty',
  'temporary',
];

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

const NORMALIZED_NON_FOOD_SLUGS = new Set([...NON_FOOD_CATEGORY_SLUGS].map(normalizeText));

const NORMALIZED_GROUPS = PRIORITY_GROUPS.map((group) => ({
  ...group,
  normalizedRawSlugs: new Set(group.rawSlugs.map(normalizeText)),
  normalizedKeywords: group.keywords.map(normalizeText),
}));

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasArray(value) {
  return Array.isArray(value) && value.length > 0;
}

function hasNutrition(product) {
  if (!product?.nutritionFacts || typeof product.nutritionFacts !== 'object') return false;
  return Object.values(product.nutritionFacts)
    .some((value) => value != null && String(value).trim() !== '');
}

export function getMissingMetadataFields(product) {
  const hasAllergenEvidence = hasArray(product?.allergens) || hasArray(product?.mayContainAllergens);
  const hasUnitPrice = product?.pricePerUnit != null && hasText(product?.unitOfMeasure);

  return [
    ['ingredients', hasText(product?.ingredients)],
    ['allergenDeclaration', hasAllergenEvidence],
    ['nutrition', hasNutrition(product)],
    ['countryOfOrigin', hasText(product?.countryOfOrigin)],
    ['unitPrice', hasUnitPrice],
    ['storageZone', hasText(product?.storageZone)],
  ]
    .filter(([, present]) => !present)
    .map(([field]) => field);
}

function normalizeMeasure(quantity, unit, multiplier = 1) {
  const parsedQuantity = Number.parseFloat(String(quantity).replace(',', '.'));
  const parsedMultiplier = Number.parseInt(String(multiplier), 10);
  if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0 || !Number.isInteger(parsedMultiplier) || parsedMultiplier <= 0) {
    return null;
  }

  const normalizedUnit = unit.toLowerCase();
  if (normalizedUnit === 'kg') return { dimension: 'weight', baseAmount: parsedQuantity * parsedMultiplier * 1000, baseUnit: 'g' };
  if (normalizedUnit === 'g') return { dimension: 'weight', baseAmount: parsedQuantity * parsedMultiplier, baseUnit: 'g' };
  if (normalizedUnit === 'l') return { dimension: 'volume', baseAmount: parsedQuantity * parsedMultiplier * 1000, baseUnit: 'ml' };
  if (normalizedUnit === 'ml') return { dimension: 'volume', baseAmount: parsedQuantity * parsedMultiplier, baseUnit: 'ml' };
  return null;
}

function formatBaseAmount(amount, unit) {
  const rounded = Number(amount.toFixed(3));
  return `${rounded}${unit}`;
}

export function analyzePackageSize(name) {
  const text = String(name ?? '').replace(/\u00a0/g, ' ');
  const candidates = [];
  const coveredRanges = [];
  const multipackPattern = /(\d{1,3})\s*[x×]\s*(\d+(?:[,.]\d+)?)\s*(kg|g|ml|l)\b/giu;

  for (const match of text.matchAll(multipackPattern)) {
    const normalized = normalizeMeasure(match[2], match[3], match[1]);
    if (!normalized || match.index == null) continue;
    candidates.push({
      ...normalized,
      raw: match[0].trim(),
      kind: 'multipack',
    });
    coveredRanges.push([match.index, match.index + match[0].length]);
  }

  const plainPattern = /(\d+(?:[,.]\d+)?)\s*(kg|g|ml|l)\b/giu;
  for (const match of text.matchAll(plainPattern)) {
    if (match.index == null) continue;
    const insideMultipack = coveredRanges.some(([start, end]) => match.index >= start && match.index < end);
    if (insideMultipack) continue;
    const normalized = normalizeMeasure(match[1], match[2]);
    if (!normalized) continue;
    candidates.push({
      ...normalized,
      raw: match[0].trim(),
      kind: 'single',
    });
  }

  if (candidates.length === 0) {
    return { clear: false, label: '', reason: 'no_weight_or_volume' };
  }

  const dimensions = new Set(candidates.map((candidate) => candidate.dimension));
  if (dimensions.size !== 1) {
    return { clear: false, label: '', reason: 'mixed_weight_and_volume' };
  }

  const uniqueTotals = new Map();
  for (const candidate of candidates) {
    const key = candidate.baseAmount.toFixed(3);
    if (!uniqueTotals.has(key)) uniqueTotals.set(key, candidate);
  }

  if (uniqueTotals.size !== 1) {
    return {
      clear: false,
      label: '',
      reason: 'conflicting_package_sizes',
      candidates: candidates.map((candidate) => candidate.raw),
    };
  }

  const candidate = uniqueTotals.values().next().value;
  return {
    clear: true,
    label: formatBaseAmount(candidate.baseAmount, candidate.baseUnit),
    reason: candidate.kind === 'multipack' ? 'clear_multipack' : 'clear_single_size',
    source: candidate.raw,
  };
}

function isNonFoodCategory(category) {
  return NORMALIZED_NON_FOOD_SLUGS.has(normalizeText(category?.slug));
}

function isHiddenCategory(category) {
  const searchText = normalizeText(`${category?.slug ?? ''} ${category?.name ?? ''}`);
  return HIDDEN_CATEGORY_MARKERS.some((marker) => searchText.includes(normalizeText(marker)));
}

export function classifyPriorityGroup(category) {
  if (!category || isNonFoodCategory(category) || isHiddenCategory(category)) return null;

  const normalizedSlug = normalizeText(category.slug);
  const exact = NORMALIZED_GROUPS.find((group) => group.normalizedRawSlugs.has(normalizedSlug));
  if (exact) return exact.id;

  const searchText = normalizeText(`${category.slug ?? ''} ${category.name ?? ''}`);
  return NORMALIZED_GROUPS.find((group) => (
    group.normalizedKeywords.some((keyword) => searchText.includes(keyword))
  ))?.id ?? null;
}

export function buildScaledQuotas(limit = DEFAULT_LIMIT) {
  if (!Number.isInteger(limit) || limit < 1) throw new Error('Cohort limit must be a positive integer.');

  const totalWeight = PRIORITY_GROUPS.reduce((sum, group) => sum + group.quota, 0);
  const apportioned = PRIORITY_GROUPS.map((group, index) => {
    const exact = (limit * group.quota) / totalWeight;
    return {
      id: group.id,
      index,
      value: Math.floor(exact),
      remainder: exact - Math.floor(exact),
    };
  });

  let remaining = limit - apportioned.reduce((sum, item) => sum + item.value, 0);
  const remainderOrder = [...apportioned].sort((left, right) => (
    right.remainder - left.remainder || left.index - right.index
  ));
  for (let index = 0; remaining > 0; index += 1, remaining -= 1) {
    remainderOrder[index % remainderOrder.length].value += 1;
  }

  return Object.fromEntries(apportioned.map((item) => [item.id, item.value]));
}

function sourceFromMappingEntry(entry) {
  const legacyId = String(entry?.current_slug ?? '').match(/^KIMCHI-(\d+)$/i)?.[1] ?? null;
  if (!entry?.id || !legacyId) return null;
  return {
    productId: entry.id,
    legacyId,
    legacySku: `KIMCHI-${legacyId}`,
    sourceUrl: `${KIMCHI_SOURCE_BASE}${legacyId}.html`,
  };
}

export function buildSourceMap(entries) {
  if (!Array.isArray(entries)) throw new Error('Historical source mapping must be a JSON array.');
  const mapping = new Map();

  for (const entry of entries) {
    const source = sourceFromMappingEntry(entry);
    if (!source) continue;
    if (mapping.has(source.productId)) {
      throw new Error(`Duplicate product id in historical source mapping: ${source.productId}`);
    }
    mapping.set(source.productId, source);
  }

  return mapping;
}

function firstSku(product) {
  return (product?.variants ?? [])
    .map((variant) => variant?.sku?.trim())
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right))[0] ?? '';
}

function stockSummary(product) {
  const quantities = (product?.variants ?? [])
    .map((variant) => Number(variant?.quantityAvailable))
    .filter(Number.isFinite);
  return {
    quantities,
    display: quantities.length > 0 ? quantities.join('|') : '',
    placeholder100: quantities.length > 0 && quantities.every((quantity) => quantity === 100),
  };
}

function comparePriorityRows(left, right) {
  return right.metadataGapCount - left.metadataGapCount
    || Number(right.packageSize.clear) - Number(left.packageSize.clear)
    || left.sku.localeCompare(right.sku)
    || left.name.localeCompare(right.name, 'pl')
    || left.id.localeCompare(right.id);
}

function summarizeExclusion(product, sourceMap) {
  if (isNonFoodCategory(product?.category)) return 'nonFood';
  if (isHiddenCategory(product?.category)) return 'hiddenOrProvisional';
  if (!classifyPriorityGroup(product?.category)) return 'unclassified';
  if (!sourceMap.has(product?.id)) return 'unmappedSource';
  return null;
}

export function selectPriorityFoodCohort(products, mappingEntries, options = {}) {
  if (!Array.isArray(products)) throw new Error('Products must be an array.');
  const limit = options.limit ?? DEFAULT_LIMIT;
  const quotas = options.quotas ?? buildScaledQuotas(limit);
  const sourceMap = mappingEntries instanceof Map ? mappingEntries : buildSourceMap(mappingEntries);
  const exclusions = {
    nonFood: 0,
    hiddenOrProvisional: 0,
    unclassified: 0,
    unmappedSource: 0,
  };
  const eligible = [];

  for (const product of products) {
    const exclusion = summarizeExclusion(product, sourceMap);
    if (exclusion) {
      exclusions[exclusion] += 1;
      continue;
    }

    const groupId = classifyPriorityGroup(product.category);
    const source = sourceMap.get(product.id);
    const missingFields = getMissingMetadataFields(product);
    const packageSize = analyzePackageSize(product.name);
    const stock = stockSummary(product);
    eligible.push({
      id: product.id,
      name: product.name,
      slug: product.slug,
      sku: firstSku(product),
      categoryName: product.category?.name ?? '',
      categorySlug: product.category?.slug ?? '',
      groupId,
      source,
      missingFields,
      metadataGapCount: missingFields.length,
      packageSize,
      stock,
      thumbnailUrl: product.thumbnail?.url ?? '',
      grossPrice: product.pricing?.priceRange?.start?.gross?.amount ?? null,
      currency: product.pricing?.priceRange?.start?.gross?.currency ?? null,
    });
  }

  const buckets = new Map(PRIORITY_GROUPS.map((group) => [group.id, []]));
  for (const row of eligible) buckets.get(row.groupId)?.push(row);
  for (const rows of buckets.values()) rows.sort(comparePriorityRows);

  const selected = [];
  const selectedIds = new Set();
  for (const group of PRIORITY_GROUPS) {
    const requested = Number.isInteger(quotas[group.id]) && quotas[group.id] >= 0 ? quotas[group.id] : 0;
    for (const row of (buckets.get(group.id) ?? []).slice(0, requested)) {
      selected.push(row);
      selectedIds.add(row.id);
    }
  }

  if (selected.length < limit) {
    const remainder = eligible
      .filter((row) => !selectedIds.has(row.id))
      .sort(comparePriorityRows);
    for (const row of remainder.slice(0, limit - selected.length)) {
      selected.push(row);
      selectedIds.add(row.id);
    }
  }

  const groupOrder = new Map(PRIORITY_GROUPS.map((group, index) => [group.id, index]));
  selected.sort((left, right) => (
    groupOrder.get(left.groupId) - groupOrder.get(right.groupId)
    || comparePriorityRows(left, right)
  ));

  const groupRanks = new Map();
  const ranked = selected.map((row, index) => {
    const groupRank = (groupRanks.get(row.groupId) ?? 0) + 1;
    groupRanks.set(row.groupId, groupRank);
    return {
      ...row,
      cohortRank: index + 1,
      groupRank,
      priorityScore: row.metadataGapCount * 10 + Number(row.packageSize.clear),
    };
  });

  const groups = PRIORITY_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    requested: quotas[group.id] ?? 0,
    eligible: buckets.get(group.id)?.length ?? 0,
    selected: ranked.filter((row) => row.groupId === group.id).length,
  }));

  return {
    rows: ranked,
    eligibleCount: eligible.length,
    exclusions,
    groups,
    mappedSourceCount: products.filter((product) => sourceMap.has(product.id)).length,
  };
}

function printUsage(exitCode = 0, errorMessage = null) {
  if (errorMessage) {
    console.error(`Error: ${errorMessage}`);
    console.error('');
  }
  console.log('Usage: node scripts/catalog-priority-food-cohort.mjs [options]');
  console.log('');
  console.log('Generates a deterministic, read-only priority food cleanup cohort.');
  console.log('This is NOT a sales or bestseller ranking and never writes to the database.');
  console.log('');
  console.log('Options:');
  console.log(`  --endpoint <url>       GraphQL endpoint (default: ${DEFAULT_ENDPOINT})`);
  console.log(`  --channel <slug>       Storefront channel (default: ${DEFAULT_CHANNEL})`);
  console.log(`  --limit <n>            Cohort size (default: ${DEFAULT_LIMIT})`);
  console.log(`  --mapping <path>       Historical ADG/KIMCHI mapping (default: ${DEFAULT_MAPPING})`);
  console.log(`  --output <path>        Markdown report (default: ${DEFAULT_MARKDOWN})`);
  console.log(`  --csv <path>           CSV report (default: ${DEFAULT_CSV})`);
  console.log(`  --json <path>          JSON report (default: ${DEFAULT_JSON})`);
  console.log(`  --site-url <url>       Product-link origin (default: ${DEFAULT_SITE_URL})`);
  console.log('  --help                 Show this help message');
  process.exit(exitCode);
}

function parseArgs() {
  const options = {
    endpoint: process.env.NEXT_PUBLIC_GRAPHQL_URL || DEFAULT_ENDPOINT,
    channel: DEFAULT_CHANNEL,
    limit: DEFAULT_LIMIT,
    mapping: DEFAULT_MAPPING,
    output: DEFAULT_MARKDOWN,
    csv: DEFAULT_CSV,
    json: DEFAULT_JSON,
    siteUrl: DEFAULT_SITE_URL,
  };

  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help') printUsage(0);
    if (!arg.startsWith('--')) printUsage(1, `Unexpected argument "${arg}"`);
    const value = args[index + 1];
    if (value == null || value.startsWith('--')) printUsage(1, `Missing value for "${arg}"`);

    switch (arg.slice(2)) {
      case 'endpoint':
        options.endpoint = value;
        break;
      case 'channel':
        options.channel = value;
        break;
      case 'limit': {
        const parsed = Number.parseInt(value, 10);
        if (!Number.isInteger(parsed) || parsed < 1 || parsed > 2000) {
          printUsage(1, `Invalid --limit "${value}" (expected 1-2000)`);
        }
        options.limit = parsed;
        break;
      }
      case 'mapping':
        options.mapping = value;
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

async function requestProductsPage(endpoint, variables) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: PRODUCTS_QUERY, variables }),
  });
  const responseText = await response.text();
  let payload;
  try {
    payload = JSON.parse(responseText);
  } catch {
    throw new Error(`GraphQL returned non-JSON response with status ${response.status}.`);
  }
  if (!response.ok || payload.errors?.length) {
    const message = payload.errors?.map((error) => error.message).filter(Boolean).join(' - ');
    throw new Error(message || `GraphQL request failed with status ${response.status}`);
  }
  if (!payload.data?.products) throw new Error('GraphQL response did not contain products.');
  return payload.data.products;
}

async function fetchAllProducts(options) {
  const products = [];
  let after = null;
  let totalCount = null;

  do {
    const page = await requestProductsPage(options.endpoint, {
      channel: options.channel,
      first: PAGE_SIZE,
      after,
    });
    totalCount = page.totalCount;
    products.push(...(page.edges ?? []).map((edge) => edge.node));
    const nextCursor = page.pageInfo?.hasNextPage ? page.pageInfo?.endCursor : null;
    if (nextCursor && nextCursor === after) throw new Error('GraphQL pagination cursor did not advance.');
    after = nextCursor;
  } while (after);

  return { products, totalCount };
}

function readMapping(filePath) {
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  buildSourceMap(parsed);
  return parsed;
}

function csvEscape(value) {
  let text = value == null ? '' : String(value);
  if (/^[=+@-]/.test(text)) text = `'${text}`;
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function ensureParentDirectory(filePath) {
  fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
}

function productUrl(siteUrl, slug) {
  return slug ? `${siteUrl}/products/${slug}` : '';
}

function writeCsv(filePath, rows, options) {
  const header = [
    'cohortRank',
    'group',
    'groupRank',
    'sku',
    'productId',
    'name',
    'category',
    'metadataGapCount',
    'missingFields',
    'clearPackageSize',
    'packageSize',
    'packageSizeReason',
    'stockQuantities',
    'stockPlaceholder100',
    'legacySku',
    'sourceUrl',
    'productUrl',
  ];
  const data = rows.map((row) => [
    row.cohortRank,
    row.groupId,
    row.groupRank,
    row.sku,
    row.id,
    row.name,
    row.categorySlug,
    row.metadataGapCount,
    row.missingFields.join('|'),
    row.packageSize.clear,
    row.packageSize.label,
    row.packageSize.reason,
    row.stock.display,
    row.stock.placeholder100,
    row.source.legacySku,
    row.source.sourceUrl,
    productUrl(options.siteUrl, row.slug),
  ]);
  ensureParentDirectory(filePath);
  fs.writeFileSync(filePath, [header, ...data].map((row) => row.map(csvEscape).join(',')).join('\n') + '\n');
}

function reportPayload(options, totalCount, result, generatedAt) {
  const missingFieldCounts = {};
  for (const row of result.rows) {
    for (const field of row.missingFields) missingFieldCounts[field] = (missingFieldCounts[field] ?? 0) + 1;
  }

  return {
    generatedAt,
    endpoint: options.endpoint,
    channel: options.channel,
    disclaimer: 'Priority cleanup cohort only. This is not a sales or bestseller ranking.',
    safety: {
      databaseWrites: false,
      sqlGenerated: false,
      stockUsedForRanking: false,
      sourceMetadataRequiresLabelReview: true,
    },
    catalogTotal: totalCount,
    mappedSourceCount: result.mappedSourceCount,
    eligibleFoodProducts: result.eligibleCount,
    selectedProducts: result.rows.length,
    requestedLimit: options.limit,
    exclusions: result.exclusions,
    groups: result.groups,
    missingFieldCounts,
    products: result.rows.map((row) => ({
      cohortRank: row.cohortRank,
      group: row.groupId,
      groupRank: row.groupRank,
      priorityScore: row.priorityScore,
      id: row.id,
      sku: row.sku,
      name: row.name,
      slug: row.slug,
      category: { name: row.categoryName, slug: row.categorySlug },
      missingFields: row.missingFields,
      packageSize: row.packageSize,
      stock: row.stock,
      source: row.source,
      productUrl: productUrl(options.siteUrl, row.slug),
    })),
  };
}

function writeJson(filePath, payload) {
  ensureParentDirectory(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}

function markdownEscape(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
}

function writeMarkdown(filePath, payload, csvPath, jsonPath) {
  const lines = [
    '# Asia Deli Go Priority Food Cleanup Cohort',
    '',
    `Generated: ${payload.generatedAt}`,
    `Channel: ${payload.channel}`,
    `Endpoint: ${payload.endpoint}`,
    '',
    '> This is a deterministic cleanup-priority cohort, not a sales or bestseller ranking.',
    '> It is read-only: no database mutation or SQL apply file is produced.',
    '',
    '## Scope',
    '',
    `- Live published catalog: ${payload.catalogTotal}`,
    `- Products linked to historical ADG/KIMCHI source mapping: ${payload.mappedSourceCount}`,
    `- Eligible mapped food products: ${payload.eligibleFoodProducts}`,
    `- Selected products: ${payload.selectedProducts} / requested ${payload.requestedLimit}`,
    `- Excluded non-food products: ${payload.exclusions.nonFood}`,
    `- Excluded hidden/provisional products: ${payload.exclusions.hiddenOrProvisional}`,
    `- Excluded unclassified products: ${payload.exclusions.unclassified}`,
    `- Excluded products without source mapping: ${payload.exclusions.unmappedSource}`,
    '',
    '## Balanced quotas',
    '',
    '| Group | Requested | Eligible | Selected |',
    '| --- | ---: | ---: | ---: |',
    ...payload.groups.map((group) => `| ${group.label} | ${group.requested} | ${group.eligible} | ${group.selected} |`),
    '',
    '## Selection rules',
    '',
    '1. Use only products currently returned by the public storefront API.',
    '2. Exclude cosmetics, kitchen accessories, temporary/unmapped categories, and rows without an exact historical source mapping.',
    '3. Fill balanced category quotas; within each group prioritize more missing catalog fields, then a clear weight/volume, then SKU for deterministic ties.',
    '4. Never use stock `100`, creation date, legacy numeric order, or homepage position as a demand signal.',
    '5. The kimchi.pl URL is source traceability, not physical-package verification. All regulated label fields still require review.',
    '',
    '## Missing fields inside cohort',
    '',
    ...Object.entries(payload.missingFieldCounts)
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .map(([field, count]) => `- ${field}: ${count}`),
    '',
    '## Cohort',
    '',
    '| # | SKU | Group | Product | Category | Missing fields | Clear size | Source |',
    '| ---: | --- | --- | --- | --- | --- | --- | --- |',
    ...payload.products.map((product) => {
      const productLink = product.productUrl
        ? `[${markdownEscape(product.name)}](${product.productUrl})`
        : markdownEscape(product.name);
      const sourceLink = `[${product.source.legacySku}](${product.source.sourceUrl})`;
      return `| ${product.cohortRank} | ${markdownEscape(product.sku)} | ${markdownEscape(product.group)} | ${productLink} | ${markdownEscape(product.category.slug)} | ${markdownEscape(product.missingFields.join(', ') || 'none')} | ${markdownEscape(product.packageSize.label || 'no')} | ${sourceLink} |`;
    }),
    '',
    `CSV: ${csvPath}`,
    `JSON: ${jsonPath}`,
    '',
  ];
  ensureParentDirectory(filePath);
  fs.writeFileSync(filePath, lines.join('\n'));
}

async function main() {
  const options = parseArgs();
  const [{ products, totalCount }, mappingEntries] = await Promise.all([
    fetchAllProducts(options),
    Promise.resolve(readMapping(options.mapping)),
  ]);
  const result = selectPriorityFoodCohort(products, mappingEntries, { limit: options.limit });
  const generatedAt = new Date().toISOString();
  const payload = reportPayload(options, totalCount, result, generatedAt);

  writeCsv(options.csv, result.rows, options);
  writeJson(options.json, payload);
  writeMarkdown(options.output, payload, options.csv, options.json);

  console.log('Priority cleanup cohort only — NOT a sales or bestseller ranking.');
  console.log('Database writes: none. SQL generated: none.');
  console.log(`Inspected ${products.length}${totalCount != null ? ` / ${totalCount}` : ''} published products.`);
  console.log(`Selected ${result.rows.length} mapped food products.`);
  console.log(`Wrote ${options.output}`);
  console.log(`Wrote ${options.csv}`);
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
