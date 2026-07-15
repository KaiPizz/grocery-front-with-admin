import { randomBytes } from 'node:crypto';

import { PendingOAuthChallengeStore } from './oauth-challenge-store.js';

export const GOOGLE_OAUTH_NONCE_COOKIE_NAME = 'grocery_google_oauth_nonce';
export const GOOGLE_OAUTH_NONCE_MAX_AGE_SECONDS = 5 * 60;
export const GOOGLE_LINK_NONCE_COOKIE_NAME = 'grocery_google_link_nonce';
export const GOOGLE_OAUTH_MAX_PENDING_NONCES = 10_000;

const GOOGLE_CLIENT_ID_PATTERN = /^[A-Za-z0-9._-]+\.apps\.googleusercontent\.com$/;
type GoogleOAuthPurpose = 'login' | 'link';

const googleLoginNonces = new PendingOAuthChallengeStore(
  'customer-google-login',
  GOOGLE_OAUTH_MAX_PENDING_NONCES,
  GOOGLE_OAUTH_NONCE_MAX_AGE_SECONDS * 1000,
);
const googleLinkNonces = new PendingOAuthChallengeStore(
  'customer-google-link',
  GOOGLE_OAUTH_MAX_PENDING_NONCES,
  GOOGLE_OAUTH_NONCE_MAX_AGE_SECONDS * 1000,
);

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

export function issueGoogleOAuthNonce(
  purpose: GoogleOAuthPurpose,
  now = Date.now(),
): string | null {
  const store = purpose === 'login' ? googleLoginNonces : googleLinkNonces;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const nonce = createGoogleOAuthNonce();
    if (store.issue(nonce, now)) return nonce;
  }
  return null;
}

export function consumeGoogleLoginNonce(
  cookieNonce: string | null | undefined,
  now = Date.now(),
): boolean {
  return googleLoginNonces.consume(cookieNonce, cookieNonce, now);
}

export function consumeGoogleLinkNonce(
  cookieNonce: string | null | undefined,
  submittedNonce: string | null | undefined,
  now = Date.now(),
): boolean {
  return googleLinkNonces.consume(cookieNonce, submittedNonce, now);
}
