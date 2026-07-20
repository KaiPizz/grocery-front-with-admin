import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';

import {
  clearPasswordChangeRateLimit,
  reservePasswordChangeAttempt,
  resetPasswordChangeRateLimitsForTests,
} from './password-change-rate-limit';

(process.env as Record<string, string | undefined>).NODE_ENV = 'test';

beforeEach(() => resetPasswordChangeRateLimitsForTests());

test('bounds expensive current-password checks per session and IP', () => {
  const now = 1_750_000_000_000;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    assert.equal(
      reservePasswordChangeAttempt('192.0.2.10', 'session-nonce', now).limited,
      false
    );
  }

  const blocked = reservePasswordChangeAttempt('192.0.2.10', 'session-nonce', now);
  assert.equal(blocked.limited, true);
  assert.equal(blocked.retryAfterSeconds, 15 * 60);
  assert.equal(
    reservePasswordChangeAttempt('192.0.2.11', 'session-nonce', now).limited,
    true
  );
  assert.equal(
    reservePasswordChangeAttempt('192.0.2.11', 'different-session', now).limited,
    false
  );
});

test('successful password change clears its bucket', () => {
  const now = 1_750_000_000_000;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    reservePasswordChangeAttempt('192.0.2.10', 'session-nonce', now);
  }
  clearPasswordChangeRateLimit('192.0.2.10', 'session-nonce');
  assert.equal(
    reservePasswordChangeAttempt('192.0.2.10', 'session-nonce', now).limited,
    false
  );
});
