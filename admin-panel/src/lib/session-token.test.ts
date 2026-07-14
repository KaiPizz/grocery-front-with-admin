import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';

import {
  createSessionToken,
  getSessionCookieName,
  SessionConfigurationError,
  verifySessionToken,
} from './session-token';

const mutableEnv = process.env as Record<string, string | undefined>;
const originalSecret = process.env.ADMIN_SESSION_SECRET;
const originalPasswordHash = process.env.ADMIN_PASSWORD_HASH;
const originalNodeEnv = process.env.NODE_ENV;
const secureTestSecret = 'test-only-session-secret-with-at-least-32-bytes';

beforeEach(() => {
  process.env.ADMIN_SESSION_SECRET = secureTestSecret;
  process.env.ADMIN_PASSWORD_HASH = 'test-only-password-hash-binding';
  mutableEnv.NODE_ENV = 'test';
});

afterEach(() => {
  if (originalSecret === undefined) delete process.env.ADMIN_SESSION_SECRET;
  else process.env.ADMIN_SESSION_SECRET = originalSecret;
  if (originalPasswordHash === undefined) delete process.env.ADMIN_PASSWORD_HASH;
  else process.env.ADMIN_PASSWORD_HASH = originalPasswordHash;
  if (originalNodeEnv === undefined) delete mutableEnv.NODE_ENV;
  else mutableEnv.NODE_ENV = originalNodeEnv;
});

test('creates unique signed sessions with server-enforced timestamps', async () => {
  const nowMs = 1_750_000_000_000;
  const first = await createSessionToken('operator', { nowMs, maxAgeSeconds: 600 });
  const second = await createSessionToken('operator', { nowMs, maxAgeSeconds: 600 });

  assert.notEqual(first, second);
  const session = await verifySessionToken(first, { nowMs: nowMs + 30_000 });
  assert.equal(session?.username, 'operator');
  assert.equal(session?.issuedAt, Math.floor(nowMs / 1000));
  assert.equal(session?.expiresAt, Math.floor(nowMs / 1000) + 600);
  assert.match(session?.nonce ?? '', /^[A-Za-z0-9_-]{24}$/);

  assert.equal(
    await verifySessionToken(first, { nowMs: nowMs + 600_000 }),
    null
  );
});

test('rejects a tampered session token', async () => {
  const token = await createSessionToken('operator');
  const parts = token.split('.');
  const firstCharacter = parts[1][0] === 'A' ? 'B' : 'A';
  parts[1] = `${firstCharacter}${parts[1].slice(1)}`;

  assert.equal(await verifySessionToken(parts.join('.')), null);
});

test('invalidates existing sessions when the password hash changes', async () => {
  const token = await createSessionToken('operator');
  process.env.ADMIN_PASSWORD_HASH = 'rotated-test-only-password-hash-binding';

  assert.equal(await verifySessionToken(token), null);
});

test('fails closed when the signing secret is absent or insecure', async () => {
  const validToken = await createSessionToken('operator');

  delete process.env.ADMIN_SESSION_SECRET;
  await assert.rejects(
    verifySessionToken(validToken),
    SessionConfigurationError
  );

  process.env.ADMIN_SESSION_SECRET = 'fallback-dev-secret';
  await assert.rejects(
    createSessionToken('operator'),
    SessionConfigurationError
  );
});

test('uses a __Host- cookie name only in production', () => {
  mutableEnv.NODE_ENV = 'production';
  assert.equal(getSessionCookieName(), '__Host-admin-session');
  mutableEnv.NODE_ENV = 'test';
  assert.equal(getSessionCookieName(), 'admin-session');
});
