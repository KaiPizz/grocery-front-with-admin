import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { validateDecisions } from '../scripts/catalog-metadata-batch3-plan.mjs';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DECISIONS_PATH = 'docs/asiandeligo-catalog-metadata-batch3-decisions-20260722.json';
const PLAN_PATH = 'docs/asiandeligo-catalog-metadata-batch3-remediation-20260722.md';
const APPLY_PATH = 'docs/asiandeligo-catalog-metadata-batch3-apply-20260722.sql';
const ROLLBACK_PATH = 'docs/asiandeligo-catalog-metadata-batch3-rollback-20260722.sql';
const GENERATOR_PATH = path.join(PROJECT_ROOT, 'scripts/catalog-metadata-batch3-plan.mjs');

const EXPECTED_COHORT_SKUS = [
  'ADG-000104', 'ADG-000123', 'ADG-000250', 'ADG-000251', 'ADG-000280',
  'ADG-000346', 'ADG-000419', 'ADG-000547', 'ADG-000578', 'ADG-000581',
  'ADG-000640', 'ADG-000693', 'ADG-000781', 'ADG-000968', 'ADG-001008',
  'ADG-001021', 'ADG-001039', 'ADG-001285', 'ADG-001415', 'ADG-000002',
  'ADG-000013', 'ADG-000014', 'ADG-000015', 'ADG-000017', 'ADG-000037',
];
const EXPECTED_TRANSITION_SKUS = [
  'ADG-000104', 'ADG-000123', 'ADG-000250', 'ADG-000251', 'ADG-000280',
  'ADG-000346', 'ADG-000419', 'ADG-000547', 'ADG-000578', 'ADG-000581',
  'ADG-000640', 'ADG-000693', 'ADG-000781', 'ADG-000968', 'ADG-001008',
  'ADG-001021', 'ADG-001039', 'ADG-001415',
];
const EXPECTED_HOLD_SKUS = [
  'ADG-001285', 'ADG-000002', 'ADG-000013', 'ADG-000014', 'ADG-000015',
  'ADG-000017', 'ADG-000037',
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
  assert.doesNotMatch(productUpdate[1], /\b(?:updated_at|price_per_unit|unit_of_measure|stock|quantity)\s*=/i);
  assert.doesNotMatch(productUpdate[1], /\b(?:name|slug|category_id|status|is_active|is_published|is_visible)\s*=/i);
}

test('reviewed decisions lock the exact 18-transition and 7-hold cohort partition', () => {
  const decisions = validateDecisions(readDecisions());
  assert.equal(decisions.version, 1);
  assert.equal(decisions.batch, 'asiandeligo-catalog-metadata-batch3-20260722-v1');
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
  assert.deepEqual(rows['ADG-000640'].changedFields, ['storageZone', 'countryOfOrigin']);
  assert.equal(rows['ADG-000640'].target.storageZone, 'AMBIENT');
  assert.equal(rows['ADG-000640'].target.countryOfOrigin, 'Węgry');
  assert.deepEqual(rows['ADG-000640'].target.allergens, rows['ADG-000640'].expected.allergens);
  assert.deepEqual(
    rows['ADG-000640'].target.mayContainAllergens,
    rows['ADG-000640'].expected.mayContainAllergens,
  );
  assert.deepEqual(rows['ADG-000640'].target.nutritionFacts, rows['ADG-000640'].expected.nutritionFacts);
  assert.deepEqual(rows['ADG-000693'].changedFields, [
    'storageZone', 'nutritionFacts', 'countryOfOrigin',
  ]);
  assert.equal(rows['ADG-000693'].target.nutritionFacts.servingSize, '100 ml gotowego produktu');
  assert.deepEqual(rows['ADG-000781'].changedFields, ['nutritionFacts', 'countryOfOrigin']);
  assert.equal(rows['ADG-000781'].target.countryOfOrigin, 'Kambodża');
  assert.equal(rows['ADG-000781'].target.nutritionFacts.calories, 353);
  assert.deepEqual(rows['ADG-000547'].changedFields, ['countryOfOrigin']);
  assert.equal(rows['ADG-000547'].target.countryOfOrigin, 'Włochy');
  assert.deepEqual(rows['ADG-001021'].changedFields, ['storageZone', 'countryOfOrigin']);
  assert.equal(rows['ADG-001021'].target.countryOfOrigin, 'Indie');
  for (const sku of [
    'ADG-000104', 'ADG-000123', 'ADG-000250', 'ADG-000251', 'ADG-000280',
    'ADG-000346', 'ADG-000578', 'ADG-000581', 'ADG-000968', 'ADG-001008',
    'ADG-001039', 'ADG-001415',
  ]) {
    assert.deepEqual(rows[sku].changedFields, ['storageZone']);
    assert.equal(rows[sku].target.storageZone, 'AMBIENT');
  }
  for (const sku of EXPECTED_HOLD_SKUS) assert.equal(rows[sku], undefined);
  assert.deepEqual(decisions.holds.map((row) => row.sku), EXPECTED_HOLD_SKUS);
});

test('generator emits tenant-pinned, exact-row, reversible metadata-only SQL', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'adg-metadata-batch3-sql-'));
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

    assert.match(applySql, /CREATE TABLE public\.asiandeligo_catalog_metadata_batch3_product_backup_20260722/);
    assert.match(applySql, /CREATE TABLE public\.asiandeligo_catalog_metadata_batch3_audit_20260722/);
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
    assert.match(applySql, /Expected 18 exact product row locks/);
    assert.match(applySql, /Expected 18 persistent product backup rows/);
    assert.match(applySql, /Expected 18 exact product updates/);
    assert.match(applySql, /Expected 18 applied updated_at captures/);
    assert.match(rollbackSql, /Expected 18 exact product restorations/);

    const backupInsert = applySql.indexOf('INSERT INTO public.asiandeligo_catalog_metadata_batch3_product_backup_20260722');
    const backupAudit = applySql.indexOf("'backup_captured', 18");
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
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'adg-metadata-batch3-repro-'));
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
  const transition = partitionSwap.products.find((row) => row.sku === 'ADG-000640');
  const hold = partitionSwap.holds.find((row) => row.sku === 'ADG-000013');
  transition.sku = 'ADG-000013';
  hold.sku = 'ADG-000640';
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
  approvedValue.products.find((row) => row.sku === 'ADG-000104').target.storageZone = 'CHILLED';
  assert.throws(
    () => validateDecisions(approvedValue),
    undefined,
    'approved nonzero target values must be immutable',
  );

  const invalidAllergen = readDecisions();
  const storageOnly = invalidAllergen.products.find((row) => row.sku === 'ADG-000104');
  storageOnly.expected.allergens = ['not-an-eu-allergen'];
  storageOnly.target.allergens = ['not-an-eu-allergen'];
  assert.throws(
    () => validateDecisions(invalidAllergen),
    undefined,
    'allergen fields must contain only canonical unique string codes',
  );

  const invalidNutrition = readDecisions();
  const missingNutrition = invalidNutrition.products.find((row) => row.sku === 'ADG-000547');
  missingNutrition.expected.nutritionFacts = [];
  missingNutrition.target.nutritionFacts = [];
  assert.throws(
    () => validateDecisions(invalidNutrition),
    undefined,
    'nutrition facts must be a plain object rather than an array',
  );
});
