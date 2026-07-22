import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { validateDecisions } from '../scripts/catalog-metadata-batch5-plan.mjs';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DECISIONS_PATH = 'docs/asiandeligo-catalog-metadata-batch5-decisions-20260722.json';
const PLAN_PATH = 'docs/asiandeligo-catalog-metadata-batch5-remediation-20260722.md';
const APPLY_PATH = 'docs/asiandeligo-catalog-metadata-batch5-apply-20260722.sql';
const ROLLBACK_PATH = 'docs/asiandeligo-catalog-metadata-batch5-rollback-20260722.sql';
const GENERATOR_PATH = path.join(PROJECT_ROOT, 'scripts/catalog-metadata-batch5-plan.mjs');

const EXPECTED_COHORT_SKUS = [
  'ADG-000231', 'ADG-000249', 'ADG-000264', 'ADG-000273', 'ADG-000304',
  'ADG-000316', 'ADG-000325', 'ADG-000331', 'ADG-000341', 'ADG-000351',
  'ADG-000292', 'ADG-000293', 'ADG-001263', 'ADG-001265', 'ADG-001287',
  'ADG-001650', 'ADG-000457', 'ADG-000131', 'ADG-000189', 'ADG-000239',
  'ADG-000291', 'ADG-000294', 'ADG-000296', 'ADG-000470', 'ADG-000482',
];
const EXPECTED_TRANSITION_SKUS = [
  'ADG-000231', 'ADG-000249', 'ADG-000264', 'ADG-000316', 'ADG-000325',
  'ADG-000331', 'ADG-000341', 'ADG-000351', 'ADG-000292', 'ADG-000293',
  'ADG-001263', 'ADG-001265', 'ADG-001287', 'ADG-001650', 'ADG-000457',
  'ADG-000189', 'ADG-000239', 'ADG-000482',
];
const EXPECTED_HOLD_SKUS = [
  'ADG-000273', 'ADG-000304', 'ADG-000131', 'ADG-000291',
  'ADG-000294', 'ADG-000296', 'ADG-000470',
];
const EXPECTED_TRANSITION_COUNT = EXPECTED_TRANSITION_SKUS.length;
const EXPECTED_PATCHES = {
  'ADG-000231': { storageZone: 'AMBIENT' },
  'ADG-000249': { storageZone: 'AMBIENT' },
  'ADG-000264': { storageZone: 'AMBIENT' },
  'ADG-000316': { countryOfOrigin: 'Holandia' },
  'ADG-000325': { storageZone: 'AMBIENT' },
  'ADG-000331': { storageZone: 'AMBIENT' },
  'ADG-000341': { storageZone: 'AMBIENT' },
  'ADG-000351': { storageZone: 'AMBIENT' },
  'ADG-000292': { storageZone: 'AMBIENT' },
  'ADG-000293': { storageZone: 'AMBIENT' },
  'ADG-001263': { storageZone: 'AMBIENT' },
  'ADG-001265': {
    storageZone: 'AMBIENT',
    nutritionFacts: {
      calories: 54,
      fat: 0,
      carbs: 13.5,
      protein: 0,
      salt: 0.01,
      servingSize: 'w 100ml',
    },
  },
  'ADG-001287': { storageZone: 'AMBIENT' },
  'ADG-001650': { storageZone: 'AMBIENT' },
  'ADG-000457': { storageZone: 'AMBIENT' },
  'ADG-000189': { storageZone: 'AMBIENT' },
  'ADG-000239': { storageZone: 'AMBIENT' },
  'ADG-000482': { countryOfOrigin: 'Wielka Brytania' },
};
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

function absolute(relativePath) {
  return path.join(PROJECT_ROOT, relativePath);
}

function readDecisions() {
  return JSON.parse(fs.readFileSync(absolute(DECISIONS_PATH), 'utf8'));
}

function generateArtifacts(directory, input = absolute(DECISIONS_PATH)) {
  execFileSync(process.execPath, [
    GENERATOR_PATH,
    '--input', input,
    '--output', PLAN_PATH,
    '--apply', APPLY_PATH,
    '--rollback', ROLLBACK_PATH,
  ], { cwd: directory, stdio: 'pipe' });
  return {
    output: path.join(directory, PLAN_PATH),
    apply: path.join(directory, APPLY_PATH),
    rollback: path.join(directory, ROLLBACK_PATH),
  };
}

