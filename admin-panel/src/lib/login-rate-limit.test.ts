import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';

import {
  checkLoginRateLimit,
  clearLoginRateLimit,
  reserveLoginAttempt,
  resetLoginRateLimitsForTests,
} from './login-rate-limit';

(process.env as Record<string, string | undefined>).NODE_ENV = 'test';

beforeEach(() => resetLoginRateLimitsForTests());

test('reserves the bounded hashing quota before password verification', () => {
  const now = 1_750_000_000_000;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    assert.equal(reserveLoginAttempt('192.0.2.1', 'operator', now).limited, false);
  }

  const blocked = reserveLoginAttempt('192.0.2.1', 'operator', now);
  assert.equal(blocked.limited, true);
  assert.equal(blocked.retryAfterSeconds, 15 * 60);
  assert.equal(
    checkLoginRateLimit('192.0.2.1', 'operator', now + 1_000).limited,
    true
  );
  assert.equal(
    checkLoginRateLimit('192.0.2.2', 'different-user', now).limited,
    false
  );
});

test('successful login clears the relevant rate-limit buckets', () => {
  const now = 1_750_000_000_000;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    reserveLoginAttempt('192.0.2.1', 'operator', now);
  }
  assert.equal(reserveLoginAttempt('192.0.2.1', 'operator', now).limited, true);

  clearLoginRateLimit('192.0.2.1', 'operator');
  assert.equal(checkLoginRateLimit('192.0.2.1', 'operator', now).limited, false);
});

test('expired blocks are removed', () => {
  const now = 1_750_000_000_000;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    reserveLoginAttempt('192.0.2.1', 'operator', now);
  }

  assert.equal(
    checkLoginRateLimit('192.0.2.1', 'operator', now + 16 * 60 * 1000).limited,
    false
  );
});
