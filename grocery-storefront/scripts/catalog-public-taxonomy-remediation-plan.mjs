#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_INPUT = 'docs/asiandeligo-public-taxonomy-decisions-20260720-v2.json';
const DEFAULT_OUTPUT = 'docs/asiandeligo-public-taxonomy-remediation-20260720-v2.md';
const DEFAULT_APPLY = 'docs/asiandeligo-public-taxonomy-remediation-apply-20260720-v2.sql';
const DEFAULT_ROLLBACK = 'docs/asiandeligo-public-taxonomy-remediation-rollback-20260720-v2.sql';

const EXPECTED_BATCH = 'asiandeligo-public-taxonomy-backup-20260720-v1';
const EXPECTED_SALON_ID = 'e73271a9-53e3-4a20-a02e-791726b452aa';
const EXPECTED_MAPPINGS = new Map([
  ['ADG-000103', ['unmapped', 'sosy-marynaty']],
  ['ADG-000277', ['pozostałe-produkty', 'ryż-i-inne-ziarna']],
  ['ADG-000393', ['unmapped', 'ryż-i-inne-ziarna']],
  ['ADG-000607', ['kategoria-tymczasowa', 'prezenty']],
  ['ADG-000641', ['unmapped', 'pasty-smakowe']],
  ['ADG-000648', ['unmapped', 'pasty-smakowe']],
  ['ADG-000690', ['kategoria-tymczasowa', 'przyprawy']],
  ['ADG-000781', ['unmapped', 'ryż-i-inne-ziarna']],
  ['ADG-000791', ['unmapped', 'buliony']],
  ['ADG-001694', ['kategoria-tymczasowa', 'przyprawy']],
]);
const EXPECTED_MEDIUM_CONFIDENCE_SKUS = new Set(['ADG-000277', 'ADG-000641']);
const EXPECTED_CATEGORY_STATES = new Map([
  ['kategoria-tymczasowa', [true, false, 3]],
  ['unmapped', [true, false, 6]],
]);
const EXPECTED_RETAINED_CATEGORY_CHECKS = new Map([
  ['pozostałe-produkty', [true, 7, 6]],
]);
const FORBIDDEN_DUPLICATE_MERGE_SKUS = new Set([
  'ADG-000527',
  'ADG-000528',
  'ADG-000529',
  'ADG-000530',
  'ADG-000668',
  'ADG-001413',
  'ADG-001414',
  'ADG-001712',
]);
const FORBIDDEN_CATEGORY_STATE_SLUGS = new Set([
  'pozostałe-produkty',
  'sosy-i-marynaty',
  'sosy-sojowe',
]);

const PRODUCT_BACKUP_TABLE = 'asiandeligo_public_taxonomy_product_backup_20260720';
const CATEGORY_BACKUP_TABLE = 'asiandeligo_public_taxonomy_category_backup_20260720';
const AUDIT_TABLE = 'asiandeligo_public_taxonomy_audit_20260720';

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

function validate(decisions) {
  if (decisions.version !== 2 || decisions.channel !== 'asiandeligo') {
    throw new Error('Unsupported public-taxonomy decision file or channel');
  }
  if (decisions.batch !== EXPECTED_BATCH) {
    throw new Error(`Expected the unique backup batch ${EXPECTED_BATCH}`);
  }
  if (decisions.salonId !== EXPECTED_SALON_ID) {
    throw new Error(`Expected the production Asia Deli Go salon ${EXPECTED_SALON_ID}`);
  }
  if (!Number.isFinite(Date.parse(decisions.preparedAt))) {
    throw new Error('preparedAt must be an ISO timestamp');
  }
  if (decisions.categoryMoves?.length !== EXPECTED_MAPPINGS.size) {
    throw new Error(`Expected exactly ${EXPECTED_MAPPINGS.size} public-category moves`);
  }
  if (decisions.categoryStateChanges?.length !== EXPECTED_CATEGORY_STATES.size) {
    throw new Error(`Expected exactly ${EXPECTED_CATEGORY_STATES.size} category state changes`);
  }
  if (decisions.retainedCategoryChecks?.length !== EXPECTED_RETAINED_CATEGORY_CHECKS.size) {
    throw new Error(`Expected exactly ${EXPECTED_RETAINED_CATEGORY_CHECKS.size} retained-category check`);
  }

  assertUnique(decisions.categoryMoves, 'sku', 'categoryMoves');
  assertUnique(decisions.categoryStateChanges, 'slug', 'categoryStateChanges');
  assertUnique(decisions.retainedCategoryChecks, 'slug', 'retainedCategoryChecks');

  for (const row of decisions.categoryMoves) {
    const expected = EXPECTED_MAPPINGS.get(row.sku);
    if (!expected) {
      throw new Error(`Unexpected or duplicate-merge SKU in v2 scope: ${row.sku}`);
    }
    if (FORBIDDEN_DUPLICATE_MERGE_SKUS.has(row.sku)) {
      throw new Error(`Duplicate-category merge SKU is forbidden in v2: ${row.sku}`);
    }
    if (!row.name || !row.reason || row.mappingType !== 'business') {
      throw new Error(`Incomplete business mapping for ${row.sku}`);
    }
    if (row.expectedCategorySlug !== expected[0] || row.targetCategorySlug !== expected[1]) {
      throw new Error(`Unexpected semantic mapping for ${row.sku}`);
    }
    const expectedConfidence = EXPECTED_MEDIUM_CONFIDENCE_SKUS.has(row.sku) ? 'medium' : 'high';
    if (row.confidence !== expectedConfidence) {
      throw new Error(`Expected ${expectedConfidence} confidence for ${row.sku}`);
    }
  }

  for (const [sku] of EXPECTED_MAPPINGS) {
    if (!decisions.categoryMoves.some((row) => row.sku === sku)) {
      throw new Error(`Missing required v2 SKU ${sku}`);
    }
  }

  for (const row of decisions.categoryStateChanges) {
    const expected = EXPECTED_CATEGORY_STATES.get(row.slug);
    if (!expected || FORBIDDEN_CATEGORY_STATE_SLUGS.has(row.slug)) {
      throw new Error(`Unexpected category state change in v2: ${row.slug}`);
    }
    if (
      row.expectedActive !== expected[0]
      || row.targetActive !== expected[1]
      || row.expectedProductsBeforeMove !== expected[2]
    ) {
      throw new Error(`Unexpected state transition for ${row.slug}`);
    }
  }

  for (const row of decisions.retainedCategoryChecks) {
    const expected = EXPECTED_RETAINED_CATEGORY_CHECKS.get(row.slug);
    if (
      !expected
      || row.expectedActive !== expected[0]
      || row.expectedProductsBeforeMove !== expected[1]
      || row.expectedProductsAfterMove !== expected[2]
    ) {
      throw new Error(`Unexpected retained-category check for ${row.slug}`);
    }
  }
}

