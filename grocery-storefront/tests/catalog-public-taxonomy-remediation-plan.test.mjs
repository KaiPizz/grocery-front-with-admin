import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const DECISIONS_PATH = 'docs/asiandeligo-public-taxonomy-decisions-20260720-v2.json';
const COMMITTED_PLAN_PATH = 'docs/asiandeligo-public-taxonomy-remediation-20260720-v2.md';
const COMMITTED_APPLY_PATH = 'docs/asiandeligo-public-taxonomy-remediation-apply-20260720-v2.sql';
const COMMITTED_ROLLBACK_PATH = 'docs/asiandeligo-public-taxonomy-remediation-rollback-20260720-v2.sql';

const EXPECTED_MAPPINGS = {
  'ADG-000103': ['unmapped', 'sosy-marynaty', 'high'],
  'ADG-000277': ['pozostałe-produkty', 'ryż-i-inne-ziarna', 'medium'],
  'ADG-000393': ['unmapped', 'ryż-i-inne-ziarna', 'high'],
  'ADG-000607': ['kategoria-tymczasowa', 'prezenty', 'high'],
  'ADG-000641': ['unmapped', 'pasty-smakowe', 'medium'],
  'ADG-000648': ['unmapped', 'pasty-smakowe', 'high'],
  'ADG-000690': ['kategoria-tymczasowa', 'przyprawy', 'high'],
  'ADG-000781': ['unmapped', 'ryż-i-inne-ziarna', 'high'],
  'ADG-000791': ['unmapped', 'buliony', 'high'],
  'ADG-001694': ['kategoria-tymczasowa', 'przyprawy', 'high'],
};

const FORBIDDEN_DUPLICATE_MERGE_SKUS = [
  'ADG-000527',
  'ADG-000528',
  'ADG-000529',
  'ADG-000530',
  'ADG-000668',
  'ADG-001413',
  'ADG-001414',
  'ADG-001712',
];

function countMatches(value, pattern) {
  return [...value.matchAll(pattern)].length;
}

test('v2 decisions cover exactly the ten omitted public-category products', () => {
  const decisions = JSON.parse(fs.readFileSync(DECISIONS_PATH, 'utf8'));
  assert.equal(decisions.version, 2);
  assert.equal(decisions.batch, 'asiandeligo-public-taxonomy-backup-20260720-v1');
  assert.equal(decisions.channel, 'asiandeligo');
  assert.equal(decisions.salonId, 'e73271a9-53e3-4a20-a02e-791726b452aa');
  assert.equal(decisions.categoryMoves.length, 10);
  assert.equal(decisions.categoryStateChanges.length, 2);
  assert.deepEqual(decisions.retainedCategoryChecks, [{
    slug: 'pozostałe-produkty',
    expectedActive: true,
    expectedProductsBeforeMove: 7,
    expectedProductsAfterMove: 6,
  }]);

  const actualMappings = Object.fromEntries(decisions.categoryMoves.map((row) => [
    row.sku,
    [row.expectedCategorySlug, row.targetCategorySlug, row.confidence],
  ]));
  assert.deepEqual(actualMappings, EXPECTED_MAPPINGS);
  assert.deepEqual(
    decisions.categoryMoves.filter((row) => row.confidence === 'medium').map((row) => row.sku).sort(),
    ['ADG-000277', 'ADG-000641'],
  );
  assert.ok(decisions.categoryMoves.every((row) => row.mappingType === 'business'));
  assert.deepEqual(
    decisions.categoryStateChanges.map((row) => row.slug).sort(),
    ['kategoria-tymczasowa', 'unmapped'],
  );
  assert.ok(decisions.retainedCategories.some((row) => row.slug === 'pozostałe-produkty'));

  for (const sku of FORBIDDEN_DUPLICATE_MERGE_SKUS) {
    assert.equal(decisions.categoryMoves.some((row) => row.sku === sku), false, `${sku} must stay outside v2`);
  }
  for (const slug of ['pozostałe-produkty', 'sosy-i-marynaty', 'sosy-sojowe']) {
    assert.equal(decisions.categoryStateChanges.some((row) => row.slug === slug), false, `${slug} must not be deactivated`);
  }
});

