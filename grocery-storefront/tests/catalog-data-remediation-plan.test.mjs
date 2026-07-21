import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const DECISIONS_PATH = 'docs/asiandeligo-catalog-data-decisions-20260721.json';
const PLAN_PATH = 'docs/asiandeligo-catalog-data-remediation-20260721.md';
const APPLY_PATH = 'docs/asiandeligo-catalog-data-remediation-apply-20260721.sql';
const ROLLBACK_PATH = 'docs/asiandeligo-catalog-data-remediation-rollback-20260721.sql';
const GENERATOR_PATH = 'scripts/catalog-data-remediation-plan.mjs';

const EXPECTED_SKUS = [
  'ADG-000404',
  'ADG-000702',
  'ADG-001014',
  'ADG-001382',
  'ADG-001383',
  'ADG-001750',
];

function generateArtifacts(directory, input = DECISIONS_PATH) {
  const output = path.join(directory, 'plan.md');
  const apply = path.join(directory, 'apply.sql');
  const rollback = path.join(directory, 'rollback.sql');
  execFileSync(process.execPath, [
    GENERATOR_PATH,
    '--input', input,
    '--output', output,
    '--apply', apply,
    '--rollback', rollback,
  ], { cwd: process.cwd(), stdio: 'pipe' });
  return { output, apply, rollback };
}

test('decision file locks the exact six reviewed product transitions', () => {
  const decisions = JSON.parse(fs.readFileSync(DECISIONS_PATH, 'utf8'));
  assert.equal(decisions.version, 1);
  assert.equal(decisions.batch, 'asiandeligo-catalog-data-fix-20260721-v1');
  assert.equal(decisions.channel, 'asiandeligo');
  assert.equal(decisions.salonId, 'e73271a9-53e3-4a20-a02e-791726b452aa');
  assert.deepEqual(decisions.products.map((row) => row.sku), EXPECTED_SKUS);
  assert.ok(decisions.products.every((row) => row.confidence === 'high'));
  assert.ok(decisions.products.every((row) => row.evidence.length >= 2));
  assert.ok(decisions.products.every((row) => row.evidence.every((item) => item.url.startsWith('https://'))));

  const rows = Object.fromEntries(decisions.products.map((row) => [row.sku, row]));
  assert.deepEqual(rows['ADG-000404'].target.allergens, ['cereals', 'fish']);
  assert.deepEqual(rows['ADG-000702'].target.allergens, ['cereals', 'soybeans']);
  assert.equal(rows['ADG-000702'].target.storageZone, 'AMBIENT');
  assert.deepEqual(rows['ADG-000702'].target.nutritionFacts, {
    calories: 263,
    fat: 13.2,
    saturatedFat: 2.45,
    carbs: 29.5,
    sugar: 27.9,
    protein: 8.3,
    salt: 1.48,
    servingSize: 'w 100g/100ml',
  });
  assert.deepEqual(rows['ADG-001014'].target.nutritionFacts, {
    calories: 347,
    fat: 2.1,
    saturatedFat: 0.5,
    carbs: 57,
    sugar: 30,
    protein: 24,
    salt: 5,
    servingSize: 'w 100g/100ml',
  });
  assert.equal(rows['ADG-001014'].target.category.id, '5825ea08-e9d9-4786-aaad-05c4dde1131e');
  assert.equal(rows['ADG-001382'].expected.nutritionFacts.salt, 50.7);
  assert.deepEqual(rows['ADG-001382'].target.nutritionFacts, rows['ADG-001382'].expected.nutritionFacts);
  assert.equal(rows['ADG-001382'].target.pricePerUnit, '311.88');
  assert.equal(rows['ADG-001383'].target.pricePerUnit, '443.13');
  assert.equal(rows['ADG-001750'].target.category.id, '691e2a51-4453-4fd9-bd02-f9abdf9a0def');
});

