import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { access } from 'node:fs/promises';
import { createServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const serverEntry = resolve(appDir, '.next/standalone/server.js');

await access(serverEntry);

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

const port = await reservePort();
const baseUrl = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, [serverEntry], {
  cwd: appDir,
  env: {
    ...process.env,
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

try {
  await waitForReady();

  for (const pathname of ['/', '/login', '/register', '/products', '/en', '/en/login']) {
    const response = await fetch(`${baseUrl}${pathname}`, { redirect: 'manual' });
    assert.equal(response.status, 200, `${pathname} must render without a redirect loop`);
  }

  const rootResponse = await fetch(`${baseUrl}/`, { redirect: 'manual' });
  assert.match(rootResponse.headers.get('content-security-policy') ?? '', /default-src 'self'/);
  assert.equal(rootResponse.headers.get('x-powered-by'), null);

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
}
