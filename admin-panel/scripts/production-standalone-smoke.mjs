import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import {
  access,
  copyFile,
  mkdir,
  mkdtemp,
  rm,
} from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const serverEntry = resolve(appDir, '.next/standalone/server.js');
const fixtureConfig = resolve(appDir, 'data/config-asiandeligo.json');

await access(serverEntry);
await access(fixtureConfig);

const delay = (milliseconds) => new Promise((resolveDelay) => {
  setTimeout(resolveDelay, milliseconds);
});

async function reservePort() {
  const socket = createServer();
  socket.unref();
  socket.listen(0, '127.0.0.1');
  await once(socket, 'listening');
  const address = socket.address();
  assert(address && typeof address === 'object');
  socket.close();
  await once(socket, 'close');
  return address.port;
}

const runtimeRoot = await mkdtemp(join(tmpdir(), 'asiandeligo-admin-smoke-'));
const dataDir = join(runtimeRoot, 'data');
const uploadDir = join(runtimeRoot, 'uploads');
await mkdir(dataDir);
await mkdir(uploadDir);
await copyFile(fixtureConfig, join(dataDir, 'config-asiandeligo.json'));

const port = await reservePort();
const baseUrl = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, [serverEntry], {
  cwd: appDir,
  env: {
    ...process.env,
    ADMIN_DATA_DIR: dataDir,
    ADMIN_UPLOAD_DIR: uploadDir,
    HOSTNAME: '127.0.0.1',
    NODE_ENV: 'production',
    PORT: String(port),
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let serverOutput = '';
for (const stream of [server.stdout, server.stderr]) {
  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    serverOutput += chunk;
  });
}

async function waitForReady() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (server.exitCode != null) {
      throw new Error(`Admin standalone exited early (${server.exitCode}).\n${serverOutput}`);
    }
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {
      // Retry while the standalone server starts.
    }
    await delay(100);
  }
  throw new Error(`Admin standalone did not become ready.\n${serverOutput}`);
}

try {
  await waitForReady();

  const health = await fetch(`${baseUrl}/api/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(
    Object.fromEntries(Object.entries(await health.json()).filter(([key]) => key !== 'timestamp')),
    { status: 'ok', service: 'storefront-admin-panel' },
  );

  const login = await fetch(`${baseUrl}/login`, { redirect: 'manual' });
  assert.equal(login.status, 200);
  assert.match(login.headers.get('cache-control') ?? '', /no-store/i);
  assert.equal(login.headers.get('x-powered-by'), null);

  const admin = await fetch(`${baseUrl}/admin`, { redirect: 'manual' });
  assert.equal(admin.status, 307);
  const location = new URL(admin.headers.get('location'), baseUrl);
  assert.equal(location.pathname, '/login');
  assert.equal(location.searchParams.get('from'), '/admin');

  const draft = await fetch(`${baseUrl}/api/config/asiandeligo?draft=true`);
  assert.equal(draft.status, 401);

  const published = await fetch(`${baseUrl}/api/config/asiandeligo`);
  assert.equal(published.status, 200);
  assert.equal(typeof await published.json(), 'object');

  console.log('Admin production standalone smoke passed');
} finally {
  if (server.exitCode == null) {
    server.kill('SIGTERM');
    await Promise.race([once(server, 'exit'), delay(3_000)]);
  }
  await rm(runtimeRoot, { recursive: true, force: true });
}