function renderMoveValues(decisions) {
  return decisions.categoryMoves.map((row) => (
    `  (${sqlLiteral(row.sku)}, ${sqlLiteral(row.expectedCategorySlug)}, ${sqlLiteral(row.targetCategorySlug)}, ${sqlLiteral(row.mappingType)}, ${sqlLiteral(row.confidence)})`
  )).join(',\n');
}

function renderCategoryStateValues(decisions) {
  return decisions.categoryStateChanges.map((row) => (
    `  (${sqlLiteral(row.slug)}, ${sqlBoolean(row.expectedActive)}, ${sqlBoolean(row.targetActive)}, ${row.expectedProductsBeforeMove})`
  )).join(',\n');
}

function renderRetainedCategoryValues(decisions) {
  return decisions.retainedCategoryChecks.map((row) => (
    `  (${sqlLiteral(row.slug)}, ${sqlBoolean(row.expectedActive)}, ${row.expectedProductsBeforeMove}, ${row.expectedProductsAfterMove})`
  )).join(',\n');
}

function renderPreamble(decisions, action) {
  return `-- Generated by scripts/catalog-public-taxonomy-remediation-plan.mjs
-- Purpose: ${action} the exact-ten Asia Deli Go public-category coverage remediation.
-- Batch: ${decisions.batch}
-- No product price, stock, content, publication, order, reservation, or translation field is changed.
-- No row is deleted. Historical duplicate-category consolidation is outside this batch.
--
-- JOIN contract (schema-introspect verified against production 2026-07-20):
--   product_variants.template_id (uuid) = products.id (uuid), FK declared.
--   products.category_id (uuid) = categories.id (uuid), FK declared.
--   channels.salon_id/categories.salon_id/products.salon_id/product_variants.salon_id are uuid.
-- Assumptions:
--   1. Every canonical business-table join is scoped by the one active asiandeligo salon_id.
--   2. Products and variants exclude deleted_at rows and must remain active/published for mutation.
--   3. The dated backup tables below are intentional recovery artifacts, never canonical product sources.

\\set ON_ERROR_STOP on
BEGIN;
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';
SET LOCAL search_path = public, pg_catalog;

CREATE TEMP TABLE _adg_public_taxonomy_target_salon (salon_id uuid PRIMARY KEY) ON COMMIT DROP;
INSERT INTO _adg_public_taxonomy_target_salon (salon_id)
SELECT salon_id
FROM channels
WHERE salon_id = ${sqlLiteral(decisions.salonId)}::uuid
  AND slug = ${sqlLiteral(decisions.channel)}
  AND is_active = TRUE;

CREATE TEMP TABLE _adg_public_taxonomy_run (
  batch_key text PRIMARY KEY,
  channel_slug text NOT NULL,
  salon_id uuid NOT NULL UNIQUE,
  recorded_at timestamptz NOT NULL
) ON COMMIT DROP;
INSERT INTO _adg_public_taxonomy_run (batch_key, channel_slug, salon_id, recorded_at)
SELECT ${sqlLiteral(decisions.batch)}, ${sqlLiteral(decisions.channel)}, salon_id, transaction_timestamp()
FROM _adg_public_taxonomy_target_salon;

CREATE TEMP TABLE _adg_public_taxonomy_moves (
  sku text PRIMARY KEY,
  source_category_slug text NOT NULL,
  target_category_slug text NOT NULL,
  mapping_type text NOT NULL CHECK (mapping_type = 'business'),
  confidence text NOT NULL CHECK (confidence IN ('high', 'medium'))
) ON COMMIT DROP;
INSERT INTO _adg_public_taxonomy_moves (
  sku, source_category_slug, target_category_slug, mapping_type, confidence
) VALUES
${renderMoveValues(decisions)};

CREATE TEMP TABLE _adg_public_taxonomy_category_state (
  slug text PRIMARY KEY,
  original_active boolean NOT NULL,
  target_active boolean NOT NULL,
  expected_products_before integer NOT NULL
) ON COMMIT DROP;
INSERT INTO _adg_public_taxonomy_category_state (
  slug, original_active, target_active, expected_products_before
) VALUES
${renderCategoryStateValues(decisions)};

CREATE TEMP TABLE _adg_public_taxonomy_retained_category (
  slug text PRIMARY KEY,
  expected_active boolean NOT NULL,
  expected_products_before integer NOT NULL,
  expected_products_after integer NOT NULL
) ON COMMIT DROP;
INSERT INTO _adg_public_taxonomy_retained_category (
  slug, expected_active, expected_products_before, expected_products_after
) VALUES
${renderRetainedCategoryValues(decisions)};
`;
}

