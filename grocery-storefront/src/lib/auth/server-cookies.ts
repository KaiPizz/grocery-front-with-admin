import 'server-only';

import type { NextRequest, NextResponse } from 'next/server';

import { clearProviderStepUpCookie } from './provider-step-up';

export const ACCESS_COOKIE_NAME = 'grocery_customer_access';
export const REFRESH_COOKIE_NAME = 'grocery_customer_refresh';
export const LEGACY_ACCESS_COOKIE_NAME = 'grocery_token';
export const LEGACY_REFRESH_COOKIE_NAME = 'grocery_refresh_token';

const DEFAULT_ACCESS_MAX_AGE_SECONDS = 15 * 60;
// Backend customer refresh sessions currently live for up to 90 days.
const DEFAULT_REFRESH_MAX_AGE_SECONDS = 90 * 24 * 60 * 60;

export interface CustomerTokens {
  accessToken: string | null;
  refreshToken: string | null;
  usedLegacyAccess: boolean;
  usedLegacyRefresh: boolean;
  hasLegacyAccess: boolean;
  hasLegacyRefresh: boolean;
}

function maxAgeFromJwt(token: string | null, fallback: number): number {
  if (!token) return fallback;

  try {
    const payload = token.split('.')[1];
    if (!payload) return fallback;

    const normalized = payload
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(payload.length / 4) * 4, '=');
    const parsed = JSON.parse(Buffer.from(normalized, 'base64').toString('utf8')) as { exp?: number };
    if (typeof parsed.exp !== 'number') return fallback;

    return Math.max(1, Math.floor(parsed.exp - Date.now() / 1000));
  } catch {
    return fallback;
  }
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

export function readCustomerTokens(request: NextRequest): CustomerTokens {
  const currentAccess = request.cookies.get(ACCESS_COOKIE_NAME)?.value ?? null;
  const currentRefresh = request.cookies.get(REFRESH_COOKIE_NAME)?.value ?? null;
  const legacyAccess = request.cookies.get(LEGACY_ACCESS_COOKIE_NAME)?.value ?? null;
  const legacyRefresh = request.cookies.get(LEGACY_REFRESH_COOKIE_NAME)?.value ?? null;

  return {
    accessToken: currentAccess ?? legacyAccess,
    refreshToken: currentRefresh ?? legacyRefresh,
    usedLegacyAccess: !currentAccess && Boolean(legacyAccess),
    usedLegacyRefresh: !currentRefresh && Boolean(legacyRefresh),
    hasLegacyAccess: Boolean(legacyAccess),
    hasLegacyRefresh: Boolean(legacyRefresh),
  };
}

export function setCustomerCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string | null,
  expiresIn?: number | null,
): void {
  const accessMaxAge = typeof expiresIn === 'number' && expiresIn > 0
    ? Math.floor(expiresIn)
    : maxAgeFromJwt(accessToken, DEFAULT_ACCESS_MAX_AGE_SECONDS);

  response.cookies.set(
    ACCESS_COOKIE_NAME,
    accessToken,
    cookieOptions(accessMaxAge),
  );

  if (refreshToken) {
    response.cookies.set(
      REFRESH_COOKIE_NAME,
      refreshToken,
      cookieOptions(maxAgeFromJwt(refreshToken, DEFAULT_REFRESH_MAX_AGE_SECONDS)),
    );
  } else {
    expireCookie(response, REFRESH_COOKIE_NAME);
  }
}

function expireCookie(response: NextResponse, name: string): void {
  response.cookies.set(name, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });
}

export function clearLegacyCookies(response: NextResponse): void {
  expireCookie(response, LEGACY_ACCESS_COOKIE_NAME);
  expireCookie(response, LEGACY_REFRESH_COOKIE_NAME);
}

export function clearCustomerCookies(response: NextResponse): void {
  expireCookie(response, ACCESS_COOKIE_NAME);
  expireCookie(response, REFRESH_COOKIE_NAME);
  clearLegacyCookies(response);
  clearProviderStepUpCookie(response);
}

export function setNoStoreHeaders(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'no-store, max-age=0');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Vary', 'Cookie');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  return response;
}
