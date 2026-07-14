import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { NextRequest } from 'next/server';

import { isSameOriginRequest, requireSameOrigin } from './origin';

const mutableEnv = process.env as Record<string, string | undefined>;
const originalNodeEnv = process.env.NODE_ENV;
const originalPublicOrigin = process.env.ADMIN_PUBLIC_ORIGIN;

beforeEach(() => {
  mutableEnv.NODE_ENV = 'test';
  delete process.env.ADMIN_PUBLIC_ORIGIN;
});

afterEach(() => {
  if (originalNodeEnv === undefined) delete mutableEnv.NODE_ENV;
  else mutableEnv.NODE_ENV = originalNodeEnv;
  if (originalPublicOrigin === undefined) delete process.env.ADMIN_PUBLIC_ORIGIN;
  else process.env.ADMIN_PUBLIC_ORIGIN = originalPublicOrigin;
});

test('allows safe methods without an Origin header', () => {
  const request = new NextRequest('https://admin.example.test/api/config');
  assert.equal(isSameOriginRequest(request), true);
  assert.equal(requireSameOrigin(request), null);
});

test('allows unsafe methods only with an exact Origin match', () => {
  const allowed = new NextRequest('https://admin.example.test/api/config', {
    method: 'POST',
    headers: { Origin: 'https://admin.example.test' },
  });
  const crossOrigin = new NextRequest('https://admin.example.test/api/config', {
    method: 'POST',
    headers: { Origin: 'https://attacker.example.test' },
  });
  const missingOrigin = new NextRequest('https://admin.example.test/api/config', {
    method: 'DELETE',
  });

  assert.equal(isSameOriginRequest(allowed), true);
  assert.equal(isSameOriginRequest(crossOrigin), false);
  assert.equal(isSameOriginRequest(missingOrigin), false);
  assert.equal(requireSameOrigin(crossOrigin)?.status, 403);
  assert.equal(requireSameOrigin(missingOrigin)?.status, 403);
});

test('uses the configured public origin behind a reverse proxy', () => {
  mutableEnv.NODE_ENV = 'production';
  process.env.ADMIN_PUBLIC_ORIGIN = 'https://admin.example.test';

  const proxied = new NextRequest('http://127.0.0.1:4100/api/config', {
    method: 'POST',
    headers: { Origin: 'https://admin.example.test' },
  });
  const spoofed = new NextRequest('http://127.0.0.1:4100/api/config', {
    method: 'POST',
    headers: { Origin: 'https://attacker.example.test' },
  });

  assert.equal(requireSameOrigin(proxied), null);
  assert.equal(requireSameOrigin(spoofed)?.status, 403);
});

test('fails closed when production public origin is missing', () => {
  mutableEnv.NODE_ENV = 'production';
  delete process.env.ADMIN_PUBLIC_ORIGIN;
  const request = new NextRequest('http://127.0.0.1:4100/api/config', {
    method: 'POST',
    headers: { Origin: 'https://admin.example.test' },
  });

  assert.equal(requireSameOrigin(request)?.status, 503);
});
