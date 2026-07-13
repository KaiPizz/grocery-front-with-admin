import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

test('generates guarded and reversible stock/EAN SQL', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'adg-catalog-remediation-'));
  const output = path.join(directory, 'plan.md');
  const apply = path.join(directory, 'apply.sql');
  const rollback = path.join(directory, 'rollback.sql');

  try {
    execFileSync(process.execPath, [
      'scripts/catalog-review-remediation-plan.mjs',
      '--input', 'docs/asiandeligo-catalog-review-decisions-20260713.json',
      '--output', output,
      '--apply', apply,
      '--rollback', rollback,
    ], { cwd: process.cwd(), stdio: 'pipe' });

    const applySql = fs.readFileSync(apply, 'utf8');
    const rollbackSql = fs.readFileSync(rollback, 'utf8');
    const plan = fs.readFileSync(output, 'utf8');

    assert.match(applySql, /Stock precondition failed/);
    assert.match(applySql, /Expected 17 stock updates/);
    assert.match(applySql, /Variant stock synchronization failed/);
    assert.match(applySql, /trg_stock_quants_sync_variant/);
    assert.match(applySql, /'ADG-000144', 0, 100/);
    assert.match(rollbackSql, /'ADG-000144', 100, 0/);
    assert.match(applySql, /'mpn:749', '078895123395'/);
    assert.match(rollbackSql, /'078895123395', 'mpn:749'/);
    assert.match(plan, /Production mutation in this step: none/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
