import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes, scrypt as nodeScrypt } from 'node:crypto';
import { once } from 'node:events';
import {
  access,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const serverEntry = resolve(appDir, '.next/standalone/server.js');
const fixtureConfig = resolve(appDir, 'data/config-asiandeligo.json');
const imageFixtureSource = resolve(appDir, 'public/brand/asia-deli-go-logo.jpg');
const imageFixtureDir = resolve(appDir, '.next/standalone/public/__image-smoke__');
const imageFixtureName = 'source.jpg';
const adminUsername = 'smoke-admin';
const currentPassword = 'Smoke current password 2026!';
const newPassword = 'Smoke replacement password 2026!';
const configuredOrigin = 'https://admin.smoke.example';

await access(serverEntry);
await access(fixtureConfig);
await access(imageFixtureSource);

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

async function createPasswordHash(password) {
  const parameters = { N: 32768, r: 8, p: 1 };
  const salt = randomBytes(24);
  const derived = await new Promise((resolveScrypt, rejectScrypt) => {
    nodeScrypt(password, salt, 64, { ...parameters, maxmem: 64 * 1024 * 1024 }, (error, key) => {
      if (error) rejectScrypt(error);
      else resolveScrypt(key);
    });
  });
  return `scrypt:N=${parameters.N},r=${parameters.r},p=${parameters.p}:${salt.toString('base64url')}:${derived.toString('base64url')}`;
}

function sessionCookie(response) {
  const setCookie = response.headers.get('set-cookie');
  assert(setCookie, 'authentication response must set a session cookie');
  return setCookie.split(';', 1)[0];
}

async function login(baseUrl, password) {
  return fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: configuredOrigin,
    },
    body: JSON.stringify({ username: adminUsername, password }),
    redirect: 'manual',
  });
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
  if (expectedType === 'image/webp') {
    assert.equal(body.subarray(0, 4).toString('ascii'), 'RIFF');
    assert.equal(body.subarray(8, 12).toString('ascii'), 'WEBP');
  } else {
    assert.deepEqual([...body.subarray(0, 3)], [0xff, 0xd8, 0xff]);
  }
}

const runtimeRoot = await mkdtemp(join(tmpdir(), 'asiandeligo-admin-smoke-'));
const dataDir = join(runtimeRoot, 'data');
const authDir = join(runtimeRoot, 'auth');
const uploadDir = join(runtimeRoot, 'uploads');
await mkdir(dataDir);
await mkdir(authDir, { mode: 0o700 });
await mkdir(uploadDir);
await copyFile(fixtureConfig, join(dataDir, 'config-asiandeligo.json'));
await rm(imageFixtureDir, { recursive: true, force: true });
await mkdir(imageFixtureDir, { recursive: true });
await copyFile(imageFixtureSource, join(imageFixtureDir, imageFixtureName));
const initialPasswordHash = await createPasswordHash(currentPassword);
await writeFile(join(authDir, 'admin-auth-state.json'), `${JSON.stringify({
  schemaVersion: 1,
  passwordHash: initialPasswordHash,
  sessionGeneration: 1,
  updatedAt: new Date().toISOString(),
}, null, 2)}\n`, { mode: 0o600 });