function renderApplySql(decisions) {
  return `${renderPreamble(decisions, 'apply')}
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM _adg_public_taxonomy_target_salon) <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one active Asia Deli Go channel';
  END IF;
  IF (SELECT COUNT(*) FROM _adg_public_taxonomy_moves) <> ${decisions.categoryMoves.length} THEN
    RAISE EXCEPTION 'Expected exactly ${decisions.categoryMoves.length} public-category decisions';
  END IF;
  IF (SELECT COUNT(*) FROM _adg_public_taxonomy_category_state) <> ${decisions.categoryStateChanges.length} THEN
    RAISE EXCEPTION 'Expected exactly ${decisions.categoryStateChanges.length} category-state decisions';
  END IF;
  IF (SELECT COUNT(*) FROM _adg_public_taxonomy_retained_category) <> ${decisions.retainedCategoryChecks.length} THEN
    RAISE EXCEPTION 'Expected exactly ${decisions.retainedCategoryChecks.length} retained-category check';
  END IF;

  IF EXISTS (
    SELECT state.slug
    FROM _adg_public_taxonomy_category_state state
    CROSS JOIN _adg_public_taxonomy_target_salon tenant
    LEFT JOIN categories category
      ON category.salon_id = tenant.salon_id
     AND category.slug = state.slug
    LEFT JOIN products product
      ON product.salon_id = tenant.salon_id
     AND product.category_id = category.id
     AND product.deleted_at IS NULL
    GROUP BY state.slug, state.original_active, state.expected_products_before
    HAVING COUNT(DISTINCT category.id) <> 1
       OR BOOL_OR(category.is_active) IS DISTINCT FROM state.original_active
       OR COUNT(DISTINCT product.id) <> state.expected_products_before
  ) THEN
    RAISE EXCEPTION 'Source category state precondition failed; aborting all changes';
  END IF;

  IF EXISTS (
    SELECT retained.slug
    FROM _adg_public_taxonomy_retained_category retained
    CROSS JOIN _adg_public_taxonomy_target_salon tenant
    LEFT JOIN categories category
      ON category.salon_id = tenant.salon_id
     AND category.slug = retained.slug
    LEFT JOIN products product
      ON product.salon_id = tenant.salon_id
     AND product.category_id = category.id
     AND product.deleted_at IS NULL
    GROUP BY retained.slug, retained.expected_active, retained.expected_products_before
    HAVING COUNT(DISTINCT category.id) <> 1
       OR BOOL_OR(category.is_active) IS DISTINCT FROM retained.expected_active
       OR COUNT(DISTINCT product.id) <> retained.expected_products_before
  ) THEN
    RAISE EXCEPTION 'Retained category before-count precondition failed; aborting all changes';
  END IF;

  IF EXISTS (
    SELECT move.sku
    FROM _adg_public_taxonomy_moves move
    CROSS JOIN _adg_public_taxonomy_target_salon tenant
    LEFT JOIN product_variants variant
      ON variant.salon_id = tenant.salon_id
     AND variant.sku = move.sku
     AND variant.is_active = TRUE
     AND variant.deleted_at IS NULL
    LEFT JOIN products product
      ON product.salon_id = tenant.salon_id
     AND product.id = variant.template_id
     AND product.is_active = TRUE
     AND product.is_published = TRUE
     AND product.deleted_at IS NULL
    LEFT JOIN categories source_category
      ON source_category.salon_id = tenant.salon_id
     AND source_category.id = product.category_id
    LEFT JOIN categories target_category
      ON target_category.salon_id = tenant.salon_id
     AND target_category.slug = move.target_category_slug
    GROUP BY move.sku, move.source_category_slug
    HAVING COUNT(DISTINCT variant.id) <> 1
       OR COUNT(DISTINCT product.id) <> 1
       OR COUNT(DISTINCT source_category.id) <> 1
       OR MIN(source_category.slug) IS DISTINCT FROM move.source_category_slug
       OR BOOL_OR(source_category.is_active) IS DISTINCT FROM TRUE
       OR COUNT(DISTINCT target_category.id) <> 1
       OR BOOL_OR(target_category.is_active) IS DISTINCT FROM TRUE
  ) THEN
    RAISE EXCEPTION 'Product/category mapping precondition failed; aborting all changes';
  END IF;
END $$;

CREATE TABLE ${PRODUCT_BACKUP_TABLE} (
  batch_key text NOT NULL CHECK (batch_key = ${sqlLiteral(decisions.batch)}),
  channel_slug text NOT NULL CHECK (channel_slug = 'asiandeligo'),
  salon_id uuid NOT NULL CHECK (salon_id = ${sqlLiteral(decisions.salonId)}::uuid),
  captured_at timestamptz NOT NULL,
  product_id uuid NOT NULL,
  variant_id uuid NOT NULL,
  sku text NOT NULL,
  original_category_id uuid NOT NULL,
  original_category_slug text NOT NULL,
  target_category_id uuid NOT NULL,
  target_category_slug text NOT NULL,
  mapping_type text NOT NULL CHECK (mapping_type = 'business'),
  confidence text NOT NULL CHECK (confidence IN ('high', 'medium')),
  PRIMARY KEY (batch_key, salon_id, product_id),
  UNIQUE (batch_key, salon_id, variant_id),
  UNIQUE (batch_key, salon_id, sku)
);

CREATE TABLE ${CATEGORY_BACKUP_TABLE} (
  batch_key text NOT NULL CHECK (batch_key = ${sqlLiteral(decisions.batch)}),
  channel_slug text NOT NULL CHECK (channel_slug = 'asiandeligo'),
  salon_id uuid NOT NULL CHECK (salon_id = ${sqlLiteral(decisions.salonId)}::uuid),
  captured_at timestamptz NOT NULL,
  category_id uuid NOT NULL,
  category_slug text NOT NULL,
  original_is_active boolean NOT NULL,
  target_is_active boolean NOT NULL,
  original_updated_at timestamptz NOT NULL,
  applied_updated_at timestamptz,
  product_count_before integer NOT NULL CHECK (product_count_before >= 0),
  CHECK (applied_updated_at IS NULL OR applied_updated_at > original_updated_at),
  PRIMARY KEY (batch_key, salon_id, category_id),
  UNIQUE (batch_key, salon_id, category_slug)
);

CREATE TABLE ${AUDIT_TABLE} (
  batch_key text NOT NULL CHECK (batch_key = ${sqlLiteral(decisions.batch)}),
  channel_slug text NOT NULL CHECK (channel_slug = 'asiandeligo'),
  salon_id uuid NOT NULL CHECK (salon_id = ${sqlLiteral(decisions.salonId)}::uuid),
  recorded_at timestamptz NOT NULL,
  action text NOT NULL CHECK (action IN ('backup_captured', 'apply_complete', 'rollback_complete')),
  product_rows integer NOT NULL CHECK (product_rows = ${decisions.categoryMoves.length}),
  category_rows integer NOT NULL CHECK (category_rows = ${decisions.categoryStateChanges.length}),
  PRIMARY KEY (batch_key, salon_id, action)
);

DO $$
DECLARE
  affected integer;
BEGIN
  INSERT INTO ${PRODUCT_BACKUP_TABLE} (
    batch_key, channel_slug, salon_id, captured_at, product_id, variant_id, sku,
    original_category_id, original_category_slug, target_category_id, target_category_slug,
    mapping_type, confidence
  )
  SELECT run.batch_key, run.channel_slug, run.salon_id, run.recorded_at,
         product.id, variant.id, variant.sku,
         source_category.id, source_category.slug, target_category.id, target_category.slug,
         move.mapping_type, move.confidence
  FROM _adg_public_taxonomy_run run
  JOIN _adg_public_taxonomy_moves move ON TRUE
  JOIN product_variants variant
    ON variant.salon_id = run.salon_id
   AND variant.sku = move.sku
   AND variant.is_active = TRUE
   AND variant.deleted_at IS NULL
  JOIN products product
    ON product.salon_id = run.salon_id
   AND product.id = variant.template_id
   AND product.is_active = TRUE
   AND product.is_published = TRUE
   AND product.deleted_at IS NULL
  JOIN categories source_category
    ON source_category.salon_id = run.salon_id
   AND source_category.id = product.category_id
   AND source_category.slug = move.source_category_slug
   AND source_category.is_active = TRUE
  JOIN categories target_category
    ON target_category.salon_id = run.salon_id
   AND target_category.slug = move.target_category_slug
   AND target_category.is_active = TRUE;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> ${decisions.categoryMoves.length} THEN
    RAISE EXCEPTION 'Expected ${decisions.categoryMoves.length} product backup rows, got %', affected;
  END IF;

  INSERT INTO ${CATEGORY_BACKUP_TABLE} (
    batch_key, channel_slug, salon_id, captured_at, category_id, category_slug,
    original_is_active, target_is_active, original_updated_at, product_count_before
  )
  SELECT run.batch_key, run.channel_slug, run.salon_id, run.recorded_at,
         category.id, category.slug, category.is_active, state.target_active,
         category.updated_at, state.expected_products_before
  FROM _adg_public_taxonomy_run run
  JOIN _adg_public_taxonomy_category_state state ON TRUE
  JOIN categories category
    ON category.salon_id = run.salon_id
   AND category.slug = state.slug
   AND category.is_active = state.original_active;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> ${decisions.categoryStateChanges.length} THEN
    RAISE EXCEPTION 'Expected ${decisions.categoryStateChanges.length} category backup rows, got %', affected;
  END IF;

  IF (
    SELECT COUNT(*) FROM ${PRODUCT_BACKUP_TABLE} backup
    JOIN _adg_public_taxonomy_run run
      ON backup.batch_key = run.batch_key
     AND backup.channel_slug = run.channel_slug
     AND backup.salon_id = run.salon_id
  ) <> ${decisions.categoryMoves.length} THEN
    RAISE EXCEPTION 'Persistent product backup count guard failed';
  END IF;
  IF (
    SELECT COUNT(*) FROM ${CATEGORY_BACKUP_TABLE} backup
    JOIN _adg_public_taxonomy_run run
      ON backup.batch_key = run.batch_key
     AND backup.channel_slug = run.channel_slug
     AND backup.salon_id = run.salon_id
  ) <> ${decisions.categoryStateChanges.length} THEN
    RAISE EXCEPTION 'Persistent category backup count guard failed';
  END IF;

  INSERT INTO ${AUDIT_TABLE} (
    batch_key, channel_slug, salon_id, recorded_at, action, product_rows, category_rows
  )
  SELECT batch_key, channel_slug, salon_id, recorded_at, 'backup_captured',
         ${decisions.categoryMoves.length}, ${decisions.categoryStateChanges.length}
  FROM _adg_public_taxonomy_run;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION 'Expected one backup audit row, got %', affected;
  END IF;
END $$;

DO $$
DECLARE
  affected integer;
BEGIN
  UPDATE products product
  SET category_id = backup.target_category_id
  FROM _adg_public_taxonomy_run run,
       ${PRODUCT_BACKUP_TABLE} backup,
       product_variants variant
  WHERE backup.batch_key = run.batch_key
    AND backup.channel_slug = run.channel_slug
    AND backup.salon_id = run.salon_id
    AND product.salon_id = run.salon_id
    AND product.id = backup.product_id
    AND product.category_id = backup.original_category_id
    AND product.is_active = TRUE
    AND product.is_published = TRUE
    AND product.deleted_at IS NULL
    AND variant.salon_id = run.salon_id
    AND variant.id = backup.variant_id
    AND variant.template_id = product.id
    AND variant.sku = backup.sku
    AND variant.is_active = TRUE
    AND variant.deleted_at IS NULL;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> ${decisions.categoryMoves.length} THEN
    RAISE EXCEPTION 'Expected ${decisions.categoryMoves.length} product category updates, got %', affected;
  END IF;

  IF EXISTS (
    SELECT retained.slug
    FROM _adg_public_taxonomy_retained_category retained
    CROSS JOIN _adg_public_taxonomy_target_salon tenant
    LEFT JOIN categories category
      ON category.salon_id = tenant.salon_id
     AND category.slug = retained.slug
    LEFT JOIN products product
      ON product.salon_id = tenant.salon_id
     AND product.category_id = category.id
     AND product.deleted_at IS NULL
    GROUP BY retained.slug, retained.expected_active, retained.expected_products_after
    HAVING COUNT(DISTINCT category.id) <> 1
       OR BOOL_OR(category.is_active) IS DISTINCT FROM retained.expected_active
       OR COUNT(DISTINCT product.id) <> retained.expected_products_after
  ) THEN
    RAISE EXCEPTION 'Retained category post-apply count guard failed';
  END IF;

  IF EXISTS (
    SELECT state.slug
    FROM _adg_public_taxonomy_category_state state
    CROSS JOIN _adg_public_taxonomy_target_salon tenant
    JOIN categories category
      ON category.salon_id = tenant.salon_id
     AND category.slug = state.slug
    JOIN products product
      ON product.salon_id = tenant.salon_id
     AND product.category_id = category.id
     AND product.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'A deactivation source category still owns products after remapping';
  END IF;

  UPDATE categories category
  SET is_active = backup.target_is_active,
      updated_at = GREATEST(category.updated_at + INTERVAL '1 microsecond', clock_timestamp())
  FROM _adg_public_taxonomy_run run,
       ${CATEGORY_BACKUP_TABLE} backup
  WHERE backup.batch_key = run.batch_key
    AND backup.channel_slug = run.channel_slug
    AND backup.salon_id = run.salon_id
    AND category.salon_id = run.salon_id
    AND category.id = backup.category_id
    AND category.slug = backup.category_slug
    AND category.is_active = backup.original_is_active
    AND category.updated_at = backup.original_updated_at;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> ${decisions.categoryStateChanges.length} THEN
    RAISE EXCEPTION 'Expected ${decisions.categoryStateChanges.length} category deactivations, got %', affected;
  END IF;

  UPDATE ${CATEGORY_BACKUP_TABLE} backup
  SET applied_updated_at = category.updated_at
  FROM _adg_public_taxonomy_run run,
       categories category
  WHERE backup.batch_key = run.batch_key
    AND backup.channel_slug = run.channel_slug
    AND backup.salon_id = run.salon_id
    AND backup.applied_updated_at IS NULL
    AND category.salon_id = run.salon_id
    AND category.id = backup.category_id
    AND category.slug = backup.category_slug
    AND category.is_active = backup.target_is_active
    AND category.updated_at > backup.original_updated_at;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> ${decisions.categoryStateChanges.length} THEN
    RAISE EXCEPTION 'Expected ${decisions.categoryStateChanges.length} category sync timestamps, got %', affected;
  END IF;

  IF EXISTS (
    SELECT backup.sku
    FROM ${PRODUCT_BACKUP_TABLE} backup
    JOIN _adg_public_taxonomy_run run
      ON backup.batch_key = run.batch_key
     AND backup.channel_slug = run.channel_slug
     AND backup.salon_id = run.salon_id
    LEFT JOIN products product
      ON product.salon_id = run.salon_id
     AND product.id = backup.product_id
     AND product.category_id = backup.target_category_id
     AND product.is_active = TRUE
     AND product.is_published = TRUE
     AND product.deleted_at IS NULL
    LEFT JOIN categories target_category
      ON target_category.salon_id = run.salon_id
     AND target_category.id = backup.target_category_id
     AND target_category.slug = backup.target_category_slug
     AND target_category.is_active = TRUE
    WHERE product.id IS NULL OR target_category.id IS NULL
  ) OR EXISTS (
    SELECT backup.category_slug
    FROM ${CATEGORY_BACKUP_TABLE} backup
    JOIN _adg_public_taxonomy_run run
      ON backup.batch_key = run.batch_key
     AND backup.channel_slug = run.channel_slug
     AND backup.salon_id = run.salon_id
    LEFT JOIN categories category
      ON category.salon_id = run.salon_id
     AND category.id = backup.category_id
     AND category.slug = backup.category_slug
    WHERE category.id IS NULL
       OR category.is_active IS DISTINCT FROM backup.target_is_active
       OR category.updated_at IS DISTINCT FROM backup.applied_updated_at
  ) THEN
    RAISE EXCEPTION 'Exact apply post-state verification failed';
  END IF;

  INSERT INTO ${AUDIT_TABLE} (
    batch_key, channel_slug, salon_id, recorded_at, action, product_rows, category_rows
  )
  SELECT batch_key, channel_slug, salon_id, clock_timestamp(), 'apply_complete',
         ${decisions.categoryMoves.length}, ${decisions.categoryStateChanges.length}
  FROM _adg_public_taxonomy_run;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION 'Expected one apply audit row, got %', affected;
  END IF;
END $$;

SELECT backup.sku, product.name, backup.original_category_slug, backup.target_category_slug,
       backup.mapping_type, backup.confidence, backup.captured_at
FROM _adg_public_taxonomy_run run
JOIN ${PRODUCT_BACKUP_TABLE} backup
  ON backup.batch_key = run.batch_key
 AND backup.channel_slug = run.channel_slug
 AND backup.salon_id = run.salon_id
JOIN products product
  ON product.salon_id = run.salon_id
 AND product.id = backup.product_id
ORDER BY backup.sku;

SELECT backup.category_slug, backup.original_is_active, category.is_active,
       backup.original_updated_at, backup.applied_updated_at, category.updated_at,
       backup.product_count_before, backup.captured_at
FROM _adg_public_taxonomy_run run
JOIN ${CATEGORY_BACKUP_TABLE} backup
  ON backup.batch_key = run.batch_key
 AND backup.channel_slug = run.channel_slug
 AND backup.salon_id = run.salon_id
JOIN categories category
  ON category.salon_id = run.salon_id
 AND category.id = backup.category_id
ORDER BY backup.category_slug;

COMMIT;
`.replace(/[ \t]+\n/g, '\n');
}

