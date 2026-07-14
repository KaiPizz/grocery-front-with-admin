const TOKEN_VERSION = 'v1';
const MIN_SECRET_BYTES = 32;
const CLOCK_SKEW_SECONDS = 60;

export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

const INSECURE_SECRETS = new Set([
  'fallback-dev-secret',
  'change-me',
  'change-me-to-a-random-64-char-string-for-cookie-signing',
]);

export interface AdminSession {
  username: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
}

interface SessionPayload {
  sub: string;
  iat: number;
  exp: number;
  nonce: string;
}

export class SessionConfigurationError extends Error {
  constructor() {
    super('Admin session signing is not configured securely');
    this.name = 'SessionConfigurationError';
  }
}

export function getSessionCookieName(): string {
  return process.env.NODE_ENV === 'production'
    ? '__Host-admin-session'
    : 'admin-session';
}

function getSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim();
  const byteLength = secret ? new TextEncoder().encode(secret).byteLength : 0;

  if (
    !secret ||
    byteLength < MIN_SECRET_BYTES ||
    INSECURE_SECRETS.has(secret.toLowerCase()) ||
    secret.toLowerCase().startsWith('change-me')
  ) {
    throw new SessionConfigurationError();
  }

  return secret;
}

function getCredentialBinding(): string {
  const passwordHash = process.env.ADMIN_PASSWORD_HASH?.trim();
  if (passwordHash) return passwordHash;

  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.ALLOW_INSECURE_DEV_PASSWORD === 'true' &&
    process.env.ADMIN_PASSWORD
  ) {
    return `dev:${process.env.ADMIN_PASSWORD}`;
  }

  throw new SessionConfigurationError();
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function textToBase64Url(value: string): string {
  return bytesToBase64Url(new TextEncoder().encode(value));
}

function base64UrlToBytes(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;

  try {
    const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(
      Math.ceil(value.length / 4) * 4,
      '='
    );
    const binary = atob(padded);
    return Uint8Array.from(binary, char => char.charCodeAt(0));
  } catch {
    return null;
  }
}

function base64UrlToText(value: string): string | null {
  const bytes = base64UrlToBytes(value);
  if (!bytes) return null;

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

async function importSigningKey(): Promise<CryptoKey> {
  const secret = getSessionSecret();
  const credentialBinding = getCredentialBinding();
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(`${secret}\u0000${credentialBinding}`),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

function createNonce(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

export async function createSessionToken(
  username: string,
  options: { nowMs?: number; maxAgeSeconds?: number } = {}
): Promise<string> {
  if (!username || username.length > 128) {
    throw new TypeError('Invalid session subject');
  }

  const now = Math.floor((options.nowMs ?? Date.now()) / 1000);
  const maxAge = options.maxAgeSeconds ?? SESSION_MAX_AGE_SECONDS;
  if (!Number.isInteger(maxAge) || maxAge < 60 || maxAge > SESSION_MAX_AGE_SECONDS) {
    throw new TypeError('Invalid session lifetime');
  }

  const payload: SessionPayload = {
    sub: username,
    iat: now,
    exp: now + maxAge,
    nonce: createNonce(),
  };
  const encodedPayload = textToBase64Url(JSON.stringify(payload));
  const signedValue = `${TOKEN_VERSION}.${encodedPayload}`;
  const key = await importSigningKey();
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(signedValue)
  );

  return `${signedValue}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

function parsePayload(encodedPayload: string): SessionPayload | null {
  const decoded = base64UrlToText(encodedPayload);
  if (!decoded) return null;

  try {
    const value: unknown = JSON.parse(decoded);
    if (!value || typeof value !== 'object') return null;

    const payload = value as Partial<SessionPayload>;
    if (
      typeof payload.sub !== 'string' ||
      payload.sub.length < 1 ||
      payload.sub.length > 128 ||
      !Number.isInteger(payload.iat) ||
      !Number.isInteger(payload.exp) ||
      typeof payload.nonce !== 'string' ||
      !/^[A-Za-z0-9_-]{24}$/.test(payload.nonce)
    ) {
      return null;
    }

    return payload as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Verify a token using Web Crypto's constant-time HMAC verification so the proxy
 * and Node API routes enforce identical rules.
 */
export async function verifySessionToken(
  token: string,
  options: { nowMs?: number } = {}
): Promise<AdminSession | null> {
  if (!token || token.length > 4096) return null;

  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== TOKEN_VERSION) return null;

  const signature = base64UrlToBytes(parts[2]);
  if (!signature || signature.byteLength !== 32) return null;

  const signedValue = `${parts[0]}.${parts[1]}`;
  const key = await importSigningKey();
  const normalizedSignature = new Uint8Array(signature.byteLength);
  normalizedSignature.set(signature);
  const signatureIsValid = await crypto.subtle.verify(
    'HMAC',
    key,
    normalizedSignature,
    new TextEncoder().encode(signedValue)
  );
  if (!signatureIsValid) return null;

  const payload = parsePayload(parts[1]);
  if (!payload) return null;

  const now = Math.floor((options.nowMs ?? Date.now()) / 1000);
  if (
    payload.iat > now + CLOCK_SKEW_SECONDS ||
    payload.exp <= now ||
    payload.exp <= payload.iat ||
    payload.exp - payload.iat > SESSION_MAX_AGE_SECONDS
  ) {
    return null;
  }

  return {
    username: payload.sub,
    issuedAt: payload.iat,
    expiresAt: payload.exp,
    nonce: payload.nonce,
  };
}

/** Reject sessions issued for a previous admin identity after credential rotation. */
export function sessionMatchesConfiguredAdmin(session: AdminSession): boolean {
  const configuredUsername = process.env.ADMIN_USERNAME;
  if (
    !configuredUsername ||
    configuredUsername.length > 128 ||
    configuredUsername.trim() !== configuredUsername
  ) {
    throw new SessionConfigurationError();
  }

  return session.username === configuredUsername;
}
