import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { NextRequest } from 'next/server';

import { requireAdminSession } from './auth';
import { createSessionToken, getSessionCookieName } from './session-token';

const mutableEnv = process.env as Record<string, string | undefined>;
const originalSecret = process.env.ADMIN_SESSION_SECRET;
const originalPasswordHash = process.env.ADMIN_PASSWORD_HASH;
const originalPublicOrigin = process.env.ADMIN_PUBLIC_ORIGIN;
const originalNodeEnv = process.env.NODE_ENV;
const originalUsername = process.env.ADMIN_USERNAME;

beforeEach(() => {
  mutableEnv.NODE_ENV = 'production';
  process.env.ADMIN_SESSION_SECRET =
    'test-only-session-secret-with-at-least-32-bytes';
  process.env.ADMIN_PASSWORD_HASH = 'test-only-password-hash-binding';
  process.env.ADMIN_PUBLIC_ORIGIN = 'https://admin.example.test';
  process.env.ADMIN_USERNAME = 'operator';
});

afterEach(() => {
  if (originalSecret === undefined) delete process.env.ADMIN_SESSION_SECRET;
  else process.env.ADMIN_SESSION_SECRET = originalSecret;
  if (originalPasswordHash === undefined) delete process.env.ADMIN_PASSWORD_HASH;
  else process.env.ADMIN_PASSWORD_HASH = originalPasswordHash;
  if (originalPublicOrigin === undefined) delete process.env.ADMIN_PUBLIC_ORIGIN;
  else process.env.ADMIN_PUBLIC_ORIGIN = originalPublicOrigin;
  if (originalNodeEnv === undefined) delete mutableEnv.NODE_ENV;
  else mutableEnv.NODE_ENV = originalNodeEnv;
  if (originalUsername === undefined) delete process.env.ADMIN_USERNAME;
  else process.env.ADMIN_USERNAME = originalUsername;
});

test('accepts a valid signed admin session and ignores API keys', async () => {
  const token = await createSessionToken('operator');
  const authorized = new NextRequest('https://admin.example.test/api/config', {
    headers: { Cookie: `${getSessionCookieName()}=${token}` },
  });
  const apiKeyOnly = new NextRequest('https://admin.example.test/api/config', {
    headers: { 'x-api-key': 'not-an-authentication-method' },
  });

  assert.equal(await requireAdminSession(authorized), null);
  assert.equal((await requireAdminSession(apiKeyOnly))?.status, 401);
});

test('rejects a cross-origin mutation even with a valid session', async () => {
  const token = await createSessionToken('operator');
  const request = new NextRequest('https://admin.example.test/api/config', {
    method: 'PUT',
    headers: {
      Cookie: `${getSessionCookieName()}=${token}`,
      Origin: 'https://attacker.example.test',
    },
  });

  assert.equal((await requireAdminSession(request))?.status, 403);
});

test('invalidates sessions when the configured admin identity changes', async () => {
  const token = await createSessionToken('operator');
  process.env.ADMIN_USERNAME = 'new-operator';
  const request = new NextRequest('https://admin.example.test/api/config', {
    headers: { Cookie: `${getSessionCookieName()}=${token}` },
  });

  assert.equal((await requireAdminSession(request))?.status, 401);
});

test('fails closed when session verification is misconfigured', async () => {
  const token = await createSessionToken('operator');
  delete process.env.ADMIN_SESSION_SECRET;
  const request = new NextRequest('https://admin.example.test/api/config', {
    headers: { Cookie: `${getSessionCookieName()}=${token}` },
  });

  assert.equal((await requireAdminSession(request))?.status, 503);
});
