import {
  createHash,
  timingSafeEqual,
} from 'node:crypto';

const OAUTH_CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/**
 * @param {string} namespace
 * @returns {Map<string, number>}
 */
function pendingStore(namespace) {
  // Next can bundle issuer and consumer route handlers as separate entries.
  // globalThis keeps their pending registry shared inside the current single
  // PM2 fork. Move this registry to Redis before running multiple processes.
  const root = /** @type {typeof globalThis & {
   *   __groceryOAuthChallengeStoresV1?: Map<string, Map<string, number>>
   * }} */ (globalThis);
  root.__groceryOAuthChallengeStoresV1 ??= new Map();
  const existing = root.__groceryOAuthChallengeStoresV1.get(namespace);
  if (existing) return existing;

  const created = new Map();
  root.__groceryOAuthChallengeStoresV1.set(namespace, created);
  return created;
}

/**
 * Bounded, purpose-specific pending challenge storage for the current
 * single-process storefront deployment. A consumed challenge is deleted in
 * O(1); expired entries are pruned from the insertion-ordered Map when a new
 * challenge is issued.
 */
export class PendingOAuthChallengeStore {
  /**
   * @param {string} namespace
   * @param {number} maxEntries
   * @param {number} ttlMilliseconds
   */
  constructor(namespace, maxEntries, ttlMilliseconds) {
    this.namespace = namespace;
    this.maxEntries = maxEntries;
    this.ttlMilliseconds = ttlMilliseconds;
    this.pending = pendingStore(namespace);
  }

  /**
   * @param {string} challenge
   * @param {number} [now]
   */
  issue(challenge, now = Date.now()) {
    if (!OAUTH_CHALLENGE_PATTERN.test(challenge)) return false;
    this.pruneExpired(now);
    if (this.pending.size >= this.maxEntries) return false;

    const digest = this.digest(challenge);
    if (this.pending.has(digest)) return false;
    this.pending.set(digest, now + this.ttlMilliseconds);
    return true;
  }

  /**
   * @param {string | null | undefined} cookieChallenge
   * @param {string | null | undefined} submittedChallenge
   * @param {number} [now]
   */
  consume(cookieChallenge, submittedChallenge, now = Date.now()) {
    if (
      !cookieChallenge
      || !submittedChallenge
      || !OAUTH_CHALLENGE_PATTERN.test(cookieChallenge)
      || !OAUTH_CHALLENGE_PATTERN.test(submittedChallenge)
    ) {
      return false;
    }

    const cookieBuffer = Buffer.from(cookieChallenge, 'ascii');
    const submittedBuffer = Buffer.from(submittedChallenge, 'ascii');
    if (
      cookieBuffer.length !== submittedBuffer.length
      || !timingSafeEqual(cookieBuffer, submittedBuffer)
    ) {
      return false;
    }

    const digest = this.digest(cookieChallenge);
    const expiresAt = this.pending.get(digest);
    if (expiresAt === undefined) return false;

    // Delete before checking expiry so every issued challenge is one-shot.
    this.pending.delete(digest);
    return expiresAt > now;
  }

  /** @param {number} now */
  pruneExpired(now) {
    for (const [digest, expiresAt] of this.pending) {
      if (expiresAt > now) break;
      this.pending.delete(digest);
    }
  }

  /** @param {string} challenge */
  digest(challenge) {
    return createHash('sha256')
      .update(this.namespace, 'utf8')
      .update('\0', 'utf8')
      .update(challenge, 'ascii')
      .digest('base64url');
  }
}