test('generator emits one-shot tenant-scoped apply and stale-safe rollback SQL', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'adg-catalog-data-remediation-'));
  try {
    const artifacts = generateArtifacts(directory);
    const applySql = fs.readFileSync(artifacts.apply, 'utf8');
    const rollbackSql = fs.readFileSync(artifacts.rollback, 'utf8');
    const plan = fs.readFileSync(artifacts.output, 'utf8');
    const decisionBytes = fs.readFileSync(DECISIONS_PATH);
    const decisionSha = crypto.createHash('sha256').update(decisionBytes).digest('hex');

    assert.match(applySql, /^\\set ON_ERROR_STOP on$/m);
    assert.match(rollbackSql, /^\\set ON_ERROR_STOP on$/m);
    assert.doesNotMatch(applySql, /^set ON_ERROR_STOP on$/m);
    assert.doesNotMatch(rollbackSql, /^set ON_ERROR_STOP on$/m);
    assert.match(applySql, /SET TRANSACTION ISOLATION LEVEL SERIALIZABLE/);
    assert.match(rollbackSql, /SET TRANSACTION ISOLATION LEVEL SERIALIZABLE/);
    assert.match(applySql, /SET LOCAL lock_timeout = '5s'/);
    assert.match(applySql, /SET LOCAL statement_timeout = '120s'/);
    assert.match(
      applySql,
      /WHERE salon_id = 'e73271a9-53e3-4a20-a02e-791726b452aa'::uuid\n  AND slug = 'asiandeligo'\n  AND is_active = TRUE/,
    );
    assert.match(applySql, new RegExp(decisionSha));
    assert.match(rollbackSql, new RegExp(decisionSha));
    assert.match(applySql, /CREATE TABLE asiandeligo_catalog_data_product_backup_20260721/);
    assert.match(applySql, /CREATE TABLE asiandeligo_catalog_data_audit_20260721/);
    assert.doesNotMatch(rollbackSql, /CREATE TABLE asiandeligo_catalog_data_/);
    assert.match(applySql, /original_updated_at timestamptz NOT NULL/);
    assert.match(applySql, /applied_updated_at timestamptz/);
    assert.match(applySql, /product\.updated_at = decision\.expected_updated_at/);
    assert.match(applySql, /product\.updated_at = backup\.original_updated_at/);
    assert.match(rollbackSql, /product\.updated_at = backup\.applied_updated_at/);
    assert.match(rollbackSql, /refusing to overwrite intervening edits/);
    assert.match(applySql, /zz_enforce_products_monotonic_updated_at/);
    assert.match(rollbackSql, /zz_enforce_products_monotonic_updated_at/);
    assert.match(applySql, /Expected 6 persistent product backup rows/);
    assert.match(applySql, /Expected 6 exact product updates/);
    assert.match(applySql, /Expected 6 applied updated_at captures/);
    assert.match(rollbackSql, /Expected 6 exact product restorations/);
    assert.match(applySql, /"salt":50\.7/);
    assert.doesNotMatch(applySql, /"salt":0\.0507/);
    assert.match(applySql, /'623\.75'::numeric, '311\.88'::numeric/);
    assert.match(applySql, /'886\.25'::numeric, '443\.13'::numeric/);
    assert.match(applySql, /43098ab7-106a-47f1-b91b-aa497c1c62db/);
    assert.match(applySql, /5825ea08-e9d9-4786-aaad-05c4dde1131e/);
    assert.match(applySql, /7da30509-aad0-475e-ab39-ca7764bffda2/);
    assert.match(applySql, /691e2a51-4453-4fd9-bd02-f9abdf9a0def/);
    assert.doesNotMatch(applySql, /UPDATE\s+(categories|product_variants)\b/i);
    assert.doesNotMatch(rollbackSql, /UPDATE\s+(categories|product_variants)\b/i);
    assert.doesNotMatch(applySql, /^\s*DELETE\s+FROM\b/im);
    assert.doesNotMatch(rollbackSql, /^\s*DELETE\s+FROM\b/im);
    assert.doesNotMatch(applySql, /^\s*DROP\s+TABLE\b/im);
    assert.doesNotMatch(rollbackSql, /^\s*DROP\s+TABLE\b/im);
    const backupAuditInsert = /INSERT INTO asiandeligo_catalog_data_audit_20260721 \([\s\S]*?'backup_captured', 6\n\s+FROM _adg_catalog_data_run;/.exec(applySql);
    assert.ok(backupAuditInsert, 'concrete backup_captured audit insert must exist');
    assert.ok(
      backupAuditInsert.index < applySql.indexOf('UPDATE products product'),
      'concrete persistent backup audit insert must precede product mutation',
    );
    assert.match(plan, /Production mutation in this preparation step: none/);
    assert.match(plan, new RegExp(decisionSha));
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('generator rejects an altered approved value', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'adg-catalog-data-invalid-'));
  try {
    const decisions = JSON.parse(fs.readFileSync(DECISIONS_PATH, 'utf8'));
    decisions.products.find((row) => row.sku === 'ADG-001383').target.pricePerUnit = '1.00';
    const alteredInput = path.join(directory, 'altered-decisions.json');
    fs.writeFileSync(alteredInput, `${JSON.stringify(decisions, null, 2)}\n`);
    assert.throws(
      () => generateArtifacts(directory, alteredInput),
      /Unexpected exact pricePerUnit transition for ADG-001383/,
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('committed artifacts are byte-for-byte generated from the reviewed decisions', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'adg-catalog-data-artifacts-'));
  try {
    const artifacts = generateArtifacts(directory);
    assert.equal(fs.readFileSync(artifacts.output, 'utf8'), fs.readFileSync(PLAN_PATH, 'utf8'));
    assert.equal(fs.readFileSync(artifacts.apply, 'utf8'), fs.readFileSync(APPLY_PATH, 'utf8'));
    assert.equal(fs.readFileSync(artifacts.rollback, 'utf8'), fs.readFileSync(ROLLBACK_PATH, 'utf8'));
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
