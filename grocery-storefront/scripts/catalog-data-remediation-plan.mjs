#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { isDeepStrictEqual } from 'node:util';

const DEFAULT_INPUT = 'docs/asiandeligo-catalog-data-decisions-20260721.json';
const DEFAULT_OUTPUT = 'docs/asiandeligo-catalog-data-remediation-20260721.md';
const DEFAULT_APPLY = 'docs/asiandeligo-catalog-data-remediation-apply-20260721.sql';
const DEFAULT_ROLLBACK = 'docs/asiandeligo-catalog-data-remediation-rollback-20260721.sql';

const EXPECTED_BATCH = 'asiandeligo-catalog-data-fix-20260721-v1';
const EXPECTED_SALON_ID = 'e73271a9-53e3-4a20-a02e-791726b452aa';
const PRODUCT_BACKUP_TABLE = 'asiandeligo_catalog_data_product_backup_20260721';
const AUDIT_TABLE = 'asiandeligo_catalog_data_audit_20260721';

const EXPECTED_IDENTITIES = new Map([
  ['ADG-000404', {
    productId: '66852048-369d-4dc3-9b32-07d1bc68df24',
    variantId: '851bbd63-66a5-4ddc-92c9-27f461dbb556',
    expectedUpdatedAt: '2026-07-08T12:12:07.93723Z',
    sourceCategoryId: '8c4c679a-f5e8-427c-b734-1b20eb12a97b',
    targetCategoryId: '8c4c679a-f5e8-427c-b734-1b20eb12a97b',
    changedFields: ['allergens'],
  }],
  ['ADG-000702', {
    productId: '83a6fbe5-3152-4a0c-9a89-8a1c00decfd5',
    variantId: '935a36fc-900a-4047-b262-6ee23c2fb7f1',
    expectedUpdatedAt: '2026-07-08T12:12:07.93723Z',
    sourceCategoryId: 'd7442ca6-6767-46e4-9e12-ff8d0f824d89',
    targetCategoryId: 'd7442ca6-6767-46e4-9e12-ff8d0f824d89',
    changedFields: ['allergens', 'nutritionFacts', 'storageZone'],
  }],
  ['ADG-001014', {
    productId: 'f530e430-4d1d-42d4-a1d3-d33d90b0a395',
    variantId: '6f1272e3-05c0-4df9-be94-ee15c8cc2291',
    expectedUpdatedAt: '2026-07-09T12:38:27.209063Z',
    sourceCategoryId: '43098ab7-106a-47f1-b91b-aa497c1c62db',
    targetCategoryId: '5825ea08-e9d9-4786-aaad-05c4dde1131e',
    changedFields: ['category', 'nutritionFacts'],
  }],
  ['ADG-001382', {
    productId: '7f821fb2-729b-411d-aa9a-f34886fea0ec',
    variantId: 'b9ff2de6-0788-4336-b756-846afff9fc8a',
    expectedUpdatedAt: '2026-07-08T12:12:07.93723Z',
    sourceCategoryId: '5825ea08-e9d9-4786-aaad-05c4dde1131e',
    targetCategoryId: '5825ea08-e9d9-4786-aaad-05c4dde1131e',
    changedFields: ['pricePerUnit'],
  }],
  ['ADG-001383', {
    productId: 'adcd2bb3-9284-4ac4-9766-2d39c319ad86',
    variantId: 'a4516e39-1a7b-466d-8c29-4cd5ac1b0269',
    expectedUpdatedAt: '2026-07-08T12:12:07.93723Z',
    sourceCategoryId: '5825ea08-e9d9-4786-aaad-05c4dde1131e',
    targetCategoryId: '5825ea08-e9d9-4786-aaad-05c4dde1131e',
    changedFields: ['pricePerUnit'],
  }],
  ['ADG-001750', {
    productId: 'afb16814-879c-48ce-aa7e-d444740c35ad',
    variantId: 'd5f36da0-410e-4c16-8519-0e6b13ee754c',
    expectedUpdatedAt: '2026-07-08T12:12:07.93723Z',
    sourceCategoryId: '7da30509-aad0-475e-ab39-ca7764bffda2',
    targetCategoryId: '691e2a51-4453-4fd9-bd02-f9abdf9a0def',
    changedFields: ['category'],
  }],
]);

const EXPECTED_PRODUCT_STATUS = {
  isActive: true,
  isPublished: true,
  isVisible: true,
  status: 'active',
  deletedAt: null,
};
const EXPECTED_VARIANT_STATUS = {
  isActive: true,
  isPublished: false,
  isForSale: true,
  syncStatus: 'synced',
  availabilityStatus: 'IN_STOCK',
  deletedAt: null,
};
const EXPECTED_CATEGORIES = new Map([
  ['8c4c679a-f5e8-427c-b734-1b20eb12a97b', {
    id: '8c4c679a-f5e8-427c-b734-1b20eb12a97b', name: 'Kimchi', slug: 'kimchi', isActive: true,
  }],
  ['d7442ca6-6767-46e4-9e12-ff8d0f824d89', {
    id: 'd7442ca6-6767-46e4-9e12-ff8d0f824d89', name: 'Tofu', slug: 'tofu', isActive: true,
  }],
  ['43098ab7-106a-47f1-b91b-aa497c1c62db', {
    id: '43098ab7-106a-47f1-b91b-aa497c1c62db', name: 'Dania gotowe', slug: 'dania-gotowe', isActive: true,
  }],
  ['5825ea08-e9d9-4786-aaad-05c4dde1131e', {
    id: '5825ea08-e9d9-4786-aaad-05c4dde1131e',
    name: 'Słodycze / Przekąski',
    slug: 'słodycze-przekąski',
    isActive: true,
  }],
  ['7da30509-aad0-475e-ab39-ca7764bffda2', {
    id: '7da30509-aad0-475e-ab39-ca7764bffda2',
    name: 'Ramyun / Ramen',
    slug: 'ramyun-ramen',
    isActive: true,
  }],
  ['691e2a51-4453-4fd9-bd02-f9abdf9a0def', {
    id: '691e2a51-4453-4fd9-bd02-f9abdf9a0def',
    name: 'Sosy, marynaty',
    slug: 'sosy-marynaty',
    isActive: true,
  }],
]);
const EXPECTED_CHANGED_VALUES = new Map([
  ['ADG-000404', {
    allergens: { expected: ['cereals'], target: ['cereals', 'fish'] },
  }],
  ['ADG-000702', {
    allergens: { expected: [], target: ['cereals', 'soybeans'] },
    storageZone: { expected: null, target: 'AMBIENT' },
    nutritionFacts: {
      expected: null,
      target: {
        calories: 263,
        fat: 13.2,
        saturatedFat: 2.45,
        carbs: 29.5,
        sugar: 27.9,
        protein: 8.3,
        salt: 1.48,
        servingSize: 'w 100g/100ml',
      },
    },
  }],
  ['ADG-001014', {
    nutritionFacts: {
      expected: {
        fat: 0.5,
        salt: 6.6,
        carbs: 52,
        sugar: 26,
        protein: 23,
        calories: 610,
        servingSize: 'w 100g/100ml',
      },
      target: {
        calories: 347,
        fat: 2.1,
        saturatedFat: 0.5,
        carbs: 57,
        sugar: 30,
        protein: 24,
        salt: 5,
        servingSize: 'w 100g/100ml',
      },
    },
    category: {
      expected: EXPECTED_CATEGORIES.get('43098ab7-106a-47f1-b91b-aa497c1c62db'),
      target: EXPECTED_CATEGORIES.get('5825ea08-e9d9-4786-aaad-05c4dde1131e'),
    },
  }],
  ['ADG-001382', {
    pricePerUnit: { expected: '623.75', target: '311.88' },
  }],
  ['ADG-001383', {
    pricePerUnit: { expected: '886.25', target: '443.13' },
  }],
  ['ADG-001750', {
    category: {
      expected: EXPECTED_CATEGORIES.get('7da30509-aad0-475e-ab39-ca7764bffda2'),
      target: EXPECTED_CATEGORIES.get('691e2a51-4453-4fd9-bd02-f9abdf9a0def'),
    },
  }],
]);
const SNAPSHOT_FIELDS = [
  'allergens',
  'storageZone',
  'nutritionFacts',
  'pricePerUnit',
  'unitOfMeasure',
  'category',
];

