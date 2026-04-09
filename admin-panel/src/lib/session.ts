import { cookies } from 'next/headers';
import crypto from 'crypto';

const COOKIE_NAME = 'admin-session';
const MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

function getSecret(): string {
  return process.env.ADMIN_SESSION_SECRET || 'fallback-dev-secret';
}

/**
 * Create a signed session token using Node.js crypto (for API routes).
 * Must produce the same output as the Web Crypto version in middleware.ts.
 */
export function createSessionToken(username: string): string {
  const hmac = crypto.createHmac('sha256', getSecret());
  hmac.update(username);
  return `${username}:${hmac.digest('hex')}`;
}

/**
 * Set the session cookie after successful login
 */
export function setSessionCookie(username: string): void {
  const token = createSessionToken(username);
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE,
    path: '/',
  });
}

/**
 * Clear the session cookie (logout)
 */
export function clearSessionCookie(): void {
  cookies().set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
}

export { COOKIE_NAME };
