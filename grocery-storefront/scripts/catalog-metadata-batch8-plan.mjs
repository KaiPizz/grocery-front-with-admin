#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { isDeepStrictEqual } from 'node:util';

const DEFAULT_INPUT = 'docs/asiandeligo-catalog-metadata-batch8-decisions-20260722.json';
const DEFAULT_OUTPUT = 'docs/asiandeligo-catalog-metadata-batch8-remediation-20260722.md';
const DEFAULT_APPLY = 'docs/asiandeligo-catalog-metadata-batch8-apply-20260722.sql';
const DEFAULT_ROLLBACK = 'docs/asiandeligo-catalog-metadata-batch8-rollback-20260722.sql';

const EXPECTED_BATCH = 'asiandeligo-catalog-metadata-batch8-20260722-v1';
const EXPECTED_CHANNEL = 'asiandeligo';
const EXPECTED_SALON_ID = 'e73271a9-53e3-4a20-a02e-791726b452aa';
const PRODUCT_BACKUP_TABLE = 'asiandeligo_catalog_metadata_batch8_product_backup_20260722';
const AUDIT_TABLE = 'asiandeligo_catalog_metadata_batch8_audit_20260722';
const PRODUCT_BACKUP_RELATION = `public.${PRODUCT_BACKUP_TABLE}`;
const AUDIT_RELATION = `public.${AUDIT_TABLE}`;
const EXPECTED_DECISION_CONTENT_SHA256 = 'b2125e8d03aa53ebc4942a9cb8d0f69f5184b04e76b96d6c8e61596dacc80ba4';
const ALLERGEN_CODES = new Set([
  'cereals', 'crustaceans', 'eggs', 'fish', 'peanuts', 'soybeans', 'milk',
  'nuts', 'celery', 'mustard', 'sesame', 'sulphites', 'lupin', 'molluscs',
]);
const EXPECTED_COHORT_SKUS = [
  'ADG-000492', 'ADG-000493', 'ADG-000537', 'ADG-000538', 'ADG-000539',
  'ADG-000564', 'ADG-000105', 'ADG-000121', 'ADG-000234', 'ADG-000352',
  'ADG-000025', 'ADG-000702', 'ADG-000062', 'ADG-000069', 'ADG-000089',
  'ADG-000179', 'ADG-000382', 'ADG-000957', 'ADG-000029', 'ADG-000034',
  'ADG-000071', 'ADG-000308', 'ADG-000349', 'ADG-000350', 'ADG-000371',
];
const SNAPSHOT_FIELDS = [
  'allergens',
  'mayContainAllergens',
  'storageZone',
  'nutritionFacts',
  'countryOfOrigin',
  'ingredients',
  'pricePerUnit',
  'unitOfMeasure',
  'category',
];
const MUTABLE_FIELDS = [
  'allergens',
  'mayContainAllergens',
  'storageZone',
  'nutritionFacts',
  'countryOfOrigin',
  'ingredients',
];
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

function sqlTextArray(values) {
  return `ARRAY[${values.map((value) => `${sqlLiteral(value)}::text`).join(', ')}]::text[]`;
}

function assertUnique(items, key, label) {
  const seen = new Set();
  for (const item of items) {
    const value = item?.[key];
    if (!value || seen.has(value)) {
      throw new Error(`${label} must contain unique non-empty ${key} values`);
    }
    seen.add(value);
  }
}

function assertHttpsEvidence(evidence, label, minimum = 2) {
  if (!Array.isArray(evidence) || evidence.length < minimum) {
    throw new Error(`${label} must contain at least ${minimum} evidence item(s)`);
  }
  for (const item of evidence) {
    if (!item?.url?.startsWith('https://') || !item?.kind || !item?.supports) {
      throw new Error(`${label} evidence must include https URL, kind, and supports`);
    }
  }
}

function assertSnapshot(snapshot, label) {
  if (!snapshot || !isDeepStrictEqual(Object.keys(snapshot).sort(), [...SNAPSHOT_FIELDS].sort())) {
    throw new Error(`${label} must be a full exact field snapshot`);
  }
  if (!Array.isArray(snapshot.allergens) || !Array.isArray(snapshot.mayContainAllergens)) {
    throw new Error(`${label} allergen fields must be arrays`);
  }
  for (const key of ['allergens', 'mayContainAllergens']) {
    if (
      snapshot[key].some((value) => typeof value !== 'string' || !ALLERGEN_CODES.has(value))
      || new Set(snapshot[key]).size !== snapshot[key].length
    ) {
      throw new Error(`${label}.${key} must contain unique supported allergen codes`);
    }
  }
  if (snapshot.storageZone !== null && !['AMBIENT', 'CHILLED', 'FROZEN'].includes(snapshot.storageZone)) {
    throw new Error(`${label}.storageZone is invalid`);
  }
  if (
    snapshot.nutritionFacts !== null
    && (
      typeof snapshot.nutritionFacts !== 'object'
      || Array.isArray(snapshot.nutritionFacts)
    )
  ) {
    throw new Error(`${label}.nutritionFacts must be a plain object or null`);
  }
  for (const key of ['countryOfOrigin', 'ingredients', 'unitOfMeasure']) {
    if (snapshot[key] !== null && typeof snapshot[key] !== 'string') {
      throw new Error(`${label}.${key} must be a string or null`);
    }
  }
  if (
    snapshot.pricePerUnit !== null
    && (typeof snapshot.pricePerUnit !== 'string' || !/^\d+(?:\.\d+)?$/.test(snapshot.pricePerUnit))
  ) {
    throw new Error(`${label}.pricePerUnit must be an exact non-negative decimal string or null`);
  }
  const categoryKeys = ['id', 'isActive', 'name', 'slug'];
  if (!snapshot.category || !isDeepStrictEqual(Object.keys(snapshot.category).sort(), categoryKeys.sort())) {
    throw new Error(`${label}.category must be a full exact category identity`);
  }
  if (!/^[0-9a-f-]{36}$/i.test(snapshot.category.id) || snapshot.category.isActive !== true) {
    throw new Error(`${label}.category must be an active UUID category`);
  }
}