function parseArgs() {
  const options = {
    input: DEFAULT_INPUT,
    output: DEFAULT_OUTPUT,
    apply: DEFAULT_APPLY,
    rollback: DEFAULT_ROLLBACK,
  };
  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (!['--input', '--output', '--apply', '--rollback'].includes(flag) || !value) {
      throw new Error(`Invalid argument near ${flag ?? '(end)'}`);
    }
    options[flag.slice(2)] = value;
  }
  return options;
}

function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlNullableText(value) {
  return value === null ? 'NULL::text' : `${sqlLiteral(value)}::text`;
}

function sqlNullableTimestamp(value) {
  return value === null ? 'NULL::timestamptz' : `${sqlLiteral(value)}::timestamptz`;
}

function sqlNullableJson(value) {
  return value === null ? 'NULL::jsonb' : `${sqlLiteral(JSON.stringify(value))}::jsonb`;
}

function sqlNullableNumeric(value) {
  return value === null ? 'NULL::numeric' : `${sqlLiteral(value)}::numeric`;
}

function sqlBoolean(value) {
  return value ? 'TRUE' : 'FALSE';
}

function assertUnique(items, key, label) {
  const seen = new Set();
  for (const item of items) {
    const value = item[key];
    if (!value || seen.has(value)) {
      throw new Error(`${label} must contain unique non-empty ${key} values`);
    }
    seen.add(value);
  }
}

function assertSnapshotShape(snapshot, label) {
  if (!snapshot || !isDeepStrictEqual(Object.keys(snapshot).sort(), [...SNAPSHOT_FIELDS].sort())) {
    throw new Error(`${label} must be a full exact field snapshot`);
  }
  if (!Array.isArray(snapshot.allergens)) {
    throw new Error(`${label}.allergens must be an array`);
  }
  if (
    typeof snapshot.pricePerUnit !== 'string'
    || !/^-?\d+(?:\.\d+)?$/.test(snapshot.pricePerUnit)
  ) {
    throw new Error(`${label}.pricePerUnit must be an exact decimal string`);
  }
  const categoryKeys = ['id', 'isActive', 'name', 'slug'];
  if (!snapshot.category || !isDeepStrictEqual(Object.keys(snapshot.category).sort(), categoryKeys.sort())) {
    throw new Error(`${label}.category must be a full exact category identity`);
  }
}

function validate(decisions) {
  if (decisions.version !== 1 || decisions.channel !== 'asiandeligo') {
    throw new Error('Unsupported catalog-data decision file or channel');
  }
  if (decisions.batch !== EXPECTED_BATCH || decisions.salonId !== EXPECTED_SALON_ID) {
    throw new Error('Unexpected catalog-data batch or tenant');
  }
  if (!Number.isFinite(Date.parse(decisions.preparedAt))) {
    throw new Error('preparedAt must be an ISO timestamp');
  }
  if (decisions.products?.length !== EXPECTED_IDENTITIES.size) {
    throw new Error(`Expected exactly ${EXPECTED_IDENTITIES.size} catalog-data decisions`);
  }
  assertUnique(decisions.products, 'sku', 'products');
  assertUnique(decisions.products, 'productId', 'products');
  assertUnique(decisions.products, 'variantId', 'products');

  for (const row of decisions.products) {
    const identity = EXPECTED_IDENTITIES.get(row.sku);
    if (!identity) {
      throw new Error(`Unexpected SKU in catalog-data scope: ${row.sku}`);
    }
    for (const key of ['productId', 'variantId', 'expectedUpdatedAt']) {
      if (row[key] !== identity[key]) {
        throw new Error(`Unexpected ${key} for ${row.sku}`);
      }
    }
    if (!row.name || !row.slug || row.confidence !== 'high' || !row.reason) {
      throw new Error(`Incomplete reviewed decision for ${row.sku}`);
    }
    if (!isDeepStrictEqual(row.status?.product, EXPECTED_PRODUCT_STATUS)) {
      throw new Error(`Unexpected product status snapshot for ${row.sku}`);
    }
    if (!isDeepStrictEqual(row.status?.variant, EXPECTED_VARIANT_STATUS)) {
      throw new Error(`Unexpected variant status snapshot for ${row.sku}`);
    }
    assertSnapshotShape(row.expected, `${row.sku}.expected`);
    assertSnapshotShape(row.target, `${row.sku}.target`);
    if (
      row.expected.category.id !== identity.sourceCategoryId
      || row.target.category.id !== identity.targetCategoryId
    ) {
      throw new Error(`Unexpected category identity for ${row.sku}`);
    }
    if (
      !isDeepStrictEqual(row.expected.category, EXPECTED_CATEGORIES.get(identity.sourceCategoryId))
      || !isDeepStrictEqual(row.target.category, EXPECTED_CATEGORIES.get(identity.targetCategoryId))
    ) {
      throw new Error(`Unexpected exact category snapshot for ${row.sku}`);
    }
    const changedFields = SNAPSHOT_FIELDS
      .filter((field) => !isDeepStrictEqual(row.expected[field], row.target[field]))
      .sort();
    if (!isDeepStrictEqual(changedFields, [...identity.changedFields].sort())) {
      throw new Error(`Unexpected changed field set for ${row.sku}: ${changedFields.join(', ')}`);
    }
    const expectedChangedValues = EXPECTED_CHANGED_VALUES.get(row.sku);
    for (const field of identity.changedFields) {
      if (
        !isDeepStrictEqual(row.expected[field], expectedChangedValues[field].expected)
        || !isDeepStrictEqual(row.target[field], expectedChangedValues[field].target)
      ) {
        throw new Error(`Unexpected exact ${field} transition for ${row.sku}`);
      }
    }
    if (
      !Array.isArray(row.evidence)
      || row.evidence.length < 2
      || row.evidence.some((item) => (
        !item
        || typeof item.url !== 'string'
        || !item.url.startsWith('https://')
        || !item.kind
        || !item.supports
      ))
    ) {
      throw new Error(`${row.sku} requires at least two complete HTTPS evidence entries`);
    }
  }

  for (const sku of EXPECTED_IDENTITIES.keys()) {
    if (!decisions.products.some((row) => row.sku === sku)) {
      throw new Error(`Missing required catalog-data SKU ${sku}`);
    }
  }
}

