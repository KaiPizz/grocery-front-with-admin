import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

test('generates guarded and reversible blocker unpublish SQL', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'adg-blocker-unpublish-'));
  const output = path.join(directory, 'plan.md');
  const apply = path.join(directory, 'apply.sql');
  const rollback = path.join(directory, 'rollback.sql');
  const reviewCsv = path.join(directory, 'review.csv');

  try {
    execFileSync(process.execPath, [
      'scripts/catalog-blocker-unpublish-plan.mjs',
      '--input', 'docs/asiandeligo-catalog-blocker-unpublish-decisions-20260713.json',
      '--output', output,
      '--apply', apply,
      '--rollback', rollback,
      '--review-csv', reviewCsv,
    ], { cwd: process.cwd(), stdio: 'pipe' });

    const applySql = fs.readFileSync(apply, 'utf8');
    const rollbackSql = fs.readFileSync(rollback, 'utf8');
    const plan = fs.readFileSync(output, 'utf8');
    const ownerQueue = fs.readFileSync(reviewCsv, 'utf8');

    assert.match(applySql, /Blocker publication precondition failed/);
    assert.match(applySql, /Expected 5 publication updates/);
    assert.match(applySql, /'ADG-001782'.*'active'.*'draft'.*TRUE.*FALSE/);
    assert.match(rollbackSql, /'ADG-001782'.*'draft'.*'active'.*FALSE.*TRUE/);
    assert.doesNotMatch(applySql, /UPDATE product_variants/);
    assert.match(plan, /published count 1779/);
    assert.match(ownerQueue, /Marukome dried rice koji 100g/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
