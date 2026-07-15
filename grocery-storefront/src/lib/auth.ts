'use client';

const LEGACY_ACCESS_STORAGE_KEY = 'grocery_auth_token';
const LEGACY_REFRESH_STORAGE_KEY = 'grocery_refresh_token';
const LEGACY_PROFILE_STORAGE_KEY = 'grocery_auth_session';
const LEGACY_ACCESS_COOKIE = 'grocery_token';
const LEGACY_REFRESH_COOKIE = 'grocery_refresh_token';

export const AUTH_SESSION_EXPIRED_EVENT = 'grocery:session-expired';

let authenticatedSessionHint = false;

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export interface LegacyAuthTokens {
  accessToken: string | null;
  refreshToken: string | null;
}

export function readLegacyAuthTokens(): LegacyAuthTokens {
  if (!isBrowser()) return { accessToken: null, refreshToken: null };

  return {
    accessToken: window.localStorage.getItem(LEGACY_ACCESS_STORAGE_KEY),
    refreshToken: window.localStorage.getItem(LEGACY_REFRESH_STORAGE_KEY),
  };
}

export function clearLegacyAuthStorage(): void {
  if (!isBrowser()) return;

  window.localStorage.removeItem(LEGACY_ACCESS_STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_REFRESH_STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_PROFILE_STORAGE_KEY);
  document.cookie = `${LEGACY_ACCESS_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
  document.cookie = `${LEGACY_REFRESH_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
}

export function setAuthenticatedSessionHint(authenticated: boolean): void {
  authenticatedSessionHint = authenticated;
}

export function hasAuthenticatedSession(): boolean {
  return authenticatedSessionHint;
}

export function emitSessionExpired(): void {
  authenticatedSessionHint = false;
  if (isBrowser()) {
    window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
  }
}