function renderDecisionValues(decisions) {
  return decisions.products.map((row) => {
    const productStatus = row.status.product;
    const variantStatus = row.status.variant;
    return [
      '  (',
      `    ${sqlLiteral(row.sku)}, ${sqlLiteral(row.productId)}::uuid, ${sqlLiteral(row.variantId)}::uuid,`,
      `    ${sqlLiteral(row.name)}, ${sqlLiteral(row.slug)}, ${sqlLiteral(row.expectedUpdatedAt)}::timestamptz,`,
      `    ${sqlBoolean(productStatus.isActive)}, ${sqlBoolean(productStatus.isPublished)}, ${sqlBoolean(productStatus.isVisible)}, ${sqlLiteral(productStatus.status)}, ${sqlNullableTimestamp(productStatus.deletedAt)},`,
      `    ${sqlBoolean(variantStatus.isActive)}, ${sqlBoolean(variantStatus.isPublished)}, ${sqlBoolean(variantStatus.isForSale)}, ${sqlLiteral(variantStatus.syncStatus)}, ${sqlLiteral(variantStatus.availabilityStatus)}, ${sqlNullableTimestamp(variantStatus.deletedAt)},`,
      `    ${sqlNullableJson(row.expected.allergens)}, ${sqlNullableJson(row.target.allergens)},`,
      `    ${sqlNullableText(row.expected.storageZone)}, ${sqlNullableText(row.target.storageZone)},`,
      `    ${sqlNullableJson(row.expected.nutritionFacts)}, ${sqlNullableJson(row.target.nutritionFacts)},`,
      `    ${sqlNullableNumeric(row.expected.pricePerUnit)}, ${sqlNullableNumeric(row.target.pricePerUnit)},`,
      `    ${sqlNullableText(row.expected.unitOfMeasure)}, ${sqlNullableText(row.target.unitOfMeasure)},`,
      `    ${sqlLiteral(row.expected.category.id)}::uuid, ${sqlLiteral(row.expected.category.name)}, ${sqlLiteral(row.expected.category.slug)}, ${sqlBoolean(row.expected.category.isActive)},`,
      `    ${sqlLiteral(row.target.category.id)}::uuid, ${sqlLiteral(row.target.category.name)}, ${sqlLiteral(row.target.category.slug)}, ${sqlBoolean(row.target.category.isActive)},`,
      `    ${sqlLiteral(row.confidence)}, ${sqlLiteral(row.reason)}, ${sqlLiteral(JSON.stringify(row.evidence))}::jsonb`,
      '  )',
    ].join('\n');
  }).join(',\n');
}

function renderPreamble(decisions, decisionSha, action) {
  return `-- Generated by scripts/catalog-data-remediation-plan.mjs
-- Purpose: ${action} the exact-six Asia Deli Go catalog-data remediation.
-- Batch: ${decisions.batch}
-- Decision SHA-256: ${decisionSha}
-- Only products rows are mutated. Variants and categories are read-only identity/status guards.
--
-- JOIN contract (schema-introspect verified against production 2026-07-21):
--   product_variants.template_id (uuid) = products.id (uuid), FK declared.
--   products.category_id (uuid) = categories.id (uuid), FK declared.
--   channels.salon_id/products.salon_id/product_variants.salon_id/categories.salon_id are uuid.
-- Assumptions:
--   1. Every business-table join is scoped by the one active asiandeligo channel and pinned salon UUID.
--   2. Exact product/variant statuses and soft-delete states match the reviewed decision snapshots.
--   3. products/product_variants/categories/channels are canonical; the dated backup/audit tables are intentional recovery artifacts.
-- Production trigger zz_enforce_products_monotonic_updated_at advances updated_at on every products UPDATE.

\\set ON_ERROR_STOP on
BEGIN;
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';
SET LOCAL search_path = public, pg_catalog;

CREATE TEMP TABLE _adg_catalog_data_target_salon (salon_id uuid PRIMARY KEY) ON COMMIT DROP;
INSERT INTO _adg_catalog_data_target_salon (salon_id)
SELECT salon_id
FROM channels
WHERE salon_id = ${sqlLiteral(decisions.salonId)}::uuid
  AND slug = ${sqlLiteral(decisions.channel)}
  AND is_active = TRUE;

CREATE TEMP TABLE _adg_catalog_data_run (
  batch_key text PRIMARY KEY,
  decision_sha256 text NOT NULL,
  channel_slug text NOT NULL,
  salon_id uuid NOT NULL UNIQUE,
  recorded_at timestamptz NOT NULL
) ON COMMIT DROP;
INSERT INTO _adg_catalog_data_run (
  batch_key, decision_sha256, channel_slug, salon_id, recorded_at
)
SELECT ${sqlLiteral(decisions.batch)}, ${sqlLiteral(decisionSha)}, ${sqlLiteral(decisions.channel)},
       salon_id, transaction_timestamp()
FROM _adg_catalog_data_target_salon;

CREATE TEMP TABLE _adg_catalog_data_decisions (
  sku text PRIMARY KEY,
  product_id uuid NOT NULL UNIQUE,
  variant_id uuid NOT NULL UNIQUE,
  product_name text NOT NULL,
  product_slug text NOT NULL,
  expected_updated_at timestamptz NOT NULL,
  expected_product_is_active boolean NOT NULL,
  expected_product_is_published boolean NOT NULL,
  expected_product_is_visible boolean NOT NULL,
  expected_product_status text NOT NULL,
  expected_product_deleted_at timestamptz,
  expected_variant_is_active boolean NOT NULL,
  expected_variant_is_published boolean NOT NULL,
  expected_variant_is_for_sale boolean NOT NULL,
  expected_variant_sync_status text NOT NULL,
  expected_variant_availability_status text NOT NULL,
  expected_variant_deleted_at timestamptz,
  expected_allergens jsonb,
  target_allergens jsonb,
  expected_storage_zone text,
  target_storage_zone text,
  expected_nutrition_facts jsonb,
  target_nutrition_facts jsonb,
  expected_price_per_unit numeric,
  target_price_per_unit numeric,
  expected_unit_of_measure text,
  target_unit_of_measure text,
  expected_category_id uuid NOT NULL,
  expected_category_name text NOT NULL,
  expected_category_slug text NOT NULL,
  expected_category_is_active boolean NOT NULL,
  target_category_id uuid NOT NULL,
  target_category_name text NOT NULL,
  target_category_slug text NOT NULL,
  target_category_is_active boolean NOT NULL,
  confidence text NOT NULL CHECK (confidence = 'high'),
  reason text NOT NULL,
  evidence_urls jsonb NOT NULL CHECK (jsonb_typeof(evidence_urls) = 'array')
) ON COMMIT DROP;
INSERT INTO _adg_catalog_data_decisions (
  sku, product_id, variant_id, product_name, product_slug, expected_updated_at,
  expected_product_is_active, expected_product_is_published, expected_product_is_visible,
  expected_product_status, expected_product_deleted_at,
  expected_variant_is_active, expected_variant_is_published, expected_variant_is_for_sale,
  expected_variant_sync_status, expected_variant_availability_status, expected_variant_deleted_at,
  expected_allergens, target_allergens, expected_storage_zone, target_storage_zone,
  expected_nutrition_facts, target_nutrition_facts,
  expected_price_per_unit, target_price_per_unit,
  expected_unit_of_measure, target_unit_of_measure,
  expected_category_id, expected_category_name, expected_category_slug, expected_category_is_active,
  target_category_id, target_category_name, target_category_slug, target_category_is_active,
  confidence, reason, evidence_urls
) VALUES
${renderDecisionValues(decisions)};
`;
}

