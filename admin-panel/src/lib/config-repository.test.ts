import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  ConfigVersionConflictError,
  readStoredConfig,
  saveDraftConfig,
} from './config-repository';
import { DEFAULT_CONFIG } from './defaults';

test('version-checks and serializes draft writes', async (context) => {
  const previousDataDir = process.env.ADMIN_DATA_DIR;
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'admin-config-test-'));
  process.env.ADMIN_DATA_DIR = dataDir;
  context.after(async () => {
    if (previousDataDir === undefined) delete process.env.ADMIN_DATA_DIR;
    else process.env.ADMIN_DATA_DIR = previousDataDir;
    await fs.rm(dataDir, { recursive: true, force: true });
  });

  const config = structuredClone(DEFAULT_CONFIG);
  const first = await saveDraftConfig('asiandeligo', config, 0);
  assert.equal(first.version, 1);

  await assert.rejects(
    saveDraftConfig('asiandeligo', config, 0),
    ConfigVersionConflictError
  );

  const competing = await Promise.allSettled([
    saveDraftConfig('kenmito', config, 0),
    saveDraftConfig('kenmito', config, 0),
  ]);
  assert.equal(competing.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(competing.filter((result) => result.status === 'rejected').length, 1);

  const files = await fs.readdir(dataDir);
  assert.equal(files.some((filename) => filename.includes('.tmp-')), false);
});

test('only treats ENOENT as a missing config', async (context) => {
  const previousDataDir = process.env.ADMIN_DATA_DIR;
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'admin-config-invalid-'));
  process.env.ADMIN_DATA_DIR = dataDir;
  context.after(async () => {
    if (previousDataDir === undefined) delete process.env.ADMIN_DATA_DIR;
    else process.env.ADMIN_DATA_DIR = previousDataDir;
    await fs.rm(dataDir, { recursive: true, force: true });
  });

  assert.equal(await readStoredConfig('missing-store'), null);
  await fs.writeFile(path.join(dataDir, 'config-broken-store.json'), '{not-json', 'utf8');
  await assert.rejects(readStoredConfig('broken-store'), SyntaxError);
});