function changedFields(row) {
  return MUTABLE_FIELDS.filter((field) => !isDeepStrictEqual(row.expected[field], row.target[field]));
}

export function validateDecisions(decisions) {
  if (
    decisions?.version !== 1
    || decisions.batch !== EXPECTED_BATCH
    || decisions.channel !== EXPECTED_CHANNEL
    || decisions.salonId !== EXPECTED_SALON_ID
  ) {
    throw new Error('Unsupported catalog metadata batch identity');
  }
  if (!isDeepStrictEqual(decisions.cohortSkus, EXPECTED_COHORT_SKUS)) {
    throw new Error('Cohort must be the exact reviewed 25-SKU queue slice');
  }
  if (!Array.isArray(decisions.products) || decisions.products.length === 0) {
    throw new Error('At least one product transition is required');
  }
  if (!Array.isArray(decisions.holds)) {
    throw new Error('holds must be an array');
  }
  assertUnique(decisions.products, 'sku', 'products');
  assertUnique(decisions.products, 'productId', 'products');
  assertUnique(decisions.products, 'variantId', 'products');
  assertUnique(decisions.holds, 'sku', 'holds');

  const reviewedSkus = [...decisions.products.map((row) => row.sku), ...decisions.holds.map((row) => row.sku)].sort();
  if (!isDeepStrictEqual(reviewedSkus, [...EXPECTED_COHORT_SKUS].sort())) {
    throw new Error('products and holds must partition all 25 cohort SKUs exactly once');
  }

  for (const row of decisions.products) {
    if (!EXPECTED_COHORT_SKUS.includes(row.sku)) throw new Error(`Unexpected SKU ${row.sku}`);
    if (!/^[0-9a-f-]{36}$/i.test(row.productId) || !/^[0-9a-f-]{36}$/i.test(row.variantId)) {
      throw new Error(`Invalid product/variant UUID for ${row.sku}`);
    }
    if (!row.name || !row.slug || Number.isNaN(Date.parse(row.expectedUpdatedAt))) {
      throw new Error(`Missing identity guard for ${row.sku}`);
    }
    if (!isDeepStrictEqual(row.status?.product, EXPECTED_PRODUCT_STATUS)) {
      throw new Error(`Unexpected product status for ${row.sku}`);
    }
    if (!isDeepStrictEqual(row.status?.variant, EXPECTED_VARIANT_STATUS)) {
      throw new Error(`Unexpected variant status for ${row.sku}`);
    }
    assertSnapshot(row.expected, `${row.sku}.expected`);
    assertSnapshot(row.target, `${row.sku}.target`);
    if (!isDeepStrictEqual(row.expected.category, row.target.category)) {
      throw new Error(`Category mutation is outside this metadata batch for ${row.sku}`);
    }
    if (row.expected.pricePerUnit !== row.target.pricePerUnit || row.expected.unitOfMeasure !== row.target.unitOfMeasure) {
      throw new Error(`Unit-price mutation is outside this metadata batch for ${row.sku}`);
    }
    const fields = changedFields(row);
    if (fields.length === 0) throw new Error(`No actual metadata transition for ${row.sku}`);
    if (!isDeepStrictEqual(row.changedFields, fields)) {
      throw new Error(`changedFields mismatch for ${row.sku}: expected ${fields.join(', ')}`);
    }
    if (row.confidence !== 'high' || !row.reason) {
      throw new Error(`Only high-confidence reasoned transitions are allowed for ${row.sku}`);
    }
    assertHttpsEvidence(row.evidence, `${row.sku}.evidence`, 2);
  }

  for (const hold of decisions.holds) {
    if (!EXPECTED_COHORT_SKUS.includes(hold.sku) || !hold.reason) {
      throw new Error(`Invalid hold entry for ${hold.sku ?? '(missing)'}`);
    }
    assertHttpsEvidence(hold.evidence, `${hold.sku}.evidence`, 1);
  }

  const contentSha = crypto
    .createHash('sha256')
    .update(JSON.stringify(decisions))
    .digest('hex');
  if (contentSha !== EXPECTED_DECISION_CONTENT_SHA256) {
    throw new Error('Decision content differs from the exact source-reviewed approval set');
  }

  return decisions;
}