function renderExactPreconditions(decisions) {
  return `DO $$
BEGIN
  IF (SELECT COUNT(*) FROM _adg_catalog_data_target_salon) <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one active pinned Asia Deli Go channel';
  END IF;
  IF (SELECT COUNT(*) FROM _adg_catalog_data_run) <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one tenant-scoped catalog-data run';
  END IF;
  IF (SELECT COUNT(*) FROM _adg_catalog_data_decisions) <> ${decisions.products.length} THEN
    RAISE EXCEPTION 'Expected exactly ${decisions.products.length} catalog-data decisions';
  END IF;

  IF EXISTS (
    SELECT decision.sku
    FROM _adg_catalog_data_decisions decision
    CROSS JOIN _adg_catalog_data_target_salon tenant
    LEFT JOIN product_variants variant
      ON variant.salon_id = tenant.salon_id
     AND variant.id = decision.variant_id
     AND variant.template_id = decision.product_id
     AND variant.sku = decision.sku
     AND variant.is_active = decision.expected_variant_is_active
     AND variant.is_published = decision.expected_variant_is_published
     AND variant.is_for_sale = decision.expected_variant_is_for_sale
     AND variant.sync_status = decision.expected_variant_sync_status
     AND variant.availability_status = decision.expected_variant_availability_status
     AND variant.deleted_at IS NOT DISTINCT FROM decision.expected_variant_deleted_at
    LEFT JOIN products product
      ON product.salon_id = tenant.salon_id
     AND product.id = decision.product_id
     AND product.id = variant.template_id
     AND product.name = decision.product_name
     AND product.slug = decision.product_slug
     AND product.updated_at = decision.expected_updated_at
     AND product.is_active = decision.expected_product_is_active
     AND product.is_published = decision.expected_product_is_published
     AND product.is_visible = decision.expected_product_is_visible
     AND product.status = decision.expected_product_status
     AND product.deleted_at IS NOT DISTINCT FROM decision.expected_product_deleted_at
     AND product.allergens IS NOT DISTINCT FROM decision.expected_allergens
     AND product.storage_zone IS NOT DISTINCT FROM decision.expected_storage_zone
     AND product.nutrition_facts IS NOT DISTINCT FROM decision.expected_nutrition_facts
     AND product.price_per_unit IS NOT DISTINCT FROM decision.expected_price_per_unit
     AND product.unit_of_measure IS NOT DISTINCT FROM decision.expected_unit_of_measure
     AND product.category_id = decision.expected_category_id
    LEFT JOIN categories source_category
      ON source_category.salon_id = tenant.salon_id
     AND source_category.id = decision.expected_category_id
     AND source_category.name = decision.expected_category_name
     AND source_category.slug = decision.expected_category_slug
     AND source_category.is_active = decision.expected_category_is_active
    LEFT JOIN categories target_category
      ON target_category.salon_id = tenant.salon_id
     AND target_category.id = decision.target_category_id
     AND target_category.name = decision.target_category_name
     AND target_category.slug = decision.target_category_slug
     AND target_category.is_active = decision.target_category_is_active
    WHERE variant.id IS NULL
       OR product.id IS NULL
       OR source_category.id IS NULL
       OR target_category.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Exact product, variant, category, status, timestamp, or old-state precondition failed';
  END IF;
END $$;
`;
}

