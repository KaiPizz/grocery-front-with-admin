import { test } from 'node:test';
import assert from 'node:assert/strict';

import { safeReturnPath } from '../src/lib/auth/safe-return-path.ts';

test('allows localized, internal account destinations and preserves query/hash', () => {
  assert.equal(safeReturnPath('/account#orders'), '/account#orders');
  assert.equal(safeReturnPath('/en/account/orders/abc?from=mail#detail'), '/account/orders/abc?from=mail#detail');
  assert.equal(safeReturnPath('/pl/checkout?step=payment'), '/checkout?step=payment');
});

test('rejects external, protocol-relative, auth-loop and traversal destinations', () => {
  const fallback = '/wishlist';
  for (const value of [
    'https://evil.example/account',
    '//evil.example/account',
    '/\\evil.example/account',
    '/%5cevil.example/account',
    '/%255cevil.example/account',
    '/account/%2e%2e/api/auth/logout',
    '/account/%252e%252e/api/auth/logout',
    '/account/%252e%252e%252fcheckout',
    '/api/auth/logout',
    '/login',
    '/account\u0000/orders',
  ]) {
    assert.equal(safeReturnPath(value), fallback, value);
  }
});
