'use client';

const LEGACY_ACCESS_STORAGE_KEY = 'grocery_auth_token';
const LEGACY_REFRESH_STORAGE_KEY = 'grocery_refresh_token';
const LEGACY_PROFILE_STORAGE_KEY = 'grocery_auth_session';
const LEGACY_ACCESS_COOKIE = 'grocery_token';
const LEGACY_REFRESH_COOKIE = 'grocery_refresh_token';

export const AUTH_SESSION_EXPIRED_EVENT = 'grocery:session-expired';

let authenticatedSessionHint = false;
let customerStateGeneration = 0;

export function getCustomerStateGeneration(): number {
  return customerStateGeneration;
}

export function invalidateCustomerState(): number {
  return ++customerStateGeneration;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export interface LegacyAuthTokens {
  accessToken: string | null;
  refreshToken: string | null;
}

export function readLegacyAuthTokens(): LegacyAuthTokens {
  if (!isBrowser()) return { accessToken: null, refreshToken: null };

  let accessToken: string | null = null;
  let refreshToken: string | null = null;
  try { accessToken = window.localStorage.getItem(LEGACY_ACCESS_STORAGE_KEY); } catch { /* Storage may be blocked. */ }
  try { refreshToken = window.localStorage.getItem(LEGACY_REFRESH_STORAGE_KEY); } catch { /* Storage may be blocked. */ }
  return { accessToken, refreshToken };
}

export function clearLegacyAuthStorage(): void {
  if (!isBrowser()) return;

  try { window.localStorage.removeItem(LEGACY_ACCESS_STORAGE_KEY); } catch { /* Continue in-memory cleanup. */ }
  try { window.localStorage.removeItem(LEGACY_REFRESH_STORAGE_KEY); } catch { /* Continue in-memory cleanup. */ }
  try { window.localStorage.removeItem(LEGACY_PROFILE_STORAGE_KEY); } catch { /* Continue in-memory cleanup. */ }
  try { document.cookie = `${LEGACY_ACCESS_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`; } catch { /* Cookies may be blocked. */ }
  try { document.cookie = `${LEGACY_REFRESH_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`; } catch { /* Cookies may be blocked. */ }
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