function renderRollbackSql(decisions) {
  return `${renderPreamble(decisions, 'roll back')}
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM _adg_public_taxonomy_target_salon) <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one active Asia Deli Go channel';
  END IF;
  IF (SELECT COUNT(*) FROM _adg_public_taxonomy_moves) <> ${decisions.categoryMoves.length} THEN
    RAISE EXCEPTION 'Expected exactly ${decisions.categoryMoves.length} public-category decisions';
  END IF;
  IF (SELECT COUNT(*) FROM _adg_public_taxonomy_category_state) <> ${decisions.categoryStateChanges.length} THEN
    RAISE EXCEPTION 'Expected exactly ${decisions.categoryStateChanges.length} category-state decisions';
  END IF;
  IF (SELECT COUNT(*) FROM _adg_public_taxonomy_retained_category) <> ${decisions.retainedCategoryChecks.length} THEN
    RAISE EXCEPTION 'Expected exactly ${decisions.retainedCategoryChecks.length} retained-category check';
  END IF;

  IF (
    SELECT COUNT(*) FROM ${PRODUCT_BACKUP_TABLE} backup
    JOIN _adg_public_taxonomy_run run
      ON backup.batch_key = run.batch_key
     AND backup.channel_slug = run.channel_slug
     AND backup.salon_id = run.salon_id
  ) <> ${decisions.categoryMoves.length} THEN
    RAISE EXCEPTION 'Expected exactly ${decisions.categoryMoves.length} tenant-scoped product backup rows';
  END IF;
  IF (
    SELECT COUNT(*) FROM ${CATEGORY_BACKUP_TABLE} backup
    JOIN _adg_public_taxonomy_run run
      ON backup.batch_key = run.batch_key
     AND backup.channel_slug = run.channel_slug
     AND backup.salon_id = run.salon_id
  ) <> ${decisions.categoryStateChanges.length} THEN
    RAISE EXCEPTION 'Expected exactly ${decisions.categoryStateChanges.length} tenant-scoped category backup rows';
  END IF;
  IF EXISTS (
    SELECT move.sku
    FROM _adg_public_taxonomy_moves move
    CROSS JOIN _adg_public_taxonomy_run run
    LEFT JOIN ${PRODUCT_BACKUP_TABLE} backup
      ON backup.batch_key = run.batch_key
     AND backup.channel_slug = run.channel_slug
     AND backup.salon_id = run.salon_id
     AND backup.sku = move.sku
    WHERE backup.product_id IS NULL
       OR backup.original_category_slug <> move.source_category_slug
       OR backup.target_category_slug <> move.target_category_slug
       OR backup.mapping_type <> move.mapping_type
       OR backup.confidence <> move.confidence
  ) THEN
    RAISE EXCEPTION 'Product backup does not exactly match the approved decision set';
  END IF;
  IF EXISTS (
    SELECT state.slug
    FROM _adg_public_taxonomy_category_state state
    CROSS JOIN _adg_public_taxonomy_run run
    LEFT JOIN ${CATEGORY_BACKUP_TABLE} backup
      ON backup.batch_key = run.batch_key
     AND backup.channel_slug = run.channel_slug
     AND backup.salon_id = run.salon_id
     AND backup.category_slug = state.slug
    WHERE backup.category_id IS NULL
       OR backup.original_is_active IS DISTINCT FROM state.original_active
       OR backup.target_is_active IS DISTINCT FROM state.target_active
       OR backup.product_count_before <> state.expected_products_before
  ) THEN
    RAISE EXCEPTION 'Category backup does not exactly match the approved decision set';
  END IF;
  IF (
    SELECT COUNT(*) FROM ${AUDIT_TABLE} audit
    JOIN _adg_public_taxonomy_run run
      ON audit.batch_key = run.batch_key
     AND audit.channel_slug = run.channel_slug
     AND audit.salon_id = run.salon_id
    WHERE audit.action IN ('backup_captured', 'apply_complete')
  ) <> 2 OR EXISTS (
    SELECT 1 FROM ${AUDIT_TABLE} audit
    JOIN _adg_public_taxonomy_run run
      ON audit.batch_key = run.batch_key
     AND audit.channel_slug = run.channel_slug
     AND audit.salon_id = run.salon_id
    WHERE audit.action = 'rollback_complete'
  ) THEN
    RAISE EXCEPTION 'Apply audit precondition failed or batch was already rolled back';
  END IF;

  IF EXISTS (
    SELECT backup.sku
    FROM ${PRODUCT_BACKUP_TABLE} backup
    JOIN _adg_public_taxonomy_run run
      ON backup.batch_key = run.batch_key
     AND backup.channel_slug = run.channel_slug
     AND backup.salon_id = run.salon_id
    LEFT JOIN product_variants variant
      ON variant.salon_id = run.salon_id
     AND variant.id = backup.variant_id
     AND variant.sku = backup.sku
     AND variant.is_active = TRUE
     AND variant.deleted_at IS NULL
    LEFT JOIN products product
      ON product.salon_id = run.salon_id
     AND product.id = backup.product_id
     AND product.id = variant.template_id
     AND product.category_id = backup.target_category_id
     AND product.is_active = TRUE
     AND product.is_published = TRUE
     AND product.deleted_at IS NULL
    LEFT JOIN categories target_category
      ON target_category.salon_id = run.salon_id
     AND target_category.id = backup.target_category_id
     AND target_category.slug = backup.target_category_slug
     AND target_category.is_active = TRUE
    LEFT JOIN categories original_category
      ON original_category.salon_id = run.salon_id
     AND original_category.id = backup.original_category_id
     AND original_category.slug = backup.original_category_slug
    LEFT JOIN _adg_public_taxonomy_category_state state
      ON state.slug = backup.original_category_slug
    WHERE variant.id IS NULL
       OR product.id IS NULL
       OR target_category.id IS NULL
       OR original_category.id IS NULL
       OR original_category.is_active IS DISTINCT FROM COALESCE(state.target_active, TRUE)
  ) THEN
    RAISE EXCEPTION 'Exact product post-apply state precondition failed; aborting rollback';
  END IF;
  IF EXISTS (
    SELECT backup.category_slug
    FROM ${CATEGORY_BACKUP_TABLE} backup
    JOIN _adg_public_taxonomy_run run
      ON backup.batch_key = run.batch_key
     AND backup.channel_slug = run.channel_slug
     AND backup.salon_id = run.salon_id
    LEFT JOIN categories category
      ON category.salon_id = run.salon_id
     AND category.id = backup.category_id
     AND category.slug = backup.category_slug
    LEFT JOIN products product
      ON product.salon_id = run.salon_id
     AND product.category_id = backup.category_id
     AND product.deleted_at IS NULL
    GROUP BY backup.category_slug, backup.target_is_active, backup.applied_updated_at,
             category.id, category.is_active, category.updated_at
    HAVING category.id IS NULL
       OR category.is_active IS DISTINCT FROM backup.target_is_active
       OR backup.applied_updated_at IS NULL
       OR category.updated_at IS DISTINCT FROM backup.applied_updated_at
       OR COUNT(product.id) <> 0
  ) THEN
    RAISE EXCEPTION 'Exact category post-apply state precondition failed; aborting rollback';
  END IF;
  IF EXISTS (
    SELECT retained.slug
    FROM _adg_public_taxonomy_retained_category retained
    CROSS JOIN _adg_public_taxonomy_target_salon tenant
    LEFT JOIN categories category
      ON category.salon_id = tenant.salon_id
     AND category.slug = retained.slug
    LEFT JOIN products product
      ON product.salon_id = tenant.salon_id
     AND product.category_id = category.id
     AND product.deleted_at IS NULL
    GROUP BY retained.slug, retained.expected_active, retained.expected_products_after
    HAVING COUNT(DISTINCT category.id) <> 1
       OR BOOL_OR(category.is_active) IS DISTINCT FROM retained.expected_active
       OR COUNT(DISTINCT product.id) <> retained.expected_products_after
  ) THEN
    RAISE EXCEPTION 'Retained category exact post-apply state precondition failed; aborting rollback';
  END IF;
END $$;

DO $$
DECLARE
  affected integer;
BEGIN
  UPDATE categories category
  SET is_active = backup.original_is_active,
      updated_at = GREATEST(category.updated_at + INTERVAL '1 microsecond', clock_timestamp())
  FROM _adg_public_taxonomy_run run,
       ${CATEGORY_BACKUP_TABLE} backup
  WHERE backup.batch_key = run.batch_key
    AND backup.channel_slug = run.channel_slug
    AND backup.salon_id = run.salon_id
    AND category.salon_id = run.salon_id
    AND category.id = backup.category_id
    AND category.slug = backup.category_slug
    AND category.is_active = backup.target_is_active
    AND category.updated_at = backup.applied_updated_at;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> ${decisions.categoryStateChanges.length} THEN
    RAISE EXCEPTION 'Expected ${decisions.categoryStateChanges.length} category restorations from backup, got %', affected;
  END IF;

  UPDATE products product
  SET category_id = backup.original_category_id
  FROM _adg_public_taxonomy_run run,
       ${PRODUCT_BACKUP_TABLE} backup,
       product_variants variant
  WHERE backup.batch_key = run.batch_key
    AND backup.channel_slug = run.channel_slug
    AND backup.salon_id = run.salon_id
    AND product.salon_id = run.salon_id
    AND product.id = backup.product_id
    AND product.category_id = backup.target_category_id
    AND product.is_active = TRUE
    AND product.is_published = TRUE
    AND product.deleted_at IS NULL
    AND variant.salon_id = run.salon_id
    AND variant.id = backup.variant_id
    AND variant.template_id = product.id
    AND variant.sku = backup.sku
    AND variant.is_active = TRUE
    AND variant.deleted_at IS NULL;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> ${decisions.categoryMoves.length} THEN
    RAISE EXCEPTION 'Expected ${decisions.categoryMoves.length} product restorations from backup, got %', affected;
  END IF;

  IF EXISTS (
    SELECT backup.sku
    FROM ${PRODUCT_BACKUP_TABLE} backup
    JOIN _adg_public_taxonomy_run run
      ON backup.batch_key = run.batch_key
     AND backup.channel_slug = run.channel_slug
     AND backup.salon_id = run.salon_id
    JOIN products product
      ON product.salon_id = run.salon_id
     AND product.id = backup.product_id
    WHERE product.category_id IS DISTINCT FROM backup.original_category_id
  ) OR EXISTS (
    SELECT backup.category_slug
    FROM ${CATEGORY_BACKUP_TABLE} backup
    JOIN _adg_public_taxonomy_run run
      ON backup.batch_key = run.batch_key
     AND backup.channel_slug = run.channel_slug
     AND backup.salon_id = run.salon_id
    JOIN categories category
      ON category.salon_id = run.salon_id
     AND category.id = backup.category_id
    WHERE category.is_active IS DISTINCT FROM backup.original_is_active
       OR category.updated_at <= backup.applied_updated_at
  ) THEN
    RAISE EXCEPTION 'Backup restoration verification failed';
  END IF;

  IF EXISTS (
    SELECT retained.slug
    FROM _adg_public_taxonomy_retained_category retained
    CROSS JOIN _adg_public_taxonomy_target_salon tenant
    LEFT JOIN categories category
      ON category.salon_id = tenant.salon_id
     AND category.slug = retained.slug
    LEFT JOIN products product
      ON product.salon_id = tenant.salon_id
     AND product.category_id = category.id
     AND product.deleted_at IS NULL
    GROUP BY retained.slug, retained.expected_active, retained.expected_products_before
    HAVING COUNT(DISTINCT category.id) <> 1
       OR BOOL_OR(category.is_active) IS DISTINCT FROM retained.expected_active
       OR COUNT(DISTINCT product.id) <> retained.expected_products_before
  ) THEN
    RAISE EXCEPTION 'Retained category rollback count verification failed';
  END IF;

  INSERT INTO ${AUDIT_TABLE} (
    batch_key, channel_slug, salon_id, recorded_at, action, product_rows, category_rows
  )
  SELECT batch_key, channel_slug, salon_id, clock_timestamp(), 'rollback_complete',
         ${decisions.categoryMoves.length}, ${decisions.categoryStateChanges.length}
  FROM _adg_public_taxonomy_run;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION 'Expected one rollback audit row, got %', affected;
  END IF;
END $$;

SELECT backup.sku, product.name, backup.target_category_slug, backup.original_category_slug,
       backup.mapping_type, backup.confidence, audit.recorded_at AS rolled_back_at
FROM _adg_public_taxonomy_run run
JOIN ${PRODUCT_BACKUP_TABLE} backup
  ON backup.batch_key = run.batch_key
 AND backup.channel_slug = run.channel_slug
 AND backup.salon_id = run.salon_id
JOIN products product
  ON product.salon_id = run.salon_id
 AND product.id = backup.product_id
JOIN ${AUDIT_TABLE} audit
  ON audit.batch_key = run.batch_key
 AND audit.channel_slug = run.channel_slug
 AND audit.salon_id = run.salon_id
 AND audit.action = 'rollback_complete'
ORDER BY backup.sku;

COMMIT;
`.replace(/[ \t]+\n/g, '\n');
}