const port = await reservePort();
const baseUrl = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, [serverEntry], {
  cwd: appDir,
  env: {
    ...process.env,
    ADMIN_ALLOWED_SLUGS: 'asiandeligo',
    ADMIN_AUTH_DIR: authDir,
    ADMIN_DATA_DIR: dataDir,
    ADMIN_PUBLIC_ORIGIN: configuredOrigin,
    ADMIN_SESSION_SECRET: 'smoke-only-session-secret-with-more-than-32-bytes',
    ADMIN_USERNAME: adminUsername,
    ADMIN_UPLOAD_DIR: uploadDir,
    HOSTNAME: '127.0.0.1',
    NEXT_PUBLIC_SALON_SLUG: 'asiandeligo',
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

  const loginPageResponse = await fetch(`${baseUrl}/login`, { redirect: 'manual' });
  assert.equal(loginPageResponse.status, 200);
  assert.match(loginPageResponse.headers.get('cache-control') ?? '', /no-store/i);
  assert.equal(loginPageResponse.headers.get('x-powered-by'), null);

  await assertOptimizedImage(baseUrl, 'image/jpeg', 'image/jpeg');
  await assertOptimizedImage(baseUrl, 'image/webp', 'image/webp');

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

  const authenticated = await login(baseUrl, currentPassword);
  assert.equal(authenticated.status, 200);
  assert.deepEqual(await authenticated.json(), { success: true });
  const firstCookie = sessionCookie(authenticated);

  const protectedDraft = await fetch(`${baseUrl}/api/config/asiandeligo?draft=true`, {
    headers: { Cookie: firstCookie },
  });
  assert.equal(protectedDraft.status, 200);

  const securityPage = await fetch(`${baseUrl}/admin/security`, {
    headers: { Cookie: firstCookie },
    redirect: 'manual',
  });
  assert.equal(securityPage.status, 200);

  const passwordChange = await fetch(`${baseUrl}/api/auth/password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: firstCookie,
      Origin: configuredOrigin,
    },
    body: JSON.stringify({
      currentPassword,
      newPassword,
      confirmation: newPassword,
    }),
  });
  assert.equal(passwordChange.status, 200);
  assert.deepEqual(await passwordChange.json(), { success: true });

  const staleAfterChange = await fetch(`${baseUrl}/api/config/asiandeligo?draft=true`, {
    headers: { Cookie: firstCookie },
  });
  assert.equal(staleAfterChange.status, 401);

  const oldPasswordLogin = await login(baseUrl, currentPassword);
  assert.equal(oldPasswordLogin.status, 401);
  const newPasswordLogin = await login(baseUrl, newPassword);
  assert.equal(newPasswordLogin.status, 200);
  const secondCookie = sessionCookie(newPasswordLogin);

  const hostileLogout = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: { Cookie: secondCookie, Origin: 'https://attacker.example' },
  });
  assert.equal(hostileLogout.status, 403);

  const externalLockPath = join(authDir, 'admin-auth-state.lock');
  await writeFile(
    externalLockPath,
    `${JSON.stringify({ pid: 99999, createdAt: new Date().toISOString() })}\n`,
    { mode: 0o600 }
  );
  try {
    const busyLogout = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: secondCookie, Origin: configuredOrigin },
    });
    assert.equal(busyLogout.status, 503);
    assert.equal(busyLogout.headers.get('set-cookie'), null);
  } finally {
    await unlink(externalLockPath);
  }

  const copiedCookieAfterBusyLogout = await fetch(
    `${baseUrl}/api/config/asiandeligo?draft=true`,
    { headers: { Cookie: secondCookie } }
  );
  assert.equal(copiedCookieAfterBusyLogout.status, 200);

  const logout = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: { Cookie: secondCookie, Origin: configuredOrigin },
  });
  assert.equal(logout.status, 200);

  const copiedCookieAfterLogout = await fetch(`${baseUrl}/api/config/asiandeligo?draft=true`, {
    headers: { Cookie: secondCookie },
  });
  assert.equal(copiedCookieAfterLogout.status, 401);

  const storedAuthState = await readFile(join(authDir, 'admin-auth-state.json'), 'utf8');
  const parsedAuthState = JSON.parse(storedAuthState);
  assert.equal(parsedAuthState.sessionGeneration, 3);
  assert.doesNotMatch(storedAuthState, new RegExp(currentPassword, 'u'));
  assert.doesNotMatch(storedAuthState, new RegExp(newPassword, 'u'));

  console.log('Admin production standalone auth and revocation smoke passed');
} finally {
  if (server.exitCode == null) {
    server.kill('SIGTERM');
    await Promise.race([once(server, 'exit'), delay(3_000)]);
  }
  await rm(runtimeRoot, { recursive: true, force: true });
  await rm(imageFixtureDir, { recursive: true, force: true });
}
