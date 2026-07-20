import { cookies } from 'next/headers';

import {
  createSessionToken,
  getSessionCookieName,
  SESSION_MAX_AGE_SECONDS,
} from './session-token';
import type { AdminAuthState } from './admin-auth-state';

const LEGACY_COOKIE_NAME = 'admin-session';

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge,
    path: '/',
  };
}

/** Set a short-lived, signed admin session cookie after successful login. */
export async function setSessionCookie(
  username: string,
  authState?: AdminAuthState
): Promise<void> {
  const token = await createSessionToken(username, { authState });
  const cookieStore = await cookies();
  cookieStore.set(
    getSessionCookieName(),
    token,
    cookieOptions(SESSION_MAX_AGE_SECONDS)
  );
}

/**
 * Clear both the current cookie and the pre-hardening cookie during migration.
 * No Domain attribute is set, preserving the __Host- cookie guarantees in production.
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  const currentName = getSessionCookieName();

  cookieStore.set(currentName, '', cookieOptions(0));

  if (currentName !== LEGACY_COOKIE_NAME) {
    cookieStore.set(LEGACY_COOKIE_NAME, '', cookieOptions(0));
  }
}

export {
  createSessionToken,
  getSessionCookieName,
  SESSION_MAX_AGE_SECONDS,
  SessionConfigurationError,
  verifySessionToken,
} from './session-token';
