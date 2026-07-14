import { createHash } from 'node:crypto';
import { NextRequest } from 'next/server';

const WINDOW_MS = 15 * 60 * 1000;
const BLOCK_MS = 15 * 60 * 1000;
const PAIR_ATTEMPTS = 5;
const IP_ATTEMPTS = 20;
const USERNAME_ATTEMPTS = 20;
const MAX_BUCKETS = 10_000;

interface Bucket {
  attempts: number;
  windowEndsAt: number;
  blockedUntil: number;
}

export interface RateLimitResult {
  limited: boolean;
  retryAfterSeconds: number;
}

const globalRateLimit = globalThis as typeof globalThis & {
  __adminLoginRateLimits?: Map<string, Bucket>;
};

const buckets =
  globalRateLimit.__adminLoginRateLimits ??
  (globalRateLimit.__adminLoginRateLimits = new Map<string, Bucket>());

function digest(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('base64url');
}

function normalizeUsername(username: string): string {
  return username.trim().normalize('NFKC').toLowerCase();
}

function keysFor(ip: string, username: string): Array<[string, number]> {
  const ipDigest = digest(ip);
  const usernameDigest = digest(normalizeUsername(username));
  return [
    [`pair:${ipDigest}:${usernameDigest}`, PAIR_ATTEMPTS],
    [`ip:${ipDigest}`, IP_ATTEMPTS],
    [`username:${usernameDigest}`, USERNAME_ATTEMPTS],
  ];
}

function prune(now: number): void {
  buckets.forEach((bucket, key) => {
    if (bucket.windowEndsAt <= now && bucket.blockedUntil <= now) buckets.delete(key);
  });

  if (buckets.size > MAX_BUCKETS) {
    const removeCount = buckets.size - MAX_BUCKETS;
    let removed = 0;
    for (const key of Array.from(buckets.keys())) {
      buckets.delete(key);
      if (++removed >= removeCount) break;
    }
  }
}

export function getClientIp(request: NextRequest): string {
  const candidate =
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    'unknown';
  const sanitized = candidate.trim();
  return sanitized.length > 0 && sanitized.length <= 64 ? sanitized : 'unknown';
}

export function checkLoginRateLimit(
  ip: string,
  username: string,
  now = Date.now()
): RateLimitResult {
  prune(now);
  let retryAfterMs = 0;

  for (const [key] of keysFor(ip, username)) {
    const bucket = buckets.get(key);
    if (bucket?.blockedUntil && bucket.blockedUntil > now) {
      retryAfterMs = Math.max(retryAfterMs, bucket.blockedUntil - now);
    }
  }

  return {
    limited: retryAfterMs > 0,
    retryAfterSeconds: retryAfterMs > 0 ? Math.max(1, Math.ceil(retryAfterMs / 1000)) : 0,
  };
}

/**
 * Reserve an attempt before password hashing. The mutation is synchronous so a
 * burst cannot pass a read-only pre-check and start unbounded scrypt work.
 */
export function reserveLoginAttempt(
  ip: string,
  username: string,
  now = Date.now()
): RateLimitResult {
  prune(now);
  const keyedLimits = keysFor(ip, username);

  for (const [key] of keyedLimits) {
    const bucket = buckets.get(key);
    if (bucket?.blockedUntil && bucket.blockedUntil > now) {
      return {
        limited: true,
        retryAfterSeconds: Math.max(1, Math.ceil((bucket.blockedUntil - now) / 1000)),
      };
    }
  }

  for (const [key, limit] of keyedLimits) {
    const bucket = buckets.get(key);
    if (bucket && bucket.windowEndsAt > now && bucket.attempts >= limit) {
      bucket.blockedUntil = now + BLOCK_MS;
      buckets.set(key, bucket);
      return { limited: true, retryAfterSeconds: Math.ceil(BLOCK_MS / 1000) };
    }
  }

  for (const [key] of keyedLimits) {
    let bucket = buckets.get(key);
    if (!bucket || bucket.windowEndsAt <= now) {
      bucket = { attempts: 0, windowEndsAt: now + WINDOW_MS, blockedUntil: 0 };
    }

    bucket.attempts += 1;
    buckets.set(key, bucket);
  }

  return { limited: false, retryAfterSeconds: 0 };
}

export function clearLoginRateLimit(ip: string, username: string): void {
  for (const [key] of keysFor(ip, username)) buckets.delete(key);
}

/** Test-only reset; intentionally does not expose bucket contents. */
export function resetLoginRateLimitsForTests(): void {
  if (process.env.NODE_ENV === 'test') buckets.clear();
}
