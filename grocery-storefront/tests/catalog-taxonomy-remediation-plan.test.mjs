import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

test('generates guarded and reversible taxonomy SQL', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'adg-taxonomy-remediation-'));
  const output = path.join(directory, 'plan.md');
  const apply = path.join(directory, 'apply.sql');
  const rollback = path.join(directory, 'rollback.sql');

  try {
    execFileSync(process.execPath, [
      'scripts/catalog-taxonomy-remediation-plan.mjs',
      '--input', 'docs/asiandeligo-catalog-taxonomy-decisions-20260713.json',
      '--output', output,
      '--apply', apply,
      '--rollback', rollback,
    ], { cwd: process.cwd(), stdio: 'pipe' });

    const applySql = fs.readFileSync(apply, 'utf8');
    const rollbackSql = fs.readFileSync(rollback, 'utf8');
    const plan = fs.readFileSync(output, 'utf8');

    assert.match(applySql, /Source category state precondition failed/);
    assert.match(applySql, /Expected 18 product category updates/);
    assert.match(applySql, /'ADG-000393', 'unmapped', 'ryż-i-inne-ziarna', TRUE/);
    assert.match(rollbackSql, /'ADG-000393', 'ryż-i-inne-ziarna', 'unmapped', FALSE/);
    assert.match(applySql, /Expected 4 category deactivations/);
    assert.match(rollbackSql, /Expected 4 category reactivations/);
    assert.match(plan, /Production mutation in this step: none/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
