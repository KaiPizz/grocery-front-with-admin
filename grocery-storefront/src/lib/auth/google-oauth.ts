import { randomBytes } from 'node:crypto';

export const GOOGLE_OAUTH_NONCE_COOKIE_NAME = 'grocery_google_oauth_nonce';
export const GOOGLE_OAUTH_NONCE_MAX_AGE_SECONDS = 5 * 60;

const GOOGLE_CLIENT_ID_PATTERN = /^[A-Za-z0-9._-]+\.apps\.googleusercontent\.com$/;

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