function decisionValues(decisions) {
  return decisions.products.map((row) => `  (
    ${sqlLiteral(row.sku)}::text,
    ${sqlLiteral(row.productId)}::uuid,
    ${sqlLiteral(row.variantId)}::uuid,
    ${sqlLiteral(row.name)}::text,
    ${sqlLiteral(row.slug)}::text,
    ${sqlLiteral(row.expectedUpdatedAt)}::timestamptz,
    ${sqlNullableJson(row.expected.allergens)},
    ${sqlNullableJson(row.target.allergens)},
    ${sqlNullableJson(row.expected.mayContainAllergens)},
    ${sqlNullableJson(row.target.mayContainAllergens)},
    ${sqlNullableText(row.expected.storageZone)},
    ${sqlNullableText(row.target.storageZone)},
    ${sqlNullableJson(row.expected.nutritionFacts)},
    ${sqlNullableJson(row.target.nutritionFacts)},
    ${sqlNullableText(row.expected.countryOfOrigin)},
    ${sqlNullableText(row.target.countryOfOrigin)},
    ${sqlNullableText(row.expected.ingredients)},
    ${sqlNullableText(row.target.ingredients)},
    ${sqlNullableNumeric(row.expected.pricePerUnit)},
    ${sqlNullableText(row.expected.unitOfMeasure)},
    ${sqlLiteral(row.expected.category.id)}::uuid,
    ${sqlLiteral(row.expected.category.name)}::text,
    ${sqlLiteral(row.expected.category.slug)}::text,
    ${sqlTextArray(row.changedFields)}
  )`).join(',\n');
}

function commonSql(decisions, decisionSha, action) {
  return `\\set ON_ERROR_STOP on
-- Generated by scripts/catalog-metadata-batch8-plan.mjs
-- Purpose: ${action} the reviewed Asia Deli Go metadata batch.
-- Decision SHA-256: ${decisionSha}
--
-- JOIN contract (schema-introspect verified on production 2026-07-22):
--   product_variants.template_id (uuid) = products.id (uuid) — FK declared; sampled match OK.
--   products.category_id (uuid) = categories.id (uuid) — FK declared; sampled match OK.
--   channels.salon_id = products/product_variants/categories.salon_id (uuid) — tenant pinned on every table.
-- Status values: products.status=active; variant sync_status=synced and availability_status=IN_STOCK.
-- Soft-delete policy: products and variants require deleted_at IS NULL; category/channel require active.
-- Canonical tables only: products, product_variants, categories, channels; no backup/legacy table is joined.

BEGIN;
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
SET LOCAL search_path = pg_catalog, public;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';

CREATE TEMP TABLE _adg_metadata_target_salon (
  salon_id uuid PRIMARY KEY,
  channel_slug text NOT NULL
) ON COMMIT DROP;

INSERT INTO _adg_metadata_target_salon (salon_id, channel_slug)
SELECT salon_id, slug
FROM public.channels
WHERE salon_id = '${EXPECTED_SALON_ID}'::uuid
  AND slug = '${EXPECTED_CHANNEL}'
  AND is_active = TRUE
FOR SHARE;

CREATE TEMP TABLE _adg_metadata_decisions (
  sku text PRIMARY KEY,
  product_id uuid UNIQUE NOT NULL,
  variant_id uuid UNIQUE NOT NULL,
  expected_name text NOT NULL,
  expected_slug text NOT NULL,
  expected_updated_at timestamptz NOT NULL,
  expected_allergens jsonb,
  target_allergens jsonb,
  expected_may_contain_allergens jsonb,
  target_may_contain_allergens jsonb,
  expected_storage_zone text,
  target_storage_zone text,
  expected_nutrition_facts jsonb,
  target_nutrition_facts jsonb,
  expected_country_of_origin text,
  target_country_of_origin text,
  expected_ingredients text,
  target_ingredients text,
  expected_price_per_unit numeric,
  expected_unit_of_measure text,
  category_id uuid NOT NULL,
  category_name text NOT NULL,
  category_slug text NOT NULL,
  changed_fields text[] NOT NULL
) ON COMMIT DROP;

INSERT INTO _adg_metadata_decisions VALUES
${decisionValues(decisions)};
`;
}

function exactExpectedPredicate(alias = 'product', decision = 'decision') {
  return `${alias}.allergens IS NOT DISTINCT FROM ${decision}.expected_allergens
    AND ${alias}.may_contain_allergens IS NOT DISTINCT FROM ${decision}.expected_may_contain_allergens
    AND ${alias}.storage_zone IS NOT DISTINCT FROM ${decision}.expected_storage_zone
    AND ${alias}.nutrition_facts IS NOT DISTINCT FROM ${decision}.expected_nutrition_facts
    AND ${alias}.country_of_origin IS NOT DISTINCT FROM ${decision}.expected_country_of_origin
    AND ${alias}.ingredients IS NOT DISTINCT FROM ${decision}.expected_ingredients
    AND ${alias}.price_per_unit IS NOT DISTINCT FROM ${decision}.expected_price_per_unit
    AND ${alias}.unit_of_measure IS NOT DISTINCT FROM ${decision}.expected_unit_of_measure`;
}

