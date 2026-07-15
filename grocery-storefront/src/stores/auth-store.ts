'use client';

import { create } from 'zustand';
import {
  clearLegacyAuthStorage,
  readLegacyAuthTokens,
  setAuthenticatedSessionHint,
} from '@/lib/auth';
import { useCartStore } from '@/stores/cart-store';
import { useWishlistStore } from '@/stores/wishlist-store';
import type { AuthError, AuthSession, CustomerProfile } from '@/types';

interface AuthActionResult {
  success: boolean;
  message: string | null;
  errors: AuthError[];
}

interface AuthApiResponse {
  success: boolean;
  message: string | null;
  customer: CustomerProfile | null;
  errors: AuthError[] | null;
}

interface SessionApiResponse {
  authenticated: boolean;
  customer: CustomerProfile | null;
  code?: string;
}

interface AuthState {
  session: AuthSession;
  initialized: boolean;
  isSubmitting: boolean;
  initialize: () => Promise<void>;
  login: (input: { email: string; password: string }) => Promise<AuthActionResult>;
  register: (input: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
    locale: 'pl' | 'en';
  }) => Promise<AuthActionResult>;
  logout: () => Promise<void>;
  clearSession: () => void;
}

function createGuestSession(): AuthSession {
  return { user: null, status: 'guest' };
}

function createLoadingSession(): AuthSession {
  return { user: null, status: 'loading' };
}

function createUnavailableSession(): AuthSession {
  return { user: null, status: 'unavailable' };
}

function createAuthenticatedSession(user: CustomerProfile): AuthSession {
  return { user, status: 'authenticated' };
}

