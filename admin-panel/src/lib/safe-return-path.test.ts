import assert from 'node:assert/strict';
import test from 'node:test';

import { getSafeAdminReturnPath } from './safe-return-path';

test('accepts the admin dashboard and simple admin descendants', () => {
  assert.equal(getSafeAdminReturnPath('/admin'), '/admin');
  assert.equal(getSafeAdminReturnPath('/admin/branding'), '/admin/branding');
  assert.equal(
    getSafeAdminReturnPath('/admin/media?page=2#recent'),
    '/admin/media?page=2#recent'
  );
  assert.equal(getSafeAdminReturnPath('/admin/layout-config/'), '/admin/layout-config/');
});

test('falls back when no return path is supplied', () => {
  assert.equal(getSafeAdminReturnPath(null), '/admin');
  assert.equal(getSafeAdminReturnPath(undefined), '/admin');
  assert.equal(getSafeAdminReturnPath(''), '/admin');
  assert.equal(getSafeAdminReturnPath('   '), '/admin');
});

test('rejects external origins, schemes, protocol-relative URLs, and backslashes', () => {
  const unsafeValues = [
    'https://example.com/admin',
    'javascript:alert(1)',
    '//example.com/admin',
    '/\\example.com/admin',
    '/admin\\@example.com',
    '/admin?next=//example.com',
    '%2F%2Fexample.com%2Fadmin',
    '%252F%252Fexample.com%252Fadmin',
  ];

  for (const value of unsafeValues) {
    assert.equal(getSafeAdminReturnPath(value), '/admin', value);
  }
});

test('rejects paths outside admin and encoded traversal attempts', () => {
  const unsafeValues = [
    '/',
    '/login',
    '/administrator',
    '/administer/settings',
    '/admin/../login',
    '/admin/%2e%2e/login',
    '/admin/%252e%252e/login',
    '/admin/%2F%2Fevil',
    '/admin/settings profile',
    '/admin/%00settings',
  ];

  for (const value of unsafeValues) {
    assert.equal(getSafeAdminReturnPath(value), '/admin', value);
  }
});