function renderMarkdown(decisions) {
  const lines = [
    '# Asia Deli Go Public Taxonomy Remediation v2',
    '',
    `Prepared: ${decisions.preparedAt}`,
    `Batch: \`${decisions.batch}\``,
    '',
    '## Result',
    '',
    `- Exactly ${decisions.categoryMoves.length} live products are in scope: the products omitted from curated public-category browsing.`,
    `- Exactly ${decisions.categoryStateChanges.length} emptied provisional categories are deactivated.`,
    '- The historical eight duplicate-category consolidation moves are explicitly outside this batch.',
    '- Persistent tenant-scoped product/category backups and an audit log are created before mutation.',
    '- Production mutation in this preparation step: none.',
    '',
    '## Approved moves',
    '',
    '| SKU | Product | From | To | Type | Confidence | Reason |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...decisions.categoryMoves.map((row) => `| ${row.sku} | ${row.name} | ${row.expectedCategorySlug} | ${row.targetCategorySlug} | ${row.mappingType} | ${row.confidence} | ${row.reason} |`),
    '',
    '## Category state',
    '',
    '| Category | Exact products before move | Apply state |',
    '| --- | ---: | --- |',
    ...decisions.categoryStateChanges.map((row) => `| ${row.slug} | ${row.expectedProductsBeforeMove} | active -> inactive |`),
    '',
    '## Explicitly retained',
    '',
    ...decisions.retainedCategories.map((row) => `- \`${row.slug}\`: ${row.reason}`),
    '',
    '## Persistent recovery evidence',
    '',
    `- Product backup: \`${PRODUCT_BACKUP_TABLE}\` — exactly ${decisions.categoryMoves.length} rows for the batch and tenant.`,
    `- Category backup: \`${CATEGORY_BACKUP_TABLE}\` — exactly ${decisions.categoryStateChanges.length} rows for the batch and tenant.`,
    `- Audit log: \`${AUDIT_TABLE}\` — records backup capture, completed apply, and completed rollback timestamps.`,
    '- Rollback uses captured product/category UUIDs and original category states, not a newly resolved slug mapping.',
    '- Backup and audit rows are retained; neither script contains DELETE.',
    '',
    '## Guardrails',
    '',
    '- Every canonical and backup-table join is scoped by the single active `asiandeligo` salon.',
    '- Apply is SERIALIZABLE and requires exact SKU, source category, target category, active/published, soft-delete, and category-count preconditions.',
    '- Apply aborts unless exactly ten product backups, two category backups, ten updates, and two deactivations occur.',
    '- Rollback requires the exact approved backup set plus exact post-apply product IDs, category IDs, and states.',
    `- The channel lookup is pinned to salon UUID \`${decisions.salonId}\`, slug \`${decisions.channel}\`, and active state.`,
    '- `pozostałe-produkty` stays active; `sosy-sojowe` and `sosy-i-marynaty` are untouched.',
    '- `pozostałe-produkty` must contain exactly seven non-deleted rows before apply, six after apply, and seven after rollback.',
    '- The SQL explicitly changes `products.category_id`, `categories.is_active`, and `categories.updated_at`.',
    '- Category timestamps use an explicit monotonic raw-SQL update because production has no category revision trigger and POS incremental category sync reads `categories.updated_at`; apply and rollback both remain discoverable without a full POS resync.',
    '- The SQL does not explicitly assign `products.updated_at`; the existing database revision trigger advances it for the ten product updates so the hourly product-index sync and POS product sync can detect them.',
    '- No price, stock, content, publication, order, reservation, or translation field is changed.',
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
    '- Rehearsal evidence: `docs/asiandeligo-public-taxonomy-rehearsal-20260720-v2.md`',
  ];
  return `${lines.join('\n')}\n`;
}

function writeFile(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
}

function main() {
  const options = parseArgs();
  const decisions = JSON.parse(fs.readFileSync(options.input, 'utf8'));
  validate(decisions);
  writeFile(options.apply, renderApplySql(decisions));
  writeFile(options.rollback, renderRollbackSql(decisions));
  writeFile(options.output, renderMarkdown(decisions));
  console.log(`Validated exact v2 scope: ${decisions.categoryMoves.length} product moves and ${decisions.categoryStateChanges.length} category state changes.`);
  console.log(`Wrote ${options.output}`);
  console.log(`Wrote ${options.apply}`);
  console.log(`Wrote ${options.rollback}`);
}

main();
