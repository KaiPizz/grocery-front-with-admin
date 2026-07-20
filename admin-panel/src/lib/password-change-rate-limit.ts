import { createHash } from 'node:crypto';

const WINDOW_MS = 15 * 60 * 1000;
const BLOCK_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_BUCKETS = 5_000;

interface Bucket {
  attempts: number;
  windowEndsAt: number;
  blockedUntil: number;
}

export interface PasswordChangeRateLimitResult {
  limited: boolean;
  retryAfterSeconds: number;
}

const globalRateLimit = globalThis as typeof globalThis & {
  __adminPasswordChangeRateLimits?: Map<string, Bucket>;
};

const buckets =
  globalRateLimit.__adminPasswordChangeRateLimits ??
  (globalRateLimit.__adminPasswordChangeRateLimits = new Map<string, Bucket>());

function digest(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('base64url');
}

function bucketKeys(ip: string, sessionNonce: string): string[] {
  const sessionDigest = digest(sessionNonce);
  return [
    `session:${sessionDigest}`,
    `pair:${digest(ip)}:${sessionDigest}`,
  ];
}

function prune(now: number): void {
  buckets.forEach((bucket, key) => {
    if (bucket.windowEndsAt <= now && bucket.blockedUntil <= now) buckets.delete(key);
  });

  if (buckets.size > MAX_BUCKETS) {
    let remaining = buckets.size - MAX_BUCKETS;
    for (const key of buckets.keys()) {
      buckets.delete(key);
      remaining -= 1;
      if (remaining <= 0) break;
    }
  }
}

export function reservePasswordChangeAttempt(
  ip: string,
  sessionNonce: string,
  now = Date.now()
): PasswordChangeRateLimitResult {
  prune(now);
  const keys = bucketKeys(ip, sessionNonce);

  for (const key of keys) {
    const bucket = buckets.get(key);
    if (bucket?.blockedUntil && bucket.blockedUntil > now) {
      return {
        limited: true,
        retryAfterSeconds: Math.max(1, Math.ceil((bucket.blockedUntil - now) / 1000)),
      };
    }
  }

  for (const key of keys) {
    const bucket = buckets.get(key);
    if (bucket && bucket.windowEndsAt > now && bucket.attempts >= MAX_ATTEMPTS) {
      bucket.blockedUntil = now + BLOCK_MS;
      buckets.set(key, bucket);
      return { limited: true, retryAfterSeconds: Math.ceil(BLOCK_MS / 1000) };
    }
  }

  for (const key of keys) {
    let bucket = buckets.get(key);
    if (!bucket || bucket.windowEndsAt <= now) {
      bucket = { attempts: 0, windowEndsAt: now + WINDOW_MS, blockedUntil: 0 };
    }
    bucket.attempts += 1;
    buckets.set(key, bucket);
  }
  return { limited: false, retryAfterSeconds: 0 };
}

export function clearPasswordChangeRateLimit(ip: string, sessionNonce: string): void {
  for (const key of bucketKeys(ip, sessionNonce)) buckets.delete(key);
}

export function resetPasswordChangeRateLimitsForTests(): void {
  if (process.env.NODE_ENV === 'test') buckets.clear();
}
