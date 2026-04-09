'use client';

import Cookies from 'js-cookie';
import type { CustomerProfile } from '@/types';

const AUTH_TOKEN_COOKIE = 'grocery_token';
const REFRESH_TOKEN_COOKIE = 'grocery_refresh_token';
const AUTH_TOKEN_STORAGE_KEY = 'grocery_auth_token';
const REFRESH_TOKEN_STORAGE_KEY = 'grocery_refresh_token';
const AUTH_SESSION_STORAGE_KEY = 'grocery_auth_session';
const AUTH_TOKEN_TTL_DAYS = 30;

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function getStoredValue(cookieKey: string, storageKey: string): string | null {
  if (!isBrowser()) return null;

  const cookieValue = Cookies.get(cookieKey);
  if (cookieValue) {
    window.localStorage.setItem(storageKey, cookieValue);
    return cookieValue;
  }

  const storageValue = window.localStorage.getItem(storageKey);
  if (storageValue) {
    Cookies.set(cookieKey, storageValue, {
      expires: AUTH_TOKEN_TTL_DAYS,
      path: '/',
      sameSite: 'lax',
      secure: window.location.protocol === 'https:',
    });
    return storageValue;
  }

  return null;
}

function setStoredValue(cookieKey: string, storageKey: string, value: string): void {
  if (!isBrowser()) return;

  Cookies.set(cookieKey, value, {
    expires: AUTH_TOKEN_TTL_DAYS,
    path: '/',
    sameSite: 'lax',
    secure: window.location.protocol === 'https:',
  });
  window.localStorage.setItem(storageKey, value);
}

function clearStoredValue(cookieKey: string, storageKey: string): void {
  if (!isBrowser()) return;

  Cookies.remove(cookieKey, { path: '/' });
  window.localStorage.removeItem(storageKey);
}

export function getAuthToken(): string | null {
  return getStoredValue(AUTH_TOKEN_COOKIE, AUTH_TOKEN_STORAGE_KEY);
}

export function setAuthToken(token: string): void {
  setStoredValue(AUTH_TOKEN_COOKIE, AUTH_TOKEN_STORAGE_KEY, token);
}

export function clearAuthToken(): void {
  clearStoredValue(AUTH_TOKEN_COOKIE, AUTH_TOKEN_STORAGE_KEY);
}

export function getRefreshToken(): string | null {
  return getStoredValue(REFRESH_TOKEN_COOKIE, REFRESH_TOKEN_STORAGE_KEY);
}

export function setRefreshToken(token: string): void {
  setStoredValue(REFRESH_TOKEN_COOKIE, REFRESH_TOKEN_STORAGE_KEY, token);
}

export function clearRefreshToken(): void {
  clearStoredValue(REFRESH_TOKEN_COOKIE, REFRESH_TOKEN_STORAGE_KEY);
}

export function getStoredCustomerProfile(): CustomerProfile | null {
  if (!isBrowser()) return null;

  const rawValue = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
  if (!rawValue) return null;

  try {
    return JSON.parse(rawValue) as CustomerProfile;
  } catch {
    window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
    return null;
  }
}

export function setStoredCustomerProfile(profile: CustomerProfile): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(profile));
}

export function clearStoredCustomerProfile(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
}