function renderApplySql(decisions, decisionSha) {
  return `${renderPreamble(decisions, decisionSha, 'apply')}
${renderExactPreconditions(decisions)}

CREATE TABLE ${PRODUCT_BACKUP_TABLE} (
  batch_key text NOT NULL CHECK (batch_key = ${sqlLiteral(decisions.batch)}),
  decision_sha256 text NOT NULL CHECK (decision_sha256 = ${sqlLiteral(decisionSha)}),
  channel_slug text NOT NULL CHECK (channel_slug = 'asiandeligo'),
  salon_id uuid NOT NULL CHECK (salon_id = ${sqlLiteral(decisions.salonId)}::uuid),
  captured_at timestamptz NOT NULL,
  product_id uuid NOT NULL,
  variant_id uuid NOT NULL,
  sku text NOT NULL,
  product_name text NOT NULL,
  product_slug text NOT NULL,
  original_updated_at timestamptz NOT NULL,
  applied_updated_at timestamptz,
  original_product_is_active boolean NOT NULL,
  original_product_is_published boolean NOT NULL,
  original_product_is_visible boolean NOT NULL,
  original_product_status text NOT NULL,
  original_product_deleted_at timestamptz,
  original_variant_is_active boolean NOT NULL,
  original_variant_is_published boolean NOT NULL,
  original_variant_is_for_sale boolean NOT NULL,
  original_variant_sync_status text NOT NULL,
  original_variant_availability_status text NOT NULL,
  original_variant_deleted_at timestamptz,
  original_allergens jsonb,
  target_allergens jsonb,
  original_storage_zone text,
  target_storage_zone text,
  original_nutrition_facts jsonb,
  target_nutrition_facts jsonb,
  original_price_per_unit numeric,
  target_price_per_unit numeric,
  original_unit_of_measure text,
  target_unit_of_measure text,
  original_category_id uuid NOT NULL,
  original_category_name text NOT NULL,
  original_category_slug text NOT NULL,
  original_category_is_active boolean NOT NULL,
  target_category_id uuid NOT NULL,
  target_category_name text NOT NULL,
  target_category_slug text NOT NULL,
  target_category_is_active boolean NOT NULL,
  confidence text NOT NULL CHECK (confidence = 'high'),
  reason text NOT NULL,
  evidence_urls jsonb NOT NULL CHECK (jsonb_typeof(evidence_urls) = 'array'),
  CHECK (applied_updated_at IS NULL OR applied_updated_at > original_updated_at),
  PRIMARY KEY (batch_key, salon_id, product_id),
  UNIQUE (batch_key, salon_id, variant_id),
  UNIQUE (batch_key, salon_id, sku)
);

CREATE TABLE ${AUDIT_TABLE} (
  batch_key text NOT NULL CHECK (batch_key = ${sqlLiteral(decisions.batch)}),
  decision_sha256 text NOT NULL CHECK (decision_sha256 = ${sqlLiteral(decisionSha)}),
  channel_slug text NOT NULL CHECK (channel_slug = 'asiandeligo'),
  salon_id uuid NOT NULL CHECK (salon_id = ${sqlLiteral(decisions.salonId)}::uuid),
  recorded_at timestamptz NOT NULL,
  action text NOT NULL CHECK (action IN ('backup_captured', 'apply_complete', 'rollback_complete')),
  product_rows integer NOT NULL CHECK (product_rows = ${decisions.products.length}),
  PRIMARY KEY (batch_key, salon_id, action)
);

DO $$
DECLARE
  affected integer;
BEGIN
  PERFORM product.id
  FROM _adg_catalog_data_decisions decision
  CROSS JOIN _adg_catalog_data_target_salon tenant
  JOIN products product
    ON product.salon_id = tenant.salon_id
   AND product.id = decision.product_id
   AND product.updated_at = decision.expected_updated_at
  ORDER BY product.id
  FOR UPDATE OF product;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> ${decisions.products.length} THEN
    RAISE EXCEPTION 'Expected ${decisions.products.length} product row locks, got %', affected;
  END IF;

  INSERT INTO ${PRODUCT_BACKUP_TABLE} (
    batch_key, decision_sha256, channel_slug, salon_id, captured_at,
    product_id, variant_id, sku, product_name, product_slug,
    original_updated_at,
    original_product_is_active, original_product_is_published, original_product_is_visible,
    original_product_status, original_product_deleted_at,
    original_variant_is_active, original_variant_is_published, original_variant_is_for_sale,
    original_variant_sync_status, original_variant_availability_status, original_variant_deleted_at,
    original_allergens, target_allergens, original_storage_zone, target_storage_zone,
    original_nutrition_facts, target_nutrition_facts,
    original_price_per_unit, target_price_per_unit,
    original_unit_of_measure, target_unit_of_measure,
    original_category_id, original_category_name, original_category_slug, original_category_is_active,
    target_category_id, target_category_name, target_category_slug, target_category_is_active,
    confidence, reason, evidence_urls
  )
  SELECT run.batch_key, run.decision_sha256, run.channel_slug, run.salon_id, run.recorded_at,
         product.id, variant.id, variant.sku, product.name, product.slug,
         product.updated_at,
         product.is_active, product.is_published, product.is_visible, product.status, product.deleted_at,
         variant.is_active, variant.is_published, variant.is_for_sale,
         variant.sync_status, variant.availability_status, variant.deleted_at,
         product.allergens, decision.target_allergens,
         product.storage_zone, decision.target_storage_zone,
         product.nutrition_facts, decision.target_nutrition_facts,
         product.price_per_unit, decision.target_price_per_unit,
         product.unit_of_measure, decision.target_unit_of_measure,
         source_category.id, source_category.name, source_category.slug, source_category.is_active,
         target_category.id, target_category.name, target_category.slug, target_category.is_active,
         decision.confidence, decision.reason, decision.evidence_urls
  FROM _adg_catalog_data_run run
  JOIN _adg_catalog_data_decisions decision ON TRUE
  JOIN product_variants variant
    ON variant.salon_id = run.salon_id
   AND variant.id = decision.variant_id
   AND variant.template_id = decision.product_id
   AND variant.sku = decision.sku
   AND variant.is_active = decision.expected_variant_is_active
   AND variant.is_published = decision.expected_variant_is_published
   AND variant.is_for_sale = decision.expected_variant_is_for_sale
   AND variant.sync_status = decision.expected_variant_sync_status
   AND variant.availability_status = decision.expected_variant_availability_status
   AND variant.deleted_at IS NOT DISTINCT FROM decision.expected_variant_deleted_at
  JOIN products product
    ON product.salon_id = run.salon_id
   AND product.id = decision.product_id
   AND product.id = variant.template_id
   AND product.name = decision.product_name
   AND product.slug = decision.product_slug
   AND product.updated_at = decision.expected_updated_at
   AND product.is_active = decision.expected_product_is_active
   AND product.is_published = decision.expected_product_is_published
   AND product.is_visible = decision.expected_product_is_visible
   AND product.status = decision.expected_product_status
   AND product.deleted_at IS NOT DISTINCT FROM decision.expected_product_deleted_at
   AND product.allergens IS NOT DISTINCT FROM decision.expected_allergens
   AND product.storage_zone IS NOT DISTINCT FROM decision.expected_storage_zone
   AND product.nutrition_facts IS NOT DISTINCT FROM decision.expected_nutrition_facts
   AND product.price_per_unit IS NOT DISTINCT FROM decision.expected_price_per_unit
   AND product.unit_of_measure IS NOT DISTINCT FROM decision.expected_unit_of_measure
   AND product.category_id = decision.expected_category_id
  JOIN categories source_category
    ON source_category.salon_id = run.salon_id
   AND source_category.id = decision.expected_category_id
   AND source_category.name = decision.expected_category_name
   AND source_category.slug = decision.expected_category_slug
   AND source_category.is_active = decision.expected_category_is_active
  JOIN categories target_category
    ON target_category.salon_id = run.salon_id
   AND target_category.id = decision.target_category_id
   AND target_category.name = decision.target_category_name
   AND target_category.slug = decision.target_category_slug
   AND target_category.is_active = decision.target_category_is_active;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> ${decisions.products.length} THEN
    RAISE EXCEPTION 'Expected ${decisions.products.length} persistent product backup rows, got %', affected;
  END IF;

  INSERT INTO ${AUDIT_TABLE} (
    batch_key, decision_sha256, channel_slug, salon_id, recorded_at, action, product_rows
  )
  SELECT batch_key, decision_sha256, channel_slug, salon_id, recorded_at,
         'backup_captured', ${decisions.products.length}
  FROM _adg_catalog_data_run;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION 'Expected one backup audit row, got %', affected;
  END IF;

  UPDATE products product
  SET allergens = backup.target_allergens,
      storage_zone = backup.target_storage_zone,
      nutrition_facts = backup.target_nutrition_facts,
      price_per_unit = backup.target_price_per_unit,
      unit_of_measure = backup.target_unit_of_measure,
      category_id = backup.target_category_id
  FROM _adg_catalog_data_run run,
       ${PRODUCT_BACKUP_TABLE} backup,
       product_variants variant,
       categories source_category,
       categories target_category
  WHERE backup.batch_key = run.batch_key
    AND backup.decision_sha256 = run.decision_sha256
    AND backup.channel_slug = run.channel_slug
    AND backup.salon_id = run.salon_id
    AND product.salon_id = run.salon_id
    AND product.id = backup.product_id
    AND product.name = backup.product_name
    AND product.slug = backup.product_slug
    AND product.updated_at = backup.original_updated_at
    AND product.is_active = backup.original_product_is_active
    AND product.is_published = backup.original_product_is_published
    AND product.is_visible = backup.original_product_is_visible
    AND product.status = backup.original_product_status
    AND product.deleted_at IS NOT DISTINCT FROM backup.original_product_deleted_at
    AND product.allergens IS NOT DISTINCT FROM backup.original_allergens
    AND product.storage_zone IS NOT DISTINCT FROM backup.original_storage_zone
    AND product.nutrition_facts IS NOT DISTINCT FROM backup.original_nutrition_facts
    AND product.price_per_unit IS NOT DISTINCT FROM backup.original_price_per_unit
    AND product.unit_of_measure IS NOT DISTINCT FROM backup.original_unit_of_measure
    AND product.category_id = backup.original_category_id
    AND variant.salon_id = run.salon_id
    AND variant.id = backup.variant_id
    AND variant.template_id = product.id
    AND variant.sku = backup.sku
    AND variant.is_active = backup.original_variant_is_active
    AND variant.is_published = backup.original_variant_is_published
    AND variant.is_for_sale = backup.original_variant_is_for_sale
    AND variant.sync_status = backup.original_variant_sync_status
    AND variant.availability_status = backup.original_variant_availability_status
    AND variant.deleted_at IS NOT DISTINCT FROM backup.original_variant_deleted_at
    AND source_category.salon_id = run.salon_id
    AND source_category.id = backup.original_category_id
    AND source_category.name = backup.original_category_name
    AND source_category.slug = backup.original_category_slug
    AND source_category.is_active = backup.original_category_is_active
    AND target_category.salon_id = run.salon_id
    AND target_category.id = backup.target_category_id
    AND target_category.name = backup.target_category_name
    AND target_category.slug = backup.target_category_slug
    AND target_category.is_active = backup.target_category_is_active;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> ${decisions.products.length} THEN
    RAISE EXCEPTION 'Expected ${decisions.products.length} exact product updates, got %', affected;
  END IF;

  UPDATE ${PRODUCT_BACKUP_TABLE} backup
  SET applied_updated_at = product.updated_at
  FROM _adg_catalog_data_run run,
       products product
  WHERE backup.batch_key = run.batch_key
    AND backup.decision_sha256 = run.decision_sha256
    AND backup.channel_slug = run.channel_slug
    AND backup.salon_id = run.salon_id
    AND product.salon_id = run.salon_id
    AND product.id = backup.product_id
    AND product.updated_at > backup.original_updated_at;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> ${decisions.products.length} THEN
    RAISE EXCEPTION 'Expected ${decisions.products.length} applied updated_at captures, got %', affected;
  END IF;

  IF EXISTS (
    SELECT backup.sku
    FROM ${PRODUCT_BACKUP_TABLE} backup
    JOIN _adg_catalog_data_run run
      ON backup.batch_key = run.batch_key
     AND backup.decision_sha256 = run.decision_sha256
     AND backup.channel_slug = run.channel_slug
     AND backup.salon_id = run.salon_id
    LEFT JOIN products product
      ON product.salon_id = run.salon_id
     AND product.id = backup.product_id
     AND product.name = backup.product_name
     AND product.slug = backup.product_slug
     AND product.updated_at = backup.applied_updated_at
     AND product.updated_at > backup.original_updated_at
     AND product.is_active = backup.original_product_is_active
     AND product.is_published = backup.original_product_is_published
     AND product.is_visible = backup.original_product_is_visible
     AND product.status = backup.original_product_status
     AND product.deleted_at IS NOT DISTINCT FROM backup.original_product_deleted_at
     AND product.allergens IS NOT DISTINCT FROM backup.target_allergens
     AND product.storage_zone IS NOT DISTINCT FROM backup.target_storage_zone
     AND product.nutrition_facts IS NOT DISTINCT FROM backup.target_nutrition_facts
     AND product.price_per_unit IS NOT DISTINCT FROM backup.target_price_per_unit
     AND product.unit_of_measure IS NOT DISTINCT FROM backup.target_unit_of_measure
     AND product.category_id = backup.target_category_id
    WHERE product.id IS NULL OR backup.applied_updated_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Exact apply post-state or monotonic updated_at verification failed';
  END IF;

  INSERT INTO ${AUDIT_TABLE} (
    batch_key, decision_sha256, channel_slug, salon_id, recorded_at, action, product_rows
  )
  SELECT batch_key, decision_sha256, channel_slug, salon_id, clock_timestamp(),
         'apply_complete', ${decisions.products.length}
  FROM _adg_catalog_data_run;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION 'Expected one apply audit row, got %', affected;
  END IF;
END $$;

SELECT backup.sku, backup.product_name, backup.original_updated_at, backup.applied_updated_at,
       backup.original_category_slug, backup.target_category_slug,
       backup.original_price_per_unit, backup.target_price_per_unit
FROM _adg_catalog_data_run run
JOIN ${PRODUCT_BACKUP_TABLE} backup
  ON backup.batch_key = run.batch_key
 AND backup.decision_sha256 = run.decision_sha256
 AND backup.channel_slug = run.channel_slug
 AND backup.salon_id = run.salon_id
ORDER BY backup.sku;

COMMIT;
`.replace(/[ \t]+\n/g, '\n');
}