function assertNoDestructiveOrOutOfScopeSql(sql) {
  assert.doesNotMatch(sql, /UPDATE\s+(?:public\.)?(?:categories|product_variants)\b/i);
  assert.doesNotMatch(sql, /^\s*(?:DELETE\s+FROM|DROP\s+TABLE|TRUNCATE\s+TABLE|ALTER\s+TABLE)\b/im);

  const productUpdate = /UPDATE (?:public\.)?products product\s+SET ([\s\S]*?)\s+FROM /i.exec(sql);
  assert.ok(productUpdate, 'an exact products metadata update must exist');
  assert.deepEqual(
    [...productUpdate[1].matchAll(/(?:^|,)\s*([a-z_]+)\s*=/gim)].map((match) => match[1]),
    [
      'allergens',
      'may_contain_allergens',
      'storage_zone',
      'nutrition_facts',
      'country_of_origin',
      'ingredients',
    ],
  );
  assert.doesNotMatch(productUpdate[1], /\b(?:updated_at|price_per_unit|unit_of_measure|stock|quantity)\s*=/i);
  assert.doesNotMatch(productUpdate[1], /\b(?:name|slug|category_id|status|is_active|is_published|is_visible)\s*=/i);
}

test('reviewed decisions lock the exact 18-transition and 7-hold cohort partition', () => {
  const decisions = validateDecisions(readDecisions());
  assert.equal(decisions.version, 1);
  assert.equal(decisions.batch, 'asiandeligo-catalog-metadata-batch5-20260722-v1');
  assert.equal(decisions.channel, 'asiandeligo');
  assert.equal(decisions.salonId, 'e73271a9-53e3-4a20-a02e-791726b452aa');
  assert.deepEqual(decisions.cohortSkus, EXPECTED_COHORT_SKUS);
  assert.deepEqual(decisions.products.map((row) => row.sku).sort(), [...EXPECTED_TRANSITION_SKUS].sort());
  assert.deepEqual(decisions.holds.map((row) => row.sku).sort(), [...EXPECTED_HOLD_SKUS].sort());

  const reviewedSkus = [...decisions.products, ...decisions.holds].map((row) => row.sku);
  assert.equal(new Set(reviewedSkus).size, 25);
  assert.deepEqual([...reviewedSkus].sort(), [...EXPECTED_COHORT_SKUS].sort());
  assert.ok(decisions.products.every((row) => row.confidence === 'high'));
  assert.ok(decisions.products.every((row) => row.evidence.length >= 2));
  assert.ok(decisions.holds.every((row) => row.evidence.length >= 1));

  for (const row of decisions.products) {
    assert.deepEqual(Object.keys(row.expected).sort(), [...SNAPSHOT_FIELDS].sort());
    assert.deepEqual(Object.keys(row.target).sort(), [...SNAPSHOT_FIELDS].sort());
    assert.deepEqual(row.target.category, row.expected.category);
    assert.equal(row.target.pricePerUnit, row.expected.pricePerUnit);
    assert.equal(row.target.unitOfMeasure, row.expected.unitOfMeasure);
  }

  const rows = Object.fromEntries(decisions.products.map((row) => [row.sku, row]));
  assert.deepEqual(Object.keys(EXPECTED_PATCHES), EXPECTED_TRANSITION_SKUS);
  for (const [sku, patch] of Object.entries(EXPECTED_PATCHES)) {
    const expectedTarget = structuredClone(rows[sku].expected);
    Object.assign(expectedTarget, patch);
    assert.deepEqual(rows[sku].changedFields, Object.keys(patch));
    assert.deepEqual(rows[sku].target, expectedTarget);
  }
  assert.deepEqual(
    decisions.products.flatMap((row) => row.changedFields).sort(),
    [
      ...Array(16).fill('storageZone'),
      'nutritionFacts',
      ...Array(2).fill('countryOfOrigin'),
    ].sort(),
  );
  for (const sku of EXPECTED_HOLD_SKUS) assert.equal(rows[sku], undefined);
  assert.deepEqual(decisions.holds.map((row) => row.sku), EXPECTED_HOLD_SKUS);
});