function clearCustomerScopedState(): void {
  useCartStore.getState().clear();
  useWishlistStore.getState().resetLocal();
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<{ response: Response; payload: T | null }> {
  const response = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  let payload: T | null = null;
  try {
    payload = await response.json() as T;
  } catch {
    payload = null;
  }
  return { response, payload };
}

type SessionLoadResult =
  | { state: 'authenticated'; customer: CustomerProfile }
  | { state: 'invalid' | 'missing' | 'transient'; customer: null };

async function loadSession(): Promise<SessionLoadResult> {
  try {
    const { response, payload } = await requestJson<SessionApiResponse>('/api/auth/session', { method: 'GET' });
    if (response.ok && payload?.authenticated && payload.customer) {
      return { state: 'authenticated', customer: payload.customer };
    }
    return {
      state: response.status === 401 && payload?.code === 'NO_ACCESS_COOKIE'
        ? 'missing'
        : response.status === 401
          ? 'invalid'
          : 'transient',
      customer: null,
    };
  } catch {
    return { state: 'transient', customer: null };
  }
}

async function renewSession(): Promise<'renewed' | 'missing' | 'invalid' | 'transient'> {
  try {
    const { response, payload } = await requestJson<{ success?: boolean; code?: string }>('/api/auth/refresh', {
      method: 'POST',
      body: '{}',
    });
    if (response.ok && payload?.success === true) return 'renewed';
    if (response.status === 401 && payload?.code === 'NO_REFRESH_COOKIE') return 'missing';
    return response.status === 401 ? 'invalid' : 'transient';
  } catch {
    return 'transient';
  }
}

async function migrateLegacySession(): Promise<'migrated' | 'missing' | 'invalid' | 'transient'> {
  const legacy = readLegacyAuthTokens();
  if (!legacy.accessToken && !legacy.refreshToken) return 'missing';

  try {
    const { response, payload } = await requestJson<{ success?: boolean }>('/api/auth/legacy-migrate', {
      method: 'POST',
      body: JSON.stringify(legacy),
    });
    if (response.ok && payload?.success === true) return 'migrated';
    return response.status === 401 ? 'invalid' : 'transient';
  } catch {
    return 'transient';
  }
}

export const useAuthStore = create<AuthState>((set) => {
  let initializePromise: Promise<void> | null = null;

  return {
    session: createLoadingSession(),
    initialized: false,
    isSubmitting: false,

    initialize: async () => {
      if (initializePromise) return initializePromise;

      initializePromise = (async () => {
        set({ session: createLoadingSession(), initialized: false });

        let sessionResult = await loadSession();
        let hadRejectedCredentials = sessionResult.state === 'invalid';
        let allowLegacyMigration = false;
        if (sessionResult.state === 'invalid' || sessionResult.state === 'missing') {
          const renewal = await renewSession();
          if (renewal === 'renewed') {
            sessionResult = await loadSession();
            if (sessionResult.state === 'authenticated') hadRejectedCredentials = false;
            if (sessionResult.state === 'invalid') hadRejectedCredentials = true;
          } else if (renewal === 'transient') {
            sessionResult = { state: 'transient', customer: null };
          } else if (renewal === 'invalid') {
            hadRejectedCredentials = true;
            clearLegacyAuthStorage();
          } else if (renewal === 'missing') {
            allowLegacyMigration = true;
          }
        }

        if (
          (sessionResult.state === 'invalid' || sessionResult.state === 'missing')
          && allowLegacyMigration
        ) {
          const migration = await migrateLegacySession();
          if (migration === 'migrated') {
            sessionResult = await loadSession();
            if (sessionResult.state === 'authenticated') hadRejectedCredentials = false;
            if (sessionResult.state === 'invalid') hadRejectedCredentials = true;
          } else if (migration === 'transient') {
            sessionResult = { state: 'transient', customer: null };
          } else if (migration === 'invalid') {
            hadRejectedCredentials = true;
            sessionResult = { state: 'invalid', customer: null };
          } else {
            sessionResult = { state: 'missing', customer: null };
          }
        }

        if (sessionResult.state === 'transient') {
          setAuthenticatedSessionHint(false);
          set({ session: createUnavailableSession(), initialized: true });
          return;
        }

        clearLegacyAuthStorage();
        const customer = sessionResult.customer;
        if (hadRejectedCredentials) {
          clearCustomerScopedState();
        }
        setAuthenticatedSessionHint(sessionResult.state === 'authenticated');
        set({
          session: customer ? createAuthenticatedSession(customer) : createGuestSession(),
          initialized: true,
        });
      })();

      try {
        await initializePromise;
      } finally {
        initializePromise = null;
      }
    },

    login: async ({ email, password }) => {
      set({ isSubmitting: true });

      try {
        const { response, payload } = await requestJson<AuthApiResponse>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok || !payload?.success || !payload.customer) {
          return {
            success: false,
            message: payload?.message ?? 'Login failed',
            errors: payload?.errors ?? [],
          };
        }

        clearLegacyAuthStorage();
        setAuthenticatedSessionHint(true);
        set({ session: createAuthenticatedSession(payload.customer), initialized: true });
        return { success: true, message: payload.message, errors: [] };
      } catch {
        return { success: false, message: 'Login failed', errors: [] };
      } finally {
        set({ isSubmitting: false });
      }
    },

    register: async ({ fullName, email, password, phone, locale }) => {
      set({ isSubmitting: true });

      try {
        const { response, payload } = await requestJson<AuthApiResponse>('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ fullName, email, password, locale, ...(phone ? { phone } : {}) }),
        });

        if (!response.ok || !payload?.success || !payload.customer) {
          return {
            success: false,
            message: payload?.message ?? 'Registration failed',
            errors: payload?.errors ?? [],
          };
        }

        clearLegacyAuthStorage();
        setAuthenticatedSessionHint(true);
        set({ session: createAuthenticatedSession(payload.customer), initialized: true });
        return { success: true, message: payload.message, errors: [] };
      } catch {
        return { success: false, message: 'Registration failed', errors: [] };
      } finally {
        set({ isSubmitting: false });
      }
    },

    logout: async () => {
      try {
        await requestJson('/api/auth/logout', { method: 'POST', body: '{}' });
      } catch {
        // The BFF clears cookies even if upstream revocation fails; local state must also clear.
      } finally {
        clearLegacyAuthStorage();
        setAuthenticatedSessionHint(false);
        clearCustomerScopedState();
        set({ session: createGuestSession(), initialized: true });
      }
    },

    clearSession: () => {
      clearLegacyAuthStorage();
      setAuthenticatedSessionHint(false);
      clearCustomerScopedState();
      set({ session: createGuestSession(), initialized: true });
    },
  };
});