function renderRollbackSql(decisions, decisionSha) {
  return `${renderPreamble(decisions, decisionSha, 'roll back')}

DO $$
BEGIN
  IF (SELECT COUNT(*) FROM _adg_catalog_data_target_salon) <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one active pinned Asia Deli Go channel';
  END IF;
  IF (SELECT COUNT(*) FROM _adg_catalog_data_decisions) <> ${decisions.products.length} THEN
    RAISE EXCEPTION 'Expected exactly ${decisions.products.length} catalog-data decisions';
  END IF;
  IF (
    SELECT COUNT(*)
    FROM ${PRODUCT_BACKUP_TABLE} backup
    JOIN _adg_catalog_data_run run
      ON backup.batch_key = run.batch_key
     AND backup.decision_sha256 = run.decision_sha256
     AND backup.channel_slug = run.channel_slug
     AND backup.salon_id = run.salon_id
  ) <> ${decisions.products.length} THEN
    RAISE EXCEPTION 'Expected exactly ${decisions.products.length} tenant- and decision-scoped backup rows';
  END IF;
  IF EXISTS (
    SELECT decision.sku
    FROM _adg_catalog_data_decisions decision
    CROSS JOIN _adg_catalog_data_run run
    LEFT JOIN ${PRODUCT_BACKUP_TABLE} backup
      ON backup.batch_key = run.batch_key
     AND backup.decision_sha256 = run.decision_sha256
     AND backup.channel_slug = run.channel_slug
     AND backup.salon_id = run.salon_id
     AND backup.sku = decision.sku
     AND backup.product_id = decision.product_id
     AND backup.variant_id = decision.variant_id
     AND backup.product_name = decision.product_name
     AND backup.product_slug = decision.product_slug
     AND backup.original_updated_at = decision.expected_updated_at
     AND backup.original_product_is_active = decision.expected_product_is_active
     AND backup.original_product_is_published = decision.expected_product_is_published
     AND backup.original_product_is_visible = decision.expected_product_is_visible
     AND backup.original_product_status = decision.expected_product_status
     AND backup.original_product_deleted_at IS NOT DISTINCT FROM decision.expected_product_deleted_at
     AND backup.original_variant_is_active = decision.expected_variant_is_active
     AND backup.original_variant_is_published = decision.expected_variant_is_published
     AND backup.original_variant_is_for_sale = decision.expected_variant_is_for_sale
     AND backup.original_variant_sync_status = decision.expected_variant_sync_status
     AND backup.original_variant_availability_status = decision.expected_variant_availability_status
     AND backup.original_variant_deleted_at IS NOT DISTINCT FROM decision.expected_variant_deleted_at
     AND backup.original_allergens IS NOT DISTINCT FROM decision.expected_allergens
     AND backup.target_allergens IS NOT DISTINCT FROM decision.target_allergens
     AND backup.original_storage_zone IS NOT DISTINCT FROM decision.expected_storage_zone
     AND backup.target_storage_zone IS NOT DISTINCT FROM decision.target_storage_zone
     AND backup.original_nutrition_facts IS NOT DISTINCT FROM decision.expected_nutrition_facts
     AND backup.target_nutrition_facts IS NOT DISTINCT FROM decision.target_nutrition_facts
     AND backup.original_price_per_unit IS NOT DISTINCT FROM decision.expected_price_per_unit
     AND backup.target_price_per_unit IS NOT DISTINCT FROM decision.target_price_per_unit
     AND backup.original_unit_of_measure IS NOT DISTINCT FROM decision.expected_unit_of_measure
     AND backup.target_unit_of_measure IS NOT DISTINCT FROM decision.target_unit_of_measure
     AND backup.original_category_id = decision.expected_category_id
     AND backup.original_category_name = decision.expected_category_name
     AND backup.original_category_slug = decision.expected_category_slug
     AND backup.original_category_is_active = decision.expected_category_is_active
     AND backup.target_category_id = decision.target_category_id
     AND backup.target_category_name = decision.target_category_name
     AND backup.target_category_slug = decision.target_category_slug
     AND backup.target_category_is_active = decision.target_category_is_active
     AND backup.confidence = decision.confidence
     AND backup.reason = decision.reason
     AND backup.evidence_urls = decision.evidence_urls
    WHERE backup.product_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Persistent backup does not exactly match the reviewed decision file';
  END IF;
  IF (
    SELECT COUNT(*)
    FROM ${AUDIT_TABLE} audit
    JOIN _adg_catalog_data_run run
      ON audit.batch_key = run.batch_key
     AND audit.decision_sha256 = run.decision_sha256
     AND audit.channel_slug = run.channel_slug
     AND audit.salon_id = run.salon_id
    WHERE audit.action IN ('backup_captured', 'apply_complete')
  ) <> 2 OR EXISTS (
    SELECT 1
    FROM ${AUDIT_TABLE} audit
    JOIN _adg_catalog_data_run run
      ON audit.batch_key = run.batch_key
     AND audit.decision_sha256 = run.decision_sha256
     AND audit.channel_slug = run.channel_slug
     AND audit.salon_id = run.salon_id
    WHERE audit.action = 'rollback_complete'
  ) THEN
    RAISE EXCEPTION 'Apply audit precondition failed or this one-shot batch was already rolled back';
  END IF;

  IF EXISTS (
    SELECT backup.sku
    FROM ${PRODUCT_BACKUP_TABLE} backup
    JOIN _adg_catalog_data_run run
      ON backup.batch_key = run.batch_key
     AND backup.decision_sha256 = run.decision_sha256
     AND backup.channel_slug = run.channel_slug
     AND backup.salon_id = run.salon_id
    LEFT JOIN product_variants variant
      ON variant.salon_id = run.salon_id
     AND variant.id = backup.variant_id
     AND variant.template_id = backup.product_id
     AND variant.sku = backup.sku
     AND variant.is_active = backup.original_variant_is_active
     AND variant.is_published = backup.original_variant_is_published
     AND variant.is_for_sale = backup.original_variant_is_for_sale
     AND variant.sync_status = backup.original_variant_sync_status
     AND variant.availability_status = backup.original_variant_availability_status
     AND variant.deleted_at IS NOT DISTINCT FROM backup.original_variant_deleted_at
    LEFT JOIN products product
      ON product.salon_id = run.salon_id
     AND product.id = backup.product_id
     AND product.id = variant.template_id
     AND product.name = backup.product_name
     AND product.slug = backup.product_slug
     AND product.updated_at = backup.applied_updated_at
     AND product.is_active = backup.original_product_is_active
     AND product.is_published = backup.original_product_is_published
     AND product.is_visible = backup.original_product_is_visible
     AND product.status = backup.original_product_status
     AND product.deleted_at IS NOT DISTINCT FROM backup.original_product_deleted_at
     AND product.allergens IS NOT DISTINCT FROM backup.target_allergens
     AND product.storage_zone IS NOT DISTINCT FROM backup.target_storage_zone
     AND product.nutrition_facts IS NOT DISTINCT FROM backup.target_nutrition_facts
     AND product.price_per_unit IS NOT DISTINCT FROM backup.target_price_per_unit
     AND product.unit_of_measure IS NOT DISTINCT FROM backup.target_unit_of_measure
     AND product.category_id = backup.target_category_id
    LEFT JOIN categories source_category
      ON source_category.salon_id = run.salon_id
     AND source_category.id = backup.original_category_id
     AND source_category.name = backup.original_category_name
     AND source_category.slug = backup.original_category_slug
     AND source_category.is_active = backup.original_category_is_active
    LEFT JOIN categories target_category
      ON target_category.salon_id = run.salon_id
     AND target_category.id = backup.target_category_id
     AND target_category.name = backup.target_category_name
     AND target_category.slug = backup.target_category_slug
     AND target_category.is_active = backup.target_category_is_active
    WHERE variant.id IS NULL
       OR product.id IS NULL
       OR source_category.id IS NULL
       OR target_category.id IS NULL
       OR backup.applied_updated_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Exact post-apply state changed; refusing to overwrite intervening edits';
  END IF;
END $$;

DO $$
DECLARE
  affected integer;
BEGIN
  UPDATE products product
  SET allergens = backup.original_allergens,
      storage_zone = backup.original_storage_zone,
      nutrition_facts = backup.original_nutrition_facts,
      price_per_unit = backup.original_price_per_unit,
      unit_of_measure = backup.original_unit_of_measure,
      category_id = backup.original_category_id
  FROM _adg_catalog_data_run run,
       ${PRODUCT_BACKUP_TABLE} backup,
       product_variants variant,
       categories source_category,
       categories target_category
  WHERE backup.batch_key = run.batch_key
    AND backup.decision_sha256 = run.decision_sha256
    AND backup.channel_slug = run.channel_slug
    AND backup.salon_id = run.salon_id
    AND product.salon_id = run.salon_id
    AND product.id = backup.product_id
    AND product.name = backup.product_name
    AND product.slug = backup.product_slug
    AND product.updated_at = backup.applied_updated_at
    AND product.is_active = backup.original_product_is_active
    AND product.is_published = backup.original_product_is_published
    AND product.is_visible = backup.original_product_is_visible
    AND product.status = backup.original_product_status
    AND product.deleted_at IS NOT DISTINCT FROM backup.original_product_deleted_at
    AND product.allergens IS NOT DISTINCT FROM backup.target_allergens
    AND product.storage_zone IS NOT DISTINCT FROM backup.target_storage_zone
    AND product.nutrition_facts IS NOT DISTINCT FROM backup.target_nutrition_facts
    AND product.price_per_unit IS NOT DISTINCT FROM backup.target_price_per_unit
    AND product.unit_of_measure IS NOT DISTINCT FROM backup.target_unit_of_measure
    AND product.category_id = backup.target_category_id
    AND variant.salon_id = run.salon_id
    AND variant.id = backup.variant_id
    AND variant.template_id = product.id
    AND variant.sku = backup.sku
    AND variant.is_active = backup.original_variant_is_active
    AND variant.is_published = backup.original_variant_is_published
    AND variant.is_for_sale = backup.original_variant_is_for_sale
    AND variant.sync_status = backup.original_variant_sync_status
    AND variant.availability_status = backup.original_variant_availability_status
    AND variant.deleted_at IS NOT DISTINCT FROM backup.original_variant_deleted_at
    AND source_category.salon_id = run.salon_id
    AND source_category.id = backup.original_category_id
    AND source_category.name = backup.original_category_name
    AND source_category.slug = backup.original_category_slug
    AND source_category.is_active = backup.original_category_is_active
    AND target_category.salon_id = run.salon_id
    AND target_category.id = backup.target_category_id
    AND target_category.name = backup.target_category_name
    AND target_category.slug = backup.target_category_slug
    AND target_category.is_active = backup.target_category_is_active;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> ${decisions.products.length} THEN
    RAISE EXCEPTION 'Expected ${decisions.products.length} exact product restorations, got %', affected;
  END IF;

  IF EXISTS (
    SELECT backup.sku
    FROM ${PRODUCT_BACKUP_TABLE} backup
    JOIN _adg_catalog_data_run run
      ON backup.batch_key = run.batch_key
     AND backup.decision_sha256 = run.decision_sha256
     AND backup.channel_slug = run.channel_slug
     AND backup.salon_id = run.salon_id
    LEFT JOIN products product
      ON product.salon_id = run.salon_id
     AND product.id = backup.product_id
     AND product.name = backup.product_name
     AND product.slug = backup.product_slug
     AND product.updated_at > backup.applied_updated_at
     AND product.is_active = backup.original_product_is_active
     AND product.is_published = backup.original_product_is_published
     AND product.is_visible = backup.original_product_is_visible
     AND product.status = backup.original_product_status
     AND product.deleted_at IS NOT DISTINCT FROM backup.original_product_deleted_at
     AND product.allergens IS NOT DISTINCT FROM backup.original_allergens
     AND product.storage_zone IS NOT DISTINCT FROM backup.original_storage_zone
     AND product.nutrition_facts IS NOT DISTINCT FROM backup.original_nutrition_facts
     AND product.price_per_unit IS NOT DISTINCT FROM backup.original_price_per_unit
     AND product.unit_of_measure IS NOT DISTINCT FROM backup.original_unit_of_measure
     AND product.category_id = backup.original_category_id
    WHERE product.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Exact rollback restoration or monotonic updated_at verification failed';
  END IF;

  INSERT INTO ${AUDIT_TABLE} (
    batch_key, decision_sha256, channel_slug, salon_id, recorded_at, action, product_rows
  )
  SELECT batch_key, decision_sha256, channel_slug, salon_id, clock_timestamp(),
         'rollback_complete', ${decisions.products.length}
  FROM _adg_catalog_data_run;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION 'Expected one rollback audit row, got %', affected;
  END IF;
END $$;

SELECT backup.sku, product.name, backup.target_category_slug, backup.original_category_slug,
       backup.target_price_per_unit, backup.original_price_per_unit,
       audit.recorded_at AS rolled_back_at
FROM _adg_catalog_data_run run
JOIN ${PRODUCT_BACKUP_TABLE} backup
  ON backup.batch_key = run.batch_key
 AND backup.decision_sha256 = run.decision_sha256
 AND backup.channel_slug = run.channel_slug
 AND backup.salon_id = run.salon_id
JOIN products product
  ON product.salon_id = run.salon_id
 AND product.id = backup.product_id
JOIN ${AUDIT_TABLE} audit
  ON audit.batch_key = run.batch_key
 AND audit.decision_sha256 = run.decision_sha256
 AND audit.channel_slug = run.channel_slug
 AND audit.salon_id = run.salon_id
 AND audit.action = 'rollback_complete'
ORDER BY backup.sku;

COMMIT;
`.replace(/[ \t]+\n/g, '\n');
}

