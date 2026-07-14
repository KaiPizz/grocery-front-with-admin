import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import {
  constantTimeStringEqual,
  createPasswordHash,
  PasswordConfigurationError,
  verifyConfiguredAdminPassword,
  verifyPassword,
} from './password';

const mutableEnv = process.env as Record<string, string | undefined>;
const originalNodeEnv = process.env.NODE_ENV;
const originalHash = process.env.ADMIN_PASSWORD_HASH;
const originalPassword = process.env.ADMIN_PASSWORD;
const originalFallback = process.env.ALLOW_INSECURE_DEV_PASSWORD;

afterEach(() => {
  if (originalNodeEnv === undefined) delete mutableEnv.NODE_ENV;
  else mutableEnv.NODE_ENV = originalNodeEnv;
  if (originalHash === undefined) delete process.env.ADMIN_PASSWORD_HASH;
  else process.env.ADMIN_PASSWORD_HASH = originalHash;
  if (originalPassword === undefined) delete process.env.ADMIN_PASSWORD;
  else process.env.ADMIN_PASSWORD = originalPassword;
  if (originalFallback === undefined) delete process.env.ALLOW_INSECURE_DEV_PASSWORD;
  else process.env.ALLOW_INSECURE_DEV_PASSWORD = originalFallback;
});

test('creates and verifies a salted scrypt password hash', async () => {
  const first = await createPasswordHash('correct horse battery staple');
  const second = await createPasswordHash('correct horse battery staple');

  assert.notEqual(first, second);
  assert.equal(await verifyPassword('correct horse battery staple', first), true);
  assert.equal(await verifyPassword('wrong password', first), false);
});

test('rejects malformed password hash configuration', async () => {
  await assert.rejects(
    verifyPassword('password', '$scrypt$invalid'),
    PasswordConfigurationError
  );
});

test('never permits plaintext password fallback in production', async () => {
  mutableEnv.NODE_ENV = 'production';
  delete process.env.ADMIN_PASSWORD_HASH;
  process.env.ADMIN_PASSWORD = 'development-only';
  process.env.ALLOW_INSECURE_DEV_PASSWORD = 'true';

  await assert.rejects(
    verifyConfiguredAdminPassword('development-only'),
    PasswordConfigurationError
  );
});

test('plaintext fallback requires an explicit non-production opt-in', async () => {
  mutableEnv.NODE_ENV = 'development';
  delete process.env.ADMIN_PASSWORD_HASH;
  process.env.ADMIN_PASSWORD = 'development-only';
  delete process.env.ALLOW_INSECURE_DEV_PASSWORD;

  await assert.rejects(
    verifyConfiguredAdminPassword('development-only'),
    PasswordConfigurationError
  );

  process.env.ALLOW_INSECURE_DEV_PASSWORD = 'true';
  assert.equal(await verifyConfiguredAdminPassword('development-only'), true);
  assert.equal(await verifyConfiguredAdminPassword('incorrect'), false);
});

test('constant-time string comparison preserves exact matching semantics', () => {
  assert.equal(constantTimeStringEqual('operator', 'operator'), true);
  assert.equal(constantTimeStringEqual('operator', 'Operator'), false);
  assert.equal(constantTimeStringEqual('short', 'a much longer string'), false);
});
