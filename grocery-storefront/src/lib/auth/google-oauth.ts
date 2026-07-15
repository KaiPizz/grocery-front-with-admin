import {
  createHash,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

export const GOOGLE_OAUTH_NONCE_COOKIE_NAME = 'grocery_google_oauth_nonce';
export const GOOGLE_OAUTH_NONCE_MAX_AGE_SECONDS = 5 * 60;
export const GOOGLE_LINK_NONCE_COOKIE_NAME = 'grocery_google_link_nonce';
export const GOOGLE_LINK_MAX_CONSUMED_NONCES = 10_000;

const GOOGLE_CLIENT_ID_PATTERN = /^[A-Za-z0-9._-]+\.apps\.googleusercontent\.com$/;
const GOOGLE_NONCE_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const consumedGoogleLinkNonceDigests = new Map<string, number>();

export function normalizeGoogleClientId(value: string | undefined): string | null {
  const clientId = value?.trim() ?? '';
  if (!clientId || clientId.length > 512 || !GOOGLE_CLIENT_ID_PATTERN.test(clientId)) {
    return null;
  }

  return clientId;
}

export function normalizeCustomerAuthBffSecret(value: string | undefined): string | null {
  const secret = value?.trim() ?? '';
  return /^[\x21-\x7e]{32,512}$/.test(secret) ? secret : null;
}

export function hasCustomerAuthBffSecret(value: string | undefined): boolean {
  return normalizeCustomerAuthBffSecret(value) !== null;
}

export function normalizeCustomerAuthGraphqlUrl(value: string | undefined): string | null {
  try {
    const url = new URL(value?.trim() ?? '');
    const hostname = url.hostname.toLowerCase();
    const isLoopback = hostname === 'localhost'
      || hostname === '127.0.0.1'
      || hostname === '[::1]';
    if (
      !isLoopback
      || (url.protocol !== 'http:' && url.protocol !== 'https:')
      || url.username
      || url.password
      || url.search
      || url.hash
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

export function createGoogleOAuthNonce(): string {
  return randomBytes(32).toString('base64url');
}

export function consumeGoogleLinkNonce(
  cookieNonce: string | null | undefined,
  submittedNonce: string | null | undefined,
  now = Date.now(),
): boolean {
  if (
    !cookieNonce
    || !submittedNonce
    || !GOOGLE_NONCE_PATTERN.test(cookieNonce)
    || !GOOGLE_NONCE_PATTERN.test(submittedNonce)
  ) {
    return false;
  }

  const cookieBuffer = Buffer.from(cookieNonce, 'ascii');
  const submittedBuffer = Buffer.from(submittedNonce, 'ascii');
  if (
    cookieBuffer.length !== submittedBuffer.length
    || !timingSafeEqual(cookieBuffer, submittedBuffer)
  ) {
    return false;
  }

  for (const [digest, expiresAt] of consumedGoogleLinkNonceDigests) {
    if (expiresAt <= now) consumedGoogleLinkNonceDigests.delete(digest);
  }

  // Prefix the digest so this replay namespace can never be confused with a
  // login nonce if the caches are consolidated later.
  const digest = createHash('sha256')
    .update('customer-google-link\0', 'utf8')
    .update(cookieBuffer)
    .digest('base64url');
  if (consumedGoogleLinkNonceDigests.has(digest)) return false;
  if (consumedGoogleLinkNonceDigests.size >= GOOGLE_LINK_MAX_CONSUMED_NONCES) {
    return false;
  }

  consumedGoogleLinkNonceDigests.set(
    digest,
    now + GOOGLE_OAUTH_NONCE_MAX_AGE_SECONDS * 1000,
  );
  return true;
}