function describeChanges(row) {
  const changes = [];
  if (!isDeepStrictEqual(row.expected.allergens, row.target.allergens)) {
    changes.push(`allergens ${JSON.stringify(row.expected.allergens)} -> ${JSON.stringify(row.target.allergens)}`);
  }
  if (row.expected.storageZone !== row.target.storageZone) {
    changes.push(`storage ${row.expected.storageZone ?? 'null'} -> ${row.target.storageZone ?? 'null'}`);
  }
  if (!isDeepStrictEqual(row.expected.nutritionFacts, row.target.nutritionFacts)) {
    changes.push('nutrition exact JSON replacement');
  }
  if (row.expected.pricePerUnit !== row.target.pricePerUnit) {
    changes.push(`unit price ${row.expected.pricePerUnit} -> ${row.target.pricePerUnit} ${row.target.unitOfMeasure}`);
  }
  if (row.expected.category.id !== row.target.category.id) {
    changes.push(`category ${row.expected.category.name} -> ${row.target.category.name}`);
  }
  return changes.join('; ');
}

function renderMarkdown(decisions, decisionSha) {
  const lines = [
    '# Asia Deli Go Catalog Data Remediation',
    '',
    `Prepared: ${decisions.preparedAt}`,
    `Batch: \`${decisions.batch}\``,
    `Decision SHA-256: \`${decisionSha}\``,
    '',
    '## Result',
    '',
    `- Exactly ${decisions.products.length} published Asia Deli Go products are in scope.`,
    '- Only rows in products are changed; product_variants and categories are read-only guards.',
    '- Persistent tenant-scoped backup and audit tables are created before mutation.',
    '- Production mutation in this preparation step: none.',
    '',
    '## Reviewed changes',
    '',
    '| SKU | Product | Exact change | Confidence | Evidence |',
    '| --- | --- | --- | --- | --- |',
    ...decisions.products.map((row) => {
      const evidence = row.evidence.map((item, index) => `[${index + 1}](${item.url})`).join(', ');
      return `| ${row.sku} | ${row.name} | ${describeChanges(row)} | ${row.confidence} | ${evidence} |`;
    }),
    '',
    '## Guardrails',
    '',
    '- Apply is SERIALIZABLE, one-shot, and pinned to the exact active channel plus salon UUID.',
    '- Every row is guarded by exact SKU, product UUID, variant UUID, name, slug, category IDs/names/slugs, product and variant statuses, soft-delete state, tracked old values, and expected product updated_at.',
    '- Apply aborts unless exactly six product locks, backups, updates, applied timestamps, and post-state rows are observed.',
    '- The SHA-256 of the exact decision JSON is persisted in both backup and audit rows and must match during rollback.',
    '- Rollback requires the exact post-apply values and exact applied updated_at; any intervening product edit causes a full abort.',
    '- The production zz_enforce_products_monotonic_updated_at trigger must advance updated_at after both apply and rollback.',
    '- No category, variant, stock, retail-price, EAN, translation, media, publication, order, reservation, or customer row is changed.',
    '- Backup and audit rows are retained; neither SQL artifact contains DELETE.',
    '',
    '## Persistent recovery evidence',
    '',
    `- Product backup: \`${PRODUCT_BACKUP_TABLE}\` — exactly six explicit-column rows.`,
    `- Audit log: \`${AUDIT_TABLE}\` — backup_captured, apply_complete, and rollback_complete timestamps.`,
    '',
    '## Schema assumptions',
    '',
    '1. product_variants.template_id = products.id uses UUIDs and a declared FK; tenant-scoped match/mismatch samples were verified.',
    '2. products.category_id = categories.id uses UUIDs and a declared FK; source and target category identities are exact read-only guards.',
    '3. All canonical joins use the pinned salon_id; products and variants use exact active/published/for-sale/status and deleted_at snapshots.',
    '',
    '## Notes',
    '',
    ...decisions.notes.map((note) => `- ${note}`),
    '',
    '## Artifacts',
    '',
    `- Decisions: \`${DEFAULT_INPUT}\``,
    `- Guarded apply: \`${DEFAULT_APPLY}\``,
    `- Guarded rollback: \`${DEFAULT_ROLLBACK}\``,
  ];
  return `${lines.join('\n')}\n`;
}

function writeFile(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
}

function main() {
  const options = parseArgs();
  const inputContents = fs.readFileSync(options.input, 'utf8');
  const decisions = JSON.parse(inputContents);
  validate(decisions);
  const decisionSha = crypto.createHash('sha256').update(inputContents).digest('hex');
  writeFile(options.apply, renderApplySql(decisions, decisionSha));
  writeFile(options.rollback, renderRollbackSql(decisions, decisionSha));
  writeFile(options.output, renderMarkdown(decisions, decisionSha));
  console.log(`Validated exact catalog-data scope: ${decisions.products.length} products.`);
  console.log(`Decision SHA-256: ${decisionSha}`);
  console.log(`Wrote ${options.output}`);
  console.log(`Wrote ${options.apply}`);
  console.log(`Wrote ${options.rollback}`);
}

main();
