'use client';

import { create } from 'zustand';
import {
  clearLegacyAuthStorage,
  invalidateCustomerState,
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
  customerStateRevision: number;
  synchronizeSession: (owner: string | null) => void;
  initialize: () => Promise<void>;
  login: (input: { email: string; password: string }) => Promise<AuthActionResult>;
  googleLogin: (credential: string) => Promise<AuthActionResult>;
  facebookLogin: (
    accessToken: string,
    state: string,
    locale: 'pl' | 'en',
  ) => Promise<AuthActionResult>;
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

export const CUSTOMER_STATE_OWNER_KEY = 'grocery-customer-state-owner';

function readCustomerStateOwner(storage: 'localStorage' | 'sessionStorage' = 'localStorage'): string | null {
  try {
    return typeof window === 'undefined' ? null : window[storage].getItem(CUSTOMER_STATE_OWNER_KEY);
  } catch {
    return null;
  }
}

function writeCustomerStateOwner(id: string | null, publish = true): void {
  try {
    window.sessionStorage.setItem(CUSTOMER_STATE_OWNER_KEY, id ?? 'guest');
  } catch {
    // Tab storage may be blocked independently of shared storage.
  }
  try {
    if (publish) {
      if (id) window.localStorage.setItem(CUSTOMER_STATE_OWNER_KEY, id);
      else window.localStorage.removeItem(CUSTOMER_STATE_OWNER_KEY);
    }
  } catch {
    // A blocked storage must not prevent local logout or session changes.
  }
}

function clearCheckoutStorage(sessionOnly = false): void {
  for (const [storageName, keys] of [
    ['localStorage', ['adg-checkout-contact', 'adg-p24-cart-snapshot']],
    ['sessionStorage', ['oms-checkout-draft-v2', 'oms-pending-checkout', 'adg-p24-pending', 'adg-last-order']],
  ] as const) {
    if (sessionOnly && storageName !== 'sessionStorage') continue;
    for (const key of keys) {
      try { window[storageName].removeItem(key); } catch { /* Storage may be blocked. */ }
    }
  }
}

function clearCustomerScopedState(): number {
  const generation = invalidateCustomerState();
  // Zustand updates memory before its persistence middleware writes storage.
  // A denied persistence write must not interrupt the remaining privacy cleanup.
  try { useCartStore.getState().clear(); } catch { /* Memory is already cleared. */ }
  try { useWishlistStore.getState().resetLocal(); } catch { /* Memory is already cleared. */ }
  clearCheckoutStorage();
  return generation;
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
  | { state: 'invalid' | 'missing' | 'transient' | 'guest'; customer: null };

async function loadSession(): Promise<SessionLoadResult> {
  try {
    const { response, payload } = await requestJson<SessionApiResponse>('/api/auth/session', { method: 'GET' });
    if (response.ok && payload?.authenticated && payload.customer) {
      return { state: 'authenticated', customer: payload.customer };
    }
    if (response.ok && payload?.authenticated === false && payload.code === 'NO_SESSION_COOKIE') {
      return { state: 'guest', customer: null };
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

export const useAuthStore = create<AuthState>((set, get) => {
  let initializePromise: Promise<void> | null = null;
  let requestVersion = 0;
  let ownerId = readCustomerStateOwner();
  let tabOwnerId = readCustomerStateOwner('sessionStorage');
  let logoutPending = false;

  function acceptSession(customer: CustomerProfile | null, rejected = false): void {
    const nextOwnerId = customer?.id ?? null;
    const changed = rejected || (ownerId !== null && ownerId !== nextOwnerId);
    let customerStateRevision = get().customerStateRevision;
    if (changed) customerStateRevision = clearCustomerScopedState();
    else if (tabOwnerId === null || (tabOwnerId !== (nextOwnerId ?? 'guest') && tabOwnerId !== 'guest')) {
      // A restored tab may have missed the shared storage event. Its draft can
      // belong to A even though the shared cart and cookie already belong to B.
      // Pre-upgrade drafts without an owner are also untrusted; retain the cart.
      clearCheckoutStorage(true);
      // Checkout waits for bootstrap, so no old form is mounted here. Keep
      // already-running hydration of the current shared cart alive.
    }
    ownerId = nextOwnerId;
    tabOwnerId = nextOwnerId ?? 'guest';
    writeCustomerStateOwner(ownerId);
    setAuthenticatedSessionHint(Boolean(customer));
    useCartStore.getState().setCustomerSession(nextOwnerId, customer?.emailVerified === true);
    set({ session: customer ? createAuthenticatedSession(customer) : createGuestSession(), initialized: true, customerStateRevision });
  }

  return {
    session: createLoadingSession(),
    initialized: false,
    isSubmitting: false,
    customerStateRevision: 0,

    synchronizeSession: (owner) => {
      if (owner !== readCustomerStateOwner()) return;
      ++requestVersion;
      const customerStateRevision = invalidateCustomerState();
      setAuthenticatedSessionHint(false);
      clearCheckoutStorage(true);
      set({ session: createLoadingSession(), initialized: false, customerStateRevision });
      // The initiating tab owns shared persistence cleanup. Rehydrate its new
      // state instead of letting this stale tab overwrite the new customer's cart.
      window.location.reload();
    },

    initialize: async () => {
      if (initializePromise) return initializePromise;
      const version = ++requestVersion;

      initializePromise = (async () => {
        set({ session: createLoadingSession(), initialized: false });

        let sessionResult = await loadSession();
        let hadRejectedCredentials = sessionResult.state === 'invalid';
        let allowLegacyMigration = false;
        if (sessionResult.state === 'guest') {
          const legacyTokens = readLegacyAuthTokens();
          allowLegacyMigration = Boolean(legacyTokens.accessToken || legacyTokens.refreshToken);
        }
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
          (sessionResult.state === 'invalid' || sessionResult.state === 'missing' || sessionResult.state === 'guest')
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
            sessionResult = { state: 'guest', customer: null };
          }
        }

        if (version !== requestVersion) return;
        if (sessionResult.state === 'transient') {
          setAuthenticatedSessionHint(false);
          useCartStore.getState().setCustomerSession(null, false, false);
          set({ session: createUnavailableSession(), initialized: true });
          return;
        }

        clearLegacyAuthStorage();
        acceptSession(sessionResult.customer, hadRejectedCredentials);
      })();

      const pendingInitialization = initializePromise;
      try {
        await pendingInitialization;
      } finally {
        if (initializePromise === pendingInitialization) initializePromise = null;
      }
    },

    login: async ({ email, password }) => {
      if (logoutPending) return { success: false, message: null, errors: [] };
      const version = requestVersion;
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

        if (version !== requestVersion) return { success: false, message: null, errors: [] };
        ++requestVersion;
        clearLegacyAuthStorage();
        acceptSession(payload.customer);
        return { success: true, message: payload.message, errors: [] };
      } catch {
        return { success: false, message: 'Login failed', errors: [] };
      } finally {
        set({ isSubmitting: false });
      }
    },

    googleLogin: async (credential) => {
      if (logoutPending) return { success: false, message: null, errors: [] };
      const version = requestVersion;
      set({ isSubmitting: true });

      try {
        const { response, payload } = await requestJson<AuthApiResponse>('/api/auth/google', {
          method: 'POST',
          body: JSON.stringify({ credential }),
        });

        if (!response.ok || !payload?.success || !payload.customer) {
          return {
            success: false,
            message: payload?.message ?? 'Google sign-in failed',
            errors: [],
          };
        }

        if (version !== requestVersion) return { success: false, message: null, errors: [] };
        ++requestVersion;
        clearLegacyAuthStorage();
        acceptSession(payload.customer);
        return { success: true, message: payload.message, errors: [] };
      } catch {
        return { success: false, message: 'Google sign-in failed', errors: [] };
      } finally {
        set({ isSubmitting: false });
      }
    },

    facebookLogin: async (accessToken, state, locale) => {
      if (logoutPending) return { success: false, message: null, errors: [] };
      const version = requestVersion;
      set({ isSubmitting: true });

      try {
        const { response, payload } = await requestJson<AuthApiResponse>('/api/auth/facebook', {
          method: 'POST',
          body: JSON.stringify({ accessToken, state, locale }),
        });

        if (!response.ok || !payload?.success || !payload.customer) {
          return {
            success: false,
            message: payload?.message ?? 'Facebook sign-in failed',
            errors: [],
          };
        }

        if (version !== requestVersion) return { success: false, message: null, errors: [] };
        ++requestVersion;
        clearLegacyAuthStorage();
        acceptSession(payload.customer);
        return { success: true, message: payload.message, errors: [] };
      } catch {
        return { success: false, message: 'Facebook sign-in failed', errors: [] };
      } finally {
        set({ isSubmitting: false });
      }
    },

    register: async ({ fullName, email, password, phone, locale }) => {
      if (logoutPending) return { success: false, message: null, errors: [] };
      const version = requestVersion;
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

        if (version !== requestVersion) return { success: false, message: null, errors: [] };
        ++requestVersion;
        clearLegacyAuthStorage();
        acceptSession(payload.customer);
        return { success: true, message: payload.message, errors: [] };
      } catch {
        return { success: false, message: 'Registration failed', errors: [] };
      } finally {
        set({ isSubmitting: false });
      }
    },

    logout: async () => {
      logoutPending = true;
      set({ isSubmitting: true });
      get().clearSession();
      try {
        const { response } = await requestJson('/api/auth/logout', { method: 'POST', body: '{}' });
        if (!response.ok) throw new Error('Logout failed');
        // The BFF clears cookies even if upstream revocation fails. Publish only
        // after that response so peers cannot bootstrap the outgoing cookie.
        writeCustomerStateOwner(null);
      } catch (error) {
        set({ session: createUnavailableSession(), initialized: true });
        throw error;
      } finally {
        logoutPending = false;
        set({ isSubmitting: false });
      }
    },

    clearSession: () => {
      ++requestVersion;
      initializePromise = null;
      clearLegacyAuthStorage();
      setAuthenticatedSessionHint(false);
      const customerStateRevision = clearCustomerScopedState();
      useCartStore.getState().setCustomerSession(null, false);
      ownerId = null;
      tabOwnerId = 'guest';
      writeCustomerStateOwner(null, !logoutPending);
      set({ session: createGuestSession(), initialized: true, customerStateRevision });
    },
  };
});
