import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { access, copyFile, mkdir, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const serverEntry = resolve(appDir, '.next/standalone/server.js');
const imageFixtureSource = resolve(appDir, 'public/brand/asia-deli-go-logo.jpg');
const imageFixtureDir = resolve(appDir, '.next/standalone/public/__image-smoke__');
const imageFixtureName = 'source.jpg';
const configFixtureSource = resolve(appDir, 'public/config/asiandeligo.json');
const configFixtureDir = resolve(appDir, '.next/standalone/public/config');
const configFixtureName = 'asiandeligo.json';

await access(serverEntry);
await access(imageFixtureSource);
await access(configFixtureSource);

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
  const { port } = address;

  socket.close();
  await once(socket, 'close');
  return port;
}

await rm(imageFixtureDir, { recursive: true, force: true });
await rm(configFixtureDir, { recursive: true, force: true });
await mkdir(imageFixtureDir, { recursive: true });
await mkdir(configFixtureDir, { recursive: true });
await copyFile(imageFixtureSource, resolve(imageFixtureDir, imageFixtureName));
await copyFile(configFixtureSource, resolve(configFixtureDir, configFixtureName));

const port = await reservePort();
const baseUrl = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, [serverEntry], {
  cwd: appDir,
  env: {
    ...process.env,
    HOSTNAME: '127.0.0.1',
    NEXT_PUBLIC_STATIC_CONFIG_URL: `/config/${configFixtureName}`,
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
      throw new Error(`Standalone server exited early (${server.exitCode}).\n${serverOutput}`);
    }

    try {
      await fetch(`${baseUrl}/en`, { redirect: 'manual' });
      return;
    } catch {
      await delay(100);
    }
  }

  throw new Error(`Standalone server did not become ready.\n${serverOutput}`);
}

function redirectTarget(response) {
  assert.equal(response.status, 307);
  const location = response.headers.get('location');
  assert(location, 'Expected a Location header');
  return new URL(location, baseUrl);
}

async function assertOptimizedImage(baseUrl, accept, expectedType) {
  const response = await fetch(
    `${baseUrl}/_next/image?url=%2F__image-smoke__%2F${imageFixtureName}&w=256&q=75`,
    { headers: { Accept: accept } },
  );
  assert.equal(response.status, 200, `image optimizer must encode ${expectedType}`);
  assert.equal(response.headers.get('content-type'), expectedType);

  const body = Buffer.from(await response.arrayBuffer());
  assert(body.length > 100, `${expectedType} optimizer output must not be empty`);
  if (expectedType === 'image/avif') {
    assert.equal(body.subarray(4, 8).toString('ascii'), 'ftyp');
    assert(
      ['avif', 'avis', 'mif1'].includes(body.subarray(8, 12).toString('ascii')),
      'AVIF output must expose a supported file-type brand',
    );
  } else if (expectedType === 'image/webp') {
    assert.equal(body.subarray(0, 4).toString('ascii'), 'RIFF');
    assert.equal(body.subarray(8, 12).toString('ascii'), 'WEBP');
  } else {
    assert.deepEqual([...body.subarray(0, 3)], [0xff, 0xd8, 0xff]);
  }
}

try {
  await waitForReady();

  for (const pathname of ['/', '/login', '/register', '/products', '/en', '/en/login']) {
    const response = await fetch(`${baseUrl}${pathname}`, { redirect: 'manual' });
    assert.equal(response.status, 200, `${pathname} must render without a redirect loop`);
  }

  const rootResponse = await fetch(`${baseUrl}/`, { redirect: 'manual' });
  assert.match(rootResponse.headers.get('content-security-policy') ?? '', /default-src 'self'/);
  assert.equal(rootResponse.headers.get('x-powered-by'), null);
  assert.match(await rootResponse.text(), /Azjatyckie produkty spożywcze na co dzień/);

  await assertOptimizedImage(baseUrl, 'image/jpeg', 'image/jpeg');
  await assertOptimizedImage(baseUrl, 'image/webp', 'image/webp');
  await assertOptimizedImage(baseUrl, 'image/avif', 'image/avif');

  const prefixedDefaultLocale = redirectTarget(
    await fetch(`${baseUrl}/pl`, { redirect: 'manual' }),
  );
  assert.equal(prefixedDefaultLocale.pathname, '/');

  const guestAccount = redirectTarget(
    await fetch(`${baseUrl}/account`, { redirect: 'manual' }),
  );
  assert.equal(guestAccount.origin, baseUrl);
  assert.equal(guestAccount.pathname, '/login');
  assert.equal(guestAccount.searchParams.get('returnTo'), '/account');

  const legacyLocale = redirectTarget(
    await fetch(`${baseUrl}/vi/login?source=legacy`, { redirect: 'manual' }),
  );
  assert.equal(legacyLocale.origin, baseUrl);
  assert.equal(legacyLocale.pathname, '/en/login');
  assert.equal(legacyLocale.searchParams.get('source'), 'legacy');

  const resetPassword = redirectTarget(
    await fetch(`${baseUrl}/reset-password?token=runtime-secret`, { redirect: 'manual' }),
  );
  assert.equal(resetPassword.origin, baseUrl);
  assert.equal(resetPassword.pathname, '/reset-password');
  assert.equal(resetPassword.searchParams.has('token'), false);
  assert.equal(resetPassword.hash, '#token=runtime-secret');

  console.log('Production standalone smoke passed');
} finally {
  if (server.exitCode == null) {
    server.kill('SIGTERM');
    await Promise.race([once(server, 'exit'), delay(3_000)]);
  }
  await rm(imageFixtureDir, { recursive: true, force: true });
  await rm(configFixtureDir, { recursive: true, force: true });
}