test('generates persistent tenant-scoped backups, exact guards, and ID-based rollback', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'adg-public-taxonomy-v2-'));
  const output = path.join(directory, 'plan.md');
  const apply = path.join(directory, 'apply.sql');
  const rollback = path.join(directory, 'rollback.sql');

  try {
    execFileSync(process.execPath, [
      'scripts/catalog-public-taxonomy-remediation-plan.mjs',
      '--input', DECISIONS_PATH,
      '--output', output,
      '--apply', apply,
      '--rollback', rollback,
    ], { cwd: process.cwd(), stdio: 'pipe' });

    const applySql = fs.readFileSync(apply, 'utf8');
    const rollbackSql = fs.readFileSync(rollback, 'utf8');
    const plan = fs.readFileSync(output, 'utf8');

    assert.match(applySql, /SET TRANSACTION ISOLATION LEVEL SERIALIZABLE/);
    assert.match(applySql, /SET LOCAL statement_timeout = '120s'/);
    assert.match(applySql, /SET LOCAL search_path = public, pg_catalog/);
    assert.match(
      applySql,
      /WHERE salon_id = 'e73271a9-53e3-4a20-a02e-791726b452aa'::uuid\n\s+AND slug = 'asiandeligo'\n\s+AND is_active = TRUE/,
    );
    assert.match(
      rollbackSql,
      /WHERE salon_id = 'e73271a9-53e3-4a20-a02e-791726b452aa'::uuid\n\s+AND slug = 'asiandeligo'\n\s+AND is_active = TRUE/,
    );
    assert.match(applySql, /CREATE TABLE asiandeligo_public_taxonomy_product_backup_20260720/);
    assert.match(applySql, /CREATE TABLE asiandeligo_public_taxonomy_category_backup_20260720/);
    assert.match(applySql, /CREATE TABLE asiandeligo_public_taxonomy_audit_20260720/);
    assert.equal(
      countMatches(
        applySql,
        /batch_key text NOT NULL CHECK \(batch_key = 'asiandeligo-public-taxonomy-backup-20260720-v1'\)/g,
      ),
      3,
    );
    assert.equal(
      countMatches(
        applySql,
        /salon_id uuid NOT NULL CHECK \(salon_id = 'e73271a9-53e3-4a20-a02e-791726b452aa'::uuid\)/g,
      ),
      3,
    );
    assert.match(applySql, /captured_at timestamptz NOT NULL/);
    assert.match(applySql, /recorded_at timestamptz NOT NULL/);
    assert.match(applySql, /original_updated_at timestamptz NOT NULL/);
    assert.match(applySql, /applied_updated_at timestamptz/);
    assert.match(applySql, /Expected 10 product backup rows/);
    assert.match(applySql, /Expected 2 category backup rows/);
    assert.match(applySql, /Persistent product backup count guard failed/);
    assert.match(applySql, /Persistent category backup count guard failed/);
    assert.match(applySql, /Expected 10 product category updates/);
    assert.match(applySql, /Expected 2 category deactivations/);
    assert.match(applySql, /Expected 2 category sync timestamps/);
    assert.match(applySql, /Exact apply post-state verification failed/);
    assert.match(applySql, /\('pozostałe-produkty', TRUE, 7, 6\)/);
    assert.match(applySql, /Retained category before-count precondition failed/);
    assert.match(applySql, /Retained category post-apply count guard failed/);
    assert.ok(
      applySql.indexOf("'backup_captured'") < applySql.indexOf('UPDATE products product'),
      'backup audit must be captured before product mutation',
    );

    const tenantScopedBackupJoins = countMatches(
      `${applySql}\n${rollbackSql}`,
      /backup\.batch_key = run\.batch_key\n\s+AND backup\.channel_slug = run\.channel_slug\n\s+AND backup\.salon_id = run\.salon_id/g,
    );
    assert.ok(tenantScopedBackupJoins >= 10, 'all backup reads must include batch, channel, and salon scope');

    assert.match(rollbackSql, /product\.category_id = backup\.target_category_id/);
    assert.match(rollbackSql, /SET category_id = backup\.original_category_id/);
    assert.match(rollbackSql, /SET is_active = backup\.original_is_active/);
    assert.match(
      applySql,
      /UPDATE categories category\n\s+SET is_active = backup\.target_is_active,\n\s+updated_at = GREATEST\(category\.updated_at \+ INTERVAL '1 microsecond', clock_timestamp\(\)\)/,
    );
    assert.match(
      rollbackSql,
      /UPDATE categories category\n\s+SET is_active = backup\.original_is_active,\n\s+updated_at = GREATEST\(category\.updated_at \+ INTERVAL '1 microsecond', clock_timestamp\(\)\)/,
    );
    assert.match(applySql, /SET applied_updated_at = category\.updated_at/);
    assert.match(rollbackSql, /category\.updated_at = backup\.applied_updated_at/);
    assert.match(rollbackSql, /Exact product post-apply state precondition failed/);
    assert.match(rollbackSql, /Exact category post-apply state precondition failed/);
    assert.match(rollbackSql, /Backup restoration verification failed/);
    assert.match(rollbackSql, /Expected 10 product restorations from backup/);
    assert.match(rollbackSql, /Expected 2 category restorations from backup/);
    assert.match(rollbackSql, /Retained category exact post-apply state precondition failed/);
    assert.match(rollbackSql, /Retained category rollback count verification failed/);
    assert.doesNotMatch(rollbackSql, /CREATE TABLE asiandeligo_public_taxonomy_/);

    assert.doesNotMatch(applySql, /\bDELETE\b/i);
    assert.doesNotMatch(rollbackSql, /\bDELETE\b/i);
    assert.doesNotMatch(
      applySql,
      /UPDATE products product\n\s+SET category_id = backup\.target_category_id,\n\s+updated_at/i,
    );
    assert.doesNotMatch(
      rollbackSql,
      /UPDATE products product\n\s+SET category_id = backup\.original_category_id,\n\s+updated_at/i,
    );
    for (const sku of FORBIDDEN_DUPLICATE_MERGE_SKUS) {
      assert.equal(applySql.includes(sku), false, `${sku} leaked into v2 apply SQL`);
      assert.equal(rollbackSql.includes(sku), false, `${sku} leaked into v2 rollback SQL`);
    }
    for (const slug of ['sosy-i-marynaty', 'sosy-sojowe']) {
      assert.equal(applySql.includes(slug), false, `${slug} leaked into v2 apply SQL`);
      assert.equal(rollbackSql.includes(slug), false, `${slug} leaked into v2 rollback SQL`);
    }
    assert.doesNotMatch(
      applySql,
      /\('(pozostałe-produkty|sosy-i-marynaty|sosy-sojowe)', TRUE, FALSE, \d+\)/,
    );
    assert.doesNotMatch(
      rollbackSql,
      /\('(pozostałe-produkty|sosy-i-marynaty|sosy-sojowe)', TRUE, FALSE, \d+\)/,
    );

    assert.match(plan, /Exactly 10 live products are in scope/);
    assert.match(plan, /ADG-000277.*medium/);
    assert.match(plan, /ADG-000641.*medium/);
    assert.match(plan, /`pozostałe-produkty` stays active/);
    assert.match(plan, /Production mutation in this preparation step: none/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('committed v2 artifacts are generated byte-for-byte from the reviewed decisions', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'adg-public-taxonomy-v2-artifacts-'));
  const output = path.join(directory, 'plan.md');
  const apply = path.join(directory, 'apply.sql');
  const rollback = path.join(directory, 'rollback.sql');

  try {
    execFileSync(process.execPath, [
      'scripts/catalog-public-taxonomy-remediation-plan.mjs',
      '--input', DECISIONS_PATH,
      '--output', output,
      '--apply', apply,
      '--rollback', rollback,
    ], { cwd: process.cwd(), stdio: 'pipe' });

    assert.equal(fs.readFileSync(output, 'utf8'), fs.readFileSync(COMMITTED_PLAN_PATH, 'utf8'));
    assert.equal(fs.readFileSync(apply, 'utf8'), fs.readFileSync(COMMITTED_APPLY_PATH, 'utf8'));
    assert.equal(fs.readFileSync(rollback, 'utf8'), fs.readFileSync(COMMITTED_ROLLBACK_PATH, 'utf8'));
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