function exactTargetPredicate(alias = 'product', decision = 'decision') {
  return `${alias}.allergens IS NOT DISTINCT FROM ${decision}.target_allergens
    AND ${alias}.may_contain_allergens IS NOT DISTINCT FROM ${decision}.target_may_contain_allergens
    AND ${alias}.storage_zone IS NOT DISTINCT FROM ${decision}.target_storage_zone
    AND ${alias}.nutrition_facts IS NOT DISTINCT FROM ${decision}.target_nutrition_facts
    AND ${alias}.country_of_origin IS NOT DISTINCT FROM ${decision}.target_country_of_origin
    AND ${alias}.ingredients IS NOT DISTINCT FROM ${decision}.target_ingredients
    AND ${alias}.price_per_unit IS NOT DISTINCT FROM ${decision}.expected_price_per_unit
    AND ${alias}.unit_of_measure IS NOT DISTINCT FROM ${decision}.expected_unit_of_measure`;
}

function exactBackupPredicate(alias = 'backup', decision = 'decision') {
  return `${alias}.product_id = ${decision}.product_id
    AND ${alias}.variant_id = ${decision}.variant_id
    AND ${alias}.category_id = ${decision}.category_id
    AND ${alias}.changed_fields = ${decision}.changed_fields
    AND ${alias}.original_updated_at = ${decision}.expected_updated_at
    AND ${alias}.applied_updated_at IS NOT NULL
    AND ${alias}.applied_updated_at > ${alias}.original_updated_at
    AND ${alias}.allergens IS NOT DISTINCT FROM ${decision}.expected_allergens
    AND ${alias}.may_contain_allergens IS NOT DISTINCT FROM ${decision}.expected_may_contain_allergens
    AND ${alias}.storage_zone IS NOT DISTINCT FROM ${decision}.expected_storage_zone
    AND ${alias}.nutrition_facts IS NOT DISTINCT FROM ${decision}.expected_nutrition_facts
    AND ${alias}.country_of_origin IS NOT DISTINCT FROM ${decision}.expected_country_of_origin
    AND ${alias}.ingredients IS NOT DISTINCT FROM ${decision}.expected_ingredients
    AND ${alias}.price_per_unit IS NOT DISTINCT FROM ${decision}.expected_price_per_unit
    AND ${alias}.unit_of_measure IS NOT DISTINCT FROM ${decision}.expected_unit_of_measure`;
}