test('generator emits tenant-pinned, exact-row, reversible metadata-only SQL', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'adg-metadata-batch5-sql-'));
  try {
    const artifacts = generateArtifacts(directory);
    const applySql = fs.readFileSync(artifacts.apply, 'utf8');
    const rollbackSql = fs.readFileSync(artifacts.rollback, 'utf8');
    const plan = fs.readFileSync(artifacts.output, 'utf8');
    const decisionBytes = fs.readFileSync(absolute(DECISIONS_PATH));
    const decisionSha = crypto.createHash('sha256').update(decisionBytes).digest('hex');

    assert.match(applySql, /^\\set ON_ERROR_STOP on$/m);
    assert.match(rollbackSql, /^\\set ON_ERROR_STOP on$/m);
    assert.match(applySql, /SET TRANSACTION ISOLATION LEVEL SERIALIZABLE/);
    assert.match(rollbackSql, /SET TRANSACTION ISOLATION LEVEL SERIALIZABLE/);
    assert.match(applySql, /SET LOCAL search_path = pg_catalog, public;/);
    assert.match(rollbackSql, /SET LOCAL search_path = pg_catalog, public;/);
    assert.match(applySql, /FROM public\.channels[\s\S]*?AND is_active = TRUE\nFOR SHARE;/);
    assert.match(rollbackSql, /FROM public\.channels[\s\S]*?AND is_active = TRUE\nFOR SHARE;/);
    assert.match(applySql, /SET LOCAL lock_timeout = '5s'/);
    assert.match(applySql, /SET LOCAL statement_timeout = '120s'/);
    assert.match(
      applySql,
      /WHERE salon_id = 'e73271a9-53e3-4a20-a02e-791726b452aa'::uuid\n  AND slug = 'asiandeligo'\n  AND is_active = TRUE/,
    );
    assert.match(rollbackSql, /salon_id = 'e73271a9-53e3-4a20-a02e-791726b452aa'::uuid/);
    assert.match(applySql, new RegExp(decisionSha));
    assert.match(rollbackSql, new RegExp(decisionSha));
    assert.match(plan, new RegExp(decisionSha));

    assert.match(applySql, /CREATE TABLE public\.asiandeligo_catalog_metadata_batch5_product_backup_20260722/);
    assert.match(applySql, /CREATE TABLE public\.asiandeligo_catalog_metadata_batch5_audit_20260722/);
    assert.doesNotMatch(rollbackSql, /CREATE TABLE public\.asiandeligo_catalog_metadata_/);
    assert.match(applySql, /FROM public\.channels/);
    assert.match(applySql, /JOIN public\.product_variants variant/);
    assert.match(applySql, /JOIN public\.products product/);
    assert.match(applySql, /JOIN public\.categories category/);
    assert.match(rollbackSql, /FROM public\.channels/);
    assert.match(rollbackSql, /JOIN public\.product_variants variant/);
    assert.match(rollbackSql, /JOIN public\.products product/);
    assert.match(rollbackSql, /JOIN public\.categories category/);
    assert.match(applySql, /tgrelid = 'public\.products'::regclass/);
    assert.match(applySql, /zz_enforce_products_monotonic_updated_at/);
    assert.match(rollbackSql, /tgrelid = 'public\.products'::regclass/);
    assert.match(rollbackSql, /zz_enforce_products_monotonic_updated_at/);
    assert.match(applySql, /product\.updated_at = decision\.expected_updated_at/);
    assert.match(applySql, /FOR UPDATE OF product, variant, category/);
    assert.match(rollbackSql, /FOR UPDATE OF product, variant, category/);
    assert.match(rollbackSql, /product\.updated_at = backup\.applied_updated_at/);
    assert.match(rollbackSql, /refusing to overwrite intervening edits/);
    assert.match(rollbackSql, /product\.updated_at > backup\.applied_updated_at/);
    assert.match(rollbackSql, /backup\.changed_fields = decision\.changed_fields/);
    assert.match(rollbackSql, /backup\.original_updated_at = decision\.expected_updated_at/);
    assert.match(rollbackSql, /backup\.category_id = decision\.category_id/);
    assert.match(rollbackSql, /backup\.allergens IS NOT DISTINCT FROM decision\.expected_allergens/);
    assert.match(rollbackSql, /backup\.nutrition_facts IS NOT DISTINCT FROM decision\.expected_nutrition_facts/);
    assert.match(rollbackSql, /backup\.price_per_unit IS NOT DISTINCT FROM decision\.expected_price_per_unit/);
    assert.match(rollbackSql, /backup\.applied_updated_at > backup\.original_updated_at/);
    assert.match(rollbackSql, /action = 'backup_captured'/);
    assert.match(rollbackSql, /action = 'apply_complete'/);
    assert.match(rollbackSql, /variant\.is_active = TRUE/);
    assert.match(rollbackSql, /variant\.availability_status = 'IN_STOCK'/);
    assert.match(rollbackSql, /product\.is_published = TRUE/);
    assert.match(rollbackSql, /product\.status = 'active'/);
    assert.match(applySql, new RegExp(`Expected ${EXPECTED_TRANSITION_COUNT} exact product row locks`));
    assert.match(applySql, new RegExp(`Expected ${EXPECTED_TRANSITION_COUNT} persistent product backup rows`));
    assert.match(applySql, new RegExp(`Expected ${EXPECTED_TRANSITION_COUNT} exact product updates`));
    assert.match(applySql, new RegExp(`Expected ${EXPECTED_TRANSITION_COUNT} applied updated_at captures`));
    assert.match(rollbackSql, new RegExp(`Expected ${EXPECTED_TRANSITION_COUNT} exact product restorations`));

    const backupInsert = applySql.indexOf('INSERT INTO public.asiandeligo_catalog_metadata_batch5_product_backup_20260722');
    const backupAudit = applySql.indexOf(`'backup_captured', ${EXPECTED_TRANSITION_COUNT}`);
    const productMutation = applySql.indexOf('UPDATE public.products product');
    assert.ok(backupInsert >= 0 && backupAudit > backupInsert && productMutation > backupAudit);
    assertNoDestructiveOrOutOfScopeSql(applySql);
    assertNoDestructiveOrOutOfScopeSql(rollbackSql);
    assert.match(plan, /Stock quantity is explicitly outside this batch and remains unchanged/);
    assert.match(plan, /Production mutation in this preparation step: none/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('generator output is reproducible and matches all committed reviewed artifacts', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'adg-metadata-batch5-repro-'));
  try {
    const artifacts = generateArtifacts(directory);
    const first = Object.fromEntries(
      Object.entries(artifacts).map(([key, filePath]) => [key, fs.readFileSync(filePath, 'utf8')]),
    );
    generateArtifacts(directory);
    for (const [key, filePath] of Object.entries(artifacts)) {
      const regenerated = fs.readFileSync(filePath, 'utf8');
      assert.equal(regenerated, first[key]);
      const committedPath = key === 'output' ? PLAN_PATH : key === 'apply' ? APPLY_PATH : ROLLBACK_PATH;
      assert.equal(regenerated, fs.readFileSync(absolute(committedPath), 'utf8'));
    }
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('validation rejects altered cohort, out-of-scope fields, and zero-change transitions', () => {
  const alteredCohort = readDecisions();
  [alteredCohort.cohortSkus[0], alteredCohort.cohortSkus[1]] = [
    alteredCohort.cohortSkus[1],
    alteredCohort.cohortSkus[0],
  ];
  assert.throws(() => validateDecisions(alteredCohort), /exact reviewed 25-SKU queue slice/);

  const stockMutation = readDecisions();
  stockMutation.products[0].target.stockQuantity = 99;
  assert.throws(() => validateDecisions(stockMutation), /full exact field snapshot/);

  const priceMutation = readDecisions();
  priceMutation.products[0].target.pricePerUnit = '0.01';
  assert.throws(() => validateDecisions(priceMutation), /Unit-price mutation is outside this metadata batch/);

  const zeroChange = readDecisions();
  zeroChange.products[0].target = structuredClone(zeroChange.products[0].expected);
  zeroChange.products[0].changedFields = [];
  assert.throws(() => validateDecisions(zeroChange), /No actual metadata transition/);

  const partitionSwap = readDecisions();
  const transition = partitionSwap.products.find((row) => row.sku === 'ADG-000231');
  const hold = partitionSwap.holds.find((row) => row.sku === 'ADG-000273');
  transition.sku = 'ADG-000273';
  hold.sku = 'ADG-000231';
  assert.throws(
    () => validateDecisions(partitionSwap),
    undefined,
    'reviewed holds must not be promoted by relabeling a valid transition',
  );

  const productIdentity = readDecisions();
  productIdentity.products[0].productId = '00000000-0000-4000-8000-000000000001';
  assert.throws(
    () => validateDecisions(productIdentity),
    undefined,
    'each approved transition must pin its reviewed product ID',
  );

  const timestampIdentity = readDecisions();
  timestampIdentity.products[0].expectedUpdatedAt = '2026-07-22T00:00:00.000000+00:00';
  assert.throws(
    () => validateDecisions(timestampIdentity),
    undefined,
    'each approved transition must pin its reviewed updated_at',
  );

  const categoryIdentity = readDecisions();
  categoryIdentity.products[0].expected.category.id = '00000000-0000-4000-8000-000000000002';
  categoryIdentity.products[0].target.category.id = '00000000-0000-4000-8000-000000000002';
  assert.throws(
    () => validateDecisions(categoryIdentity),
    undefined,
    'each approved transition must pin its reviewed category',
  );

  const approvedValue = readDecisions();
  approvedValue.products.find((row) => row.sku === 'ADG-000231').target.storageZone = 'CHILLED';
  assert.throws(
    () => validateDecisions(approvedValue),
    undefined,
    'approved nonzero target values must be immutable',
  );

  const invalidAllergen = readDecisions();
  const storageOnly = invalidAllergen.products.find((row) => row.sku === 'ADG-000231');
  storageOnly.expected.allergens = ['not-an-eu-allergen'];
  storageOnly.target.allergens = ['not-an-eu-allergen'];
  assert.throws(
    () => validateDecisions(invalidAllergen),
    undefined,
    'allergen fields must contain only canonical unique string codes',
  );

  const invalidNutrition = readDecisions();
  const missingNutrition = invalidNutrition.products.find((row) => row.sku === 'ADG-000316');
  missingNutrition.expected.nutritionFacts = [];
  missingNutrition.target.nutritionFacts = [];
  assert.throws(
    () => validateDecisions(invalidNutrition),
    undefined,
    'nutrition facts must be a plain object rather than an array',
  );
});