function writeApply(filePath, decisions, decisionSha) {
  const count = decisions.products.length;
  const sql = `${commonSql(decisions, decisionSha, 'apply')}
DO $$
DECLARE affected integer;
BEGIN
  IF (SELECT COUNT(*) FROM _adg_metadata_target_salon) <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one active pinned asiandeligo channel';
  END IF;
  IF (SELECT COUNT(*) FROM _adg_metadata_decisions) <> ${count} THEN
    RAISE EXCEPTION 'Expected exactly ${count} metadata decisions';
  END IF;
  IF to_regclass('public.${PRODUCT_BACKUP_TABLE}') IS NOT NULL
     OR to_regclass('public.${AUDIT_TABLE}') IS NOT NULL THEN
    RAISE EXCEPTION 'Batch backup/audit table already exists; refusing duplicate apply';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger
    WHERE tgrelid = 'public.products'::regclass
      AND tgname = 'zz_enforce_products_monotonic_updated_at'
      AND NOT tgisinternal
      AND tgenabled = 'O'
  ) THEN
    RAISE EXCEPTION 'Required products monotonic updated_at trigger is missing';
  END IF;

  PERFORM 1
  FROM _adg_metadata_decisions decision
  CROSS JOIN _adg_metadata_target_salon tenant
  JOIN public.product_variants variant
    ON variant.id = decision.variant_id
   AND variant.sku = decision.sku
   AND variant.salon_id = tenant.salon_id
   AND variant.is_active = TRUE
   AND variant.is_published = FALSE
   AND variant.is_for_sale = TRUE
   AND variant.sync_status = 'synced'
   AND variant.availability_status = 'IN_STOCK'
   AND variant.deleted_at IS NULL
  JOIN public.products product
    ON product.id = decision.product_id
   AND product.id = variant.template_id
   AND product.salon_id = tenant.salon_id
   AND product.name = decision.expected_name
   AND product.slug = decision.expected_slug
   AND product.updated_at = decision.expected_updated_at
   AND product.is_active = TRUE
   AND product.is_published = TRUE
   AND product.is_visible = TRUE
   AND product.status = 'active'
   AND product.deleted_at IS NULL
  JOIN public.categories category
    ON category.id = decision.category_id
   AND category.id = product.category_id
   AND category.salon_id = tenant.salon_id
   AND category.name = decision.category_name
   AND category.slug = decision.category_slug
   AND category.is_active = TRUE
  WHERE ${exactExpectedPredicate()}
  ORDER BY product.id
  FOR UPDATE OF product, variant, category;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> ${count} THEN
    RAISE EXCEPTION 'Expected ${count} exact product row locks, got %', affected;
  END IF;
END $$;

CREATE TABLE ${PRODUCT_BACKUP_RELATION} (
  batch_key text NOT NULL CHECK (batch_key = '${EXPECTED_BATCH}'),
  decision_sha256 text NOT NULL CHECK (decision_sha256 = '${decisionSha}'),
  channel_slug text NOT NULL CHECK (channel_slug = '${EXPECTED_CHANNEL}'),
  salon_id uuid NOT NULL CHECK (salon_id = '${EXPECTED_SALON_ID}'::uuid),
  sku text NOT NULL,
  product_id uuid NOT NULL,
  variant_id uuid NOT NULL,
  category_id uuid NOT NULL,
  changed_fields text[] NOT NULL,
  allergens jsonb,
  may_contain_allergens jsonb,
  storage_zone text,
  nutrition_facts jsonb,
  country_of_origin text,
  ingredients text,
  price_per_unit numeric,
  unit_of_measure text,
  original_updated_at timestamptz NOT NULL,
  applied_updated_at timestamptz,
  captured_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  PRIMARY KEY (batch_key, salon_id, sku),
  UNIQUE (batch_key, salon_id, product_id),
  UNIQUE (batch_key, salon_id, variant_id)
);

CREATE TABLE ${AUDIT_RELATION} (
  batch_key text NOT NULL CHECK (batch_key = '${EXPECTED_BATCH}'),
  decision_sha256 text NOT NULL CHECK (decision_sha256 = '${decisionSha}'),
  channel_slug text NOT NULL CHECK (channel_slug = '${EXPECTED_CHANNEL}'),
  salon_id uuid NOT NULL CHECK (salon_id = '${EXPECTED_SALON_ID}'::uuid),
  action text NOT NULL CHECK (action IN ('backup_captured', 'apply_complete', 'rollback_complete')),
  product_rows integer NOT NULL CHECK (product_rows = ${count}),
  transaction_id bigint NOT NULL DEFAULT txid_current(),
  recorded_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  PRIMARY KEY (batch_key, salon_id, action)
);

DO $$
DECLARE affected integer;
BEGIN
  INSERT INTO ${PRODUCT_BACKUP_RELATION} (
    batch_key, decision_sha256, channel_slug, salon_id, sku,
    product_id, variant_id, category_id, changed_fields,
    allergens, may_contain_allergens, storage_zone, nutrition_facts,
    country_of_origin, ingredients, price_per_unit, unit_of_measure,
    original_updated_at
  )
  SELECT
    '${EXPECTED_BATCH}', '${decisionSha}', tenant.channel_slug, tenant.salon_id,
    decision.sku, product.id, variant.id, category.id, decision.changed_fields,
    product.allergens, product.may_contain_allergens, product.storage_zone,
    product.nutrition_facts, product.country_of_origin, product.ingredients,
    product.price_per_unit, product.unit_of_measure, product.updated_at
  FROM _adg_metadata_decisions decision
  CROSS JOIN _adg_metadata_target_salon tenant
  JOIN public.product_variants variant
    ON variant.id = decision.variant_id
   AND variant.sku = decision.sku
   AND variant.salon_id = tenant.salon_id
   AND variant.deleted_at IS NULL
  JOIN public.products product
    ON product.id = decision.product_id
   AND product.id = variant.template_id
   AND product.salon_id = tenant.salon_id
   AND product.updated_at = decision.expected_updated_at
   AND product.deleted_at IS NULL
  JOIN public.categories category
    ON category.id = decision.category_id
   AND category.id = product.category_id
   AND category.salon_id = tenant.salon_id
   AND category.is_active = TRUE
  WHERE ${exactExpectedPredicate()};
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> ${count} THEN
    RAISE EXCEPTION 'Expected ${count} persistent product backup rows, got %', affected;
  END IF;

  INSERT INTO ${AUDIT_RELATION} (
    batch_key, decision_sha256, channel_slug, salon_id, action, product_rows
  )
  SELECT '${EXPECTED_BATCH}', '${decisionSha}', channel_slug, salon_id,
         'backup_captured', ${count}
  FROM _adg_metadata_target_salon;
END $$;

DO $$
DECLARE affected integer;
BEGIN
  UPDATE public.products product
  SET allergens = decision.target_allergens,
      may_contain_allergens = decision.target_may_contain_allergens,
      storage_zone = decision.target_storage_zone,
      nutrition_facts = decision.target_nutrition_facts,
      country_of_origin = decision.target_country_of_origin,
      ingredients = decision.target_ingredients
  FROM _adg_metadata_decisions decision,
       _adg_metadata_target_salon tenant,
       ${PRODUCT_BACKUP_RELATION} backup
  WHERE product.id = decision.product_id
    AND product.id = backup.product_id
    AND product.salon_id = tenant.salon_id
    AND backup.salon_id = tenant.salon_id
    AND backup.batch_key = '${EXPECTED_BATCH}'
    AND backup.decision_sha256 = '${decisionSha}'
    AND backup.sku = decision.sku
    AND product.updated_at = decision.expected_updated_at
    AND product.deleted_at IS NULL
    AND ${exactExpectedPredicate()};
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> ${count} THEN
    RAISE EXCEPTION 'Expected ${count} exact product updates, got %', affected;
  END IF;

  UPDATE ${PRODUCT_BACKUP_RELATION} backup
  SET applied_updated_at = product.updated_at
  FROM public.products product,
       _adg_metadata_decisions decision,
       _adg_metadata_target_salon tenant
  WHERE backup.batch_key = '${EXPECTED_BATCH}'
    AND backup.decision_sha256 = '${decisionSha}'
    AND backup.salon_id = tenant.salon_id
    AND backup.sku = decision.sku
    AND backup.product_id = product.id
    AND product.salon_id = tenant.salon_id
    AND product.updated_at > backup.original_updated_at
    AND product.deleted_at IS NULL
    AND ${exactTargetPredicate()};
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> ${count} THEN
    RAISE EXCEPTION 'Expected ${count} applied updated_at captures, got %', affected;
  END IF;

  INSERT INTO ${AUDIT_RELATION} (
    batch_key, decision_sha256, channel_slug, salon_id, action, product_rows
  )
  SELECT '${EXPECTED_BATCH}', '${decisionSha}', channel_slug, salon_id,
         'apply_complete', ${count}
  FROM _adg_metadata_target_salon;
END $$;

SELECT backup.sku, backup.changed_fields, backup.original_updated_at,
       backup.applied_updated_at, audit.transaction_id
FROM ${PRODUCT_BACKUP_RELATION} backup
JOIN ${AUDIT_RELATION} audit
  ON audit.batch_key = backup.batch_key
 AND audit.salon_id = backup.salon_id
 AND audit.action = 'apply_complete'
WHERE backup.batch_key = '${EXPECTED_BATCH}'
  AND backup.decision_sha256 = '${decisionSha}'
  AND backup.salon_id = '${EXPECTED_SALON_ID}'::uuid
ORDER BY backup.sku;

COMMIT;
`;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, sql);
}

function writeRollback(filePath, decisions, decisionSha) {
  const count = decisions.products.length;
  const sql = `${commonSql(decisions, decisionSha, 'roll back')}
DO $$
DECLARE affected integer;
BEGIN
  IF (SELECT COUNT(*) FROM _adg_metadata_target_salon) <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one active pinned asiandeligo channel';
  END IF;
  IF to_regclass('public.${PRODUCT_BACKUP_TABLE}') IS NULL
     OR to_regclass('public.${AUDIT_TABLE}') IS NULL THEN
    RAISE EXCEPTION 'Required batch backup/audit table is missing';
  END IF;
  IF (
    SELECT COUNT(*)
    FROM ${PRODUCT_BACKUP_RELATION}
    WHERE batch_key = '${EXPECTED_BATCH}'
      AND decision_sha256 = '${decisionSha}'
      AND salon_id = '${EXPECTED_SALON_ID}'::uuid
  ) <> ${count} THEN
    RAISE EXCEPTION 'Expected exactly ${count} tenant- and decision-scoped backup rows';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM ${AUDIT_RELATION}
    WHERE batch_key = '${EXPECTED_BATCH}'
      AND decision_sha256 = '${decisionSha}'
      AND salon_id = '${EXPECTED_SALON_ID}'::uuid
      AND action = 'backup_captured'
      AND product_rows = ${count}
  ) OR NOT EXISTS (
    SELECT 1 FROM ${AUDIT_RELATION}
    WHERE batch_key = '${EXPECTED_BATCH}'
      AND decision_sha256 = '${decisionSha}'
      AND salon_id = '${EXPECTED_SALON_ID}'::uuid
      AND action = 'apply_complete'
      AND product_rows = ${count}
  ) OR EXISTS (
    SELECT 1 FROM ${AUDIT_RELATION}
    WHERE batch_key = '${EXPECTED_BATCH}'
      AND decision_sha256 = '${decisionSha}'
      AND salon_id = '${EXPECTED_SALON_ID}'::uuid
      AND action = 'rollback_complete'
  ) THEN
    RAISE EXCEPTION 'Required apply audit chain is incomplete or rollback already completed';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger
    WHERE tgrelid = 'public.products'::regclass
      AND tgname = 'zz_enforce_products_monotonic_updated_at'
      AND NOT tgisinternal
      AND tgenabled = 'O'
  ) OR EXISTS (
    SELECT 1
    FROM _adg_metadata_decisions decision
    CROSS JOIN _adg_metadata_target_salon tenant
    LEFT JOIN ${PRODUCT_BACKUP_RELATION} backup
      ON backup.batch_key = '${EXPECTED_BATCH}'
     AND backup.decision_sha256 = '${decisionSha}'
     AND backup.salon_id = tenant.salon_id
     AND backup.sku = decision.sku
     AND ${exactBackupPredicate()}
    WHERE backup.sku IS NULL
  ) THEN
    RAISE EXCEPTION 'Required timestamp trigger or exact reviewed backup snapshot is missing';
  END IF;

  PERFORM 1
  FROM _adg_metadata_decisions decision
  CROSS JOIN _adg_metadata_target_salon tenant
  JOIN ${PRODUCT_BACKUP_RELATION} backup
    ON backup.batch_key = '${EXPECTED_BATCH}'
   AND backup.decision_sha256 = '${decisionSha}'
   AND backup.salon_id = tenant.salon_id
   AND backup.sku = decision.sku
   AND ${exactBackupPredicate()}
  JOIN public.product_variants variant
    ON variant.id = decision.variant_id
    AND variant.sku = decision.sku
    AND variant.salon_id = tenant.salon_id
   AND variant.is_active = TRUE
   AND variant.is_published = FALSE
   AND variant.is_for_sale = TRUE
   AND variant.sync_status = 'synced'
   AND variant.availability_status = 'IN_STOCK'
    AND variant.deleted_at IS NULL
  JOIN public.products product
    ON product.id = decision.product_id
    AND product.id = variant.template_id
    AND product.salon_id = tenant.salon_id
   AND product.name = decision.expected_name
   AND product.slug = decision.expected_slug
    AND product.updated_at = backup.applied_updated_at
   AND product.is_active = TRUE
   AND product.is_published = TRUE
   AND product.is_visible = TRUE
   AND product.status = 'active'
    AND product.deleted_at IS NULL
  JOIN public.categories category
    ON category.id = decision.category_id
   AND category.id = product.category_id
   AND category.salon_id = tenant.salon_id
   AND category.name = decision.category_name
   AND category.slug = decision.category_slug
   AND category.is_active = TRUE
  WHERE ${exactTargetPredicate()}
  ORDER BY product.id
  FOR UPDATE OF product, variant, category;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> ${count} THEN
    RAISE EXCEPTION 'Expected ${count} exact target row locks; refusing to overwrite intervening edits';
  END IF;
END $$;

DO $$
DECLARE affected integer;
BEGIN
  UPDATE public.products product
  SET allergens = backup.allergens,
      may_contain_allergens = backup.may_contain_allergens,
      storage_zone = backup.storage_zone,
      nutrition_facts = backup.nutrition_facts,
      country_of_origin = backup.country_of_origin,
      ingredients = backup.ingredients
  FROM _adg_metadata_decisions decision,
       _adg_metadata_target_salon tenant,
       ${PRODUCT_BACKUP_RELATION} backup
  WHERE backup.batch_key = '${EXPECTED_BATCH}'
    AND backup.decision_sha256 = '${decisionSha}'
    AND backup.salon_id = tenant.salon_id
    AND backup.sku = decision.sku
    AND backup.product_id = product.id
    AND product.salon_id = tenant.salon_id
    AND product.name = decision.expected_name
    AND product.slug = decision.expected_slug
    AND product.updated_at = backup.applied_updated_at
    AND product.is_active = TRUE
    AND product.is_published = TRUE
    AND product.is_visible = TRUE
    AND product.status = 'active'
    AND product.deleted_at IS NULL
    AND ${exactBackupPredicate()}
    AND ${exactTargetPredicate()};
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> ${count} THEN
    RAISE EXCEPTION 'Expected ${count} exact product restorations, got %', affected;
  END IF;

  IF (
    SELECT COUNT(*)
    FROM public.products product
    JOIN ${PRODUCT_BACKUP_RELATION} backup
      ON backup.product_id = product.id
     AND backup.batch_key = '${EXPECTED_BATCH}'
     AND backup.decision_sha256 = '${decisionSha}'
     AND backup.salon_id = product.salon_id
    WHERE product.salon_id = '${EXPECTED_SALON_ID}'::uuid
      AND product.updated_at > backup.applied_updated_at
      AND product.allergens IS NOT DISTINCT FROM backup.allergens
      AND product.may_contain_allergens IS NOT DISTINCT FROM backup.may_contain_allergens
      AND product.storage_zone IS NOT DISTINCT FROM backup.storage_zone
      AND product.nutrition_facts IS NOT DISTINCT FROM backup.nutrition_facts
      AND product.country_of_origin IS NOT DISTINCT FROM backup.country_of_origin
      AND product.ingredients IS NOT DISTINCT FROM backup.ingredients
      AND product.price_per_unit IS NOT DISTINCT FROM backup.price_per_unit
      AND product.unit_of_measure IS NOT DISTINCT FROM backup.unit_of_measure
  ) <> ${count} THEN
    RAISE EXCEPTION 'Rollback post-state verification failed';
  END IF;

  INSERT INTO ${AUDIT_RELATION} (
    batch_key, decision_sha256, channel_slug, salon_id, action, product_rows
  )
  SELECT '${EXPECTED_BATCH}', '${decisionSha}', channel_slug, salon_id,
         'rollback_complete', ${count}
  FROM _adg_metadata_target_salon;
END $$;

SELECT backup.sku, backup.changed_fields, audit.recorded_at, audit.transaction_id
FROM ${PRODUCT_BACKUP_RELATION} backup
JOIN ${AUDIT_RELATION} audit
  ON audit.batch_key = backup.batch_key
 AND audit.salon_id = backup.salon_id
 AND audit.action = 'rollback_complete'
WHERE backup.batch_key = '${EXPECTED_BATCH}'
  AND backup.decision_sha256 = '${decisionSha}'
  AND backup.salon_id = '${EXPECTED_SALON_ID}'::uuid
ORDER BY backup.sku;

COMMIT;
`;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, sql);
}

function writePlan(filePath, decisions, decisionSha, applyPath, rollbackPath) {
  const counts = Object.fromEntries(MUTABLE_FIELDS.map((field) => [field, 0]));
  for (const row of decisions.products) {
    for (const field of row.changedFields) counts[field] += 1;
  }
  const lines = [
    '# Asia Deli Go catalog metadata batch 8',
    '',
    `Prepared: ${decisions.preparedAt}`,
    `Batch: \`${decisions.batch}\``,
    `Decision SHA-256: \`${decisionSha}\``,
    '',
    '## Result',
    '',
    `- Reviewed cohort: ${decisions.cohortSkus.length} exact SKUs.`,
    `- High-confidence product transitions: ${decisions.products.length}.`,
    `- Evidence/conflict/no-op holds: ${decisions.holds.length}.`,
    '- Stock quantity is explicitly outside this batch and remains unchanged.',
    '- Production mutation in this preparation step: none.',
    '',
    '## Field changes',
    '',
    '| Field | Products |',
    '| --- | ---: |',
    ...MUTABLE_FIELDS.map((field) => `| ${field} | ${counts[field]} |`),
    '',
    '## Approved transitions',
    '',
    '| SKU | Product | Changed fields | Reason |',
    '| --- | --- | --- | --- |',
    ...decisions.products.map((row) => `| ${row.sku} | ${row.name.replaceAll('|', '/')} | ${row.changedFields.join(', ')} | ${row.reason.replaceAll('|', '/')} |`),
    '',
    '## Holds',
    '',
    '| SKU | Reason |',
    '| --- | --- |',
    ...decisions.holds.map((row) => `| ${row.sku} | ${row.reason.replaceAll('|', '/')} |`),
    '',
    '## Guardrails',
    '',
    `- Tenant is pinned to \`${EXPECTED_SALON_ID}\` and active channel \`${EXPECTED_CHANNEL}\`.`,
    '- Apply is SERIALIZABLE, locks exact current product rows, and requires exact IDs, SKU, name, slug, category, status, metadata snapshot, and updated_at.',
    '- Persistent explicit-column backup and uniquely keyed batch audit rows are created before mutation.',
    '- Only products metadata columns are updated; product_variants, categories, prices, stock, publication, and identifiers are unchanged.',
    '- Rollback requires the exact applied snapshot and applied_updated_at, so it refuses intervening edits.',
    '- SQL never deletes rows, drops tables, or manually assigns products.updated_at.',
    '',
    '## JOIN contract',
    '',
    '- `product_variants.template_id (uuid) = products.id (uuid)` — declared FK and sampled on production.',
    '- `products.category_id (uuid) = categories.id (uuid)` — declared FK and sampled on production.',
    '- All four business tables are independently tenant-scoped; products and variants exclude soft-deleted rows.',
    '',
    '## Recovery evidence',
    '',
    `- Product backup: \`${PRODUCT_BACKUP_TABLE}\`.`,
    `- Audit log: \`${AUDIT_TABLE}\`.`,
    `- Apply SQL: \`${applyPath}\`.`,
    `- Rollback SQL: \`${rollbackPath}\`.`,
    '',
  ];
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, lines.join('\n'));
}

function main() {
  const options = parseArgs();
  const decisionBytes = fs.readFileSync(options.input);
  const decisions = validateDecisions(JSON.parse(decisionBytes));
  const decisionSha = crypto.createHash('sha256').update(decisionBytes).digest('hex');
  writeApply(options.apply, decisions, decisionSha);
  writeRollback(options.rollback, decisions, decisionSha);
  writePlan(options.output, decisions, decisionSha, options.apply, options.rollback);
  console.log(`Validated ${decisions.products.length} transitions + ${decisions.holds.length} holds.`);
  console.log(`Decision SHA-256: ${decisionSha}`);
  console.log(`Wrote ${options.output}`);
  console.log(`Wrote ${options.apply}`);
  console.log(`Wrote ${options.rollback}`);
}

const isDirectExecution = process.argv[1]
  && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href;

if (isDirectExecution) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
