'use client';

import { create } from 'zustand';
import {
  clearAuthToken,
  clearRefreshToken,
  clearStoredCustomerProfile,
  getAuthToken,
  getRefreshToken,
  getStoredCustomerProfile,
  setAuthToken,
  setRefreshToken,
  setStoredCustomerProfile,
} from '@/lib/auth';
import {
  CUSTOMER_LOGIN_MUTATION,
  CUSTOMER_REGISTER_MUTATION,
  LOGOUT_MUTATION,
  ME_QUERY,
  REFRESH_TOKEN_MUTATION,
} from '@/lib/graphql/operations/grocery';
import { getGraphqlErrorMessage, graphqlRequest } from '@/lib/graphql/request';
import { useCartStore } from '@/stores/cart-store';
import { useWishlistStore } from '@/stores/wishlist-store';
import type { AuthError, AuthSession, CustomerProfile } from '@/types';

interface AuthActionResult {
  success: boolean;
  message: string | null;
  errors: AuthError[];
}

interface LoginResponse {
  customerLogin: {
    accessToken: string | null;
    refreshToken: string | null;
    expiresIn: number | null;
    success: boolean;
    message: string | null;
    customer: CustomerProfile | null;
    errors: AuthError[] | null;
  } | null;
}

interface RegisterResponse {
  customerRegister: {
    accessToken: string | null;
    refreshToken: string | null;
    expiresIn: number | null;
    success: boolean;
    message: string | null;
    customer: CustomerProfile | null;
    errors: AuthError[] | null;
  } | null;
}

interface MeResponse {
  me: CustomerProfile | null;
}

interface LogoutResponse {
  logout: {
    success: boolean;
    message: string | null;
  } | null;
}

interface RefreshTokenResponse {
  refreshToken: {
    success: boolean;
    accessToken: string | null;
    refreshToken: string | null;
    expiresIn: number | null;
    message: string | null;
  } | null;
}

interface AuthState {
  session: AuthSession;
  initialized: boolean;
  isSubmitting: boolean;
  initialize: () => Promise<void>;
  login: (input: { email: string; password: string }) => Promise<AuthActionResult>;
  register: (input: { fullName: string; email: string; password: string; phone?: string }) => Promise<AuthActionResult>;
  logout: () => Promise<void>;
  clearSession: () => void;
}

interface TokenPayload {
  sub?: string;
  email?: string;
  fullName?: string;
  name?: string;
}

function createGuestSession(): AuthSession {
  return {
    token: null,
    user: null,
    status: 'guest',
  };
}

function createLoadingSession(token: string | null, user: CustomerProfile | null = null): AuthSession {
  return {
    token,
    user,
    status: 'loading',
  };
}

function createAuthenticatedSession(token: string, user: CustomerProfile): AuthSession {
  return {
    token,
    user,
    status: 'authenticated',
  };
}

function persistSession(token: string, refreshToken: string | null, user: CustomerProfile): AuthSession {
  setAuthToken(token);
  if (refreshToken) {
    setRefreshToken(refreshToken);
  } else {
    clearRefreshToken();
  }
  setStoredCustomerProfile(user);
  return createAuthenticatedSession(token, user);
}

function clearSessionStorage() {
  clearAuthToken();
  clearRefreshToken();
  clearStoredCustomerProfile();
}

function decodeTokenPayload(token: string): TokenPayload | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;

    const normalized = payload
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(payload.length / 4) * 4, '=');
    const decoded = window.atob(normalized);

    return JSON.parse(decoded) as TokenPayload;
  } catch {
    return null;
  }
}

function buildProfileFromToken(token: string): CustomerProfile | null {
  const payload = decodeTokenPayload(token);
  const email = payload?.email?.trim();

  if (!email) return null;

  return {
    id: payload?.sub ?? email,
    email,
    fullName: payload?.fullName?.trim() || payload?.name?.trim() || email.split('@')[0] || 'Account',
  };
}

export const useAuthStore = create<AuthState>((set) => ({
  session: (() => {
    const token = typeof window !== 'undefined' ? getAuthToken() : null;
    const user = typeof window !== 'undefined' ? getStoredCustomerProfile() : null;

    if (token && user) {
      return createAuthenticatedSession(token, user);
    }

    if (token) {
      return createLoadingSession(token, user);
    }

    return createGuestSession();
  })(),
  initialized: false,
  isSubmitting: false,

  initialize: async () => {
    const token = getAuthToken();
    const refreshToken = getRefreshToken();
    const storedUser = getStoredCustomerProfile();

    if (token && storedUser) {
      set({
        session: createAuthenticatedSession(token, storedUser),
        initialized: true,
      });
      return;
    }

    if (!token && refreshToken) {
      set({ session: createLoadingSession(null, storedUser) });

      try {
        const refreshResponse = await graphqlRequest<RefreshTokenResponse>(REFRESH_TOKEN_MUTATION, {
          input: { refreshToken },
        });
        const refreshPayload = refreshResponse.data?.refreshToken;
        const fallbackUser = storedUser ?? (refreshPayload?.accessToken ? buildProfileFromToken(refreshPayload.accessToken) : null);

        if (refreshPayload?.success && refreshPayload.accessToken && fallbackUser) {
          const nextRefreshToken = refreshPayload.refreshToken ?? refreshToken;
          set({
            session: persistSession(refreshPayload.accessToken, nextRefreshToken, fallbackUser),
            initialized: true,
          });
          return;
        }
      } catch {
        // Fall through to guest cleanup.
      }
    }

    if (token && !storedUser) {
      const fallbackUser = buildProfileFromToken(token);

      if (fallbackUser) {
        setStoredCustomerProfile(fallbackUser);
        set({
          session: createAuthenticatedSession(token, fallbackUser),
          initialized: true,
        });
        return;
      }

      set({ session: createLoadingSession(token) });

      try {
        const response = await graphqlRequest<MeResponse>(ME_QUERY, undefined, { token });
        const user = response.data?.me ?? null;

        if (user) {
          setStoredCustomerProfile(user);
          set({
            session: createAuthenticatedSession(token, user),
            initialized: true,
          });
          return;
        }
      } catch {
        // Ignore and fall through to cleanup.
      }
    }

    if (token && storedUser) {
      set({
        session: createAuthenticatedSession(token, storedUser),
        initialized: true,
      });
      return;
    }

    clearSessionStorage();
    set({ session: createGuestSession(), initialized: true });
  },

  login: async ({ email, password }) => {
    set({ isSubmitting: true });

    try {
      const response = await graphqlRequest<LoginResponse>(CUSTOMER_LOGIN_MUTATION, {
        input: { email, password },
      });

      const topLevelMessage = getGraphqlErrorMessage(response.errors);
      const payload = response.data?.customerLogin;

      if (topLevelMessage || !payload) {
        return {
          success: false,
          message: topLevelMessage ?? 'Login failed',
          errors: [],
        };
      }

      if (!payload.success || !payload.accessToken || !payload.customer) {
        return {
          success: false,
          message: payload.message ?? payload.errors?.[0]?.message ?? 'Login failed',
          errors: payload.errors ?? [],
        };
      }

      const session = persistSession(payload.accessToken, payload.refreshToken, payload.customer);
      set({ session, initialized: true });

      return {
        success: true,
        message: payload.message ?? null,
        errors: [],
      };
    } catch {
      return {
        success: false,
        message: 'Login failed',
        errors: [],
      };
    } finally {
      set({ isSubmitting: false });
    }
  },

  register: async ({ fullName, email, password, phone }) => {
    set({ isSubmitting: true });

    try {
      const input = phone
        ? { fullName, email, password, phone }
        : { fullName, email, password };

      const response = await graphqlRequest<RegisterResponse>(CUSTOMER_REGISTER_MUTATION, {
        input,
      });

      const topLevelMessage = getGraphqlErrorMessage(response.errors);
      const payload = response.data?.customerRegister;

      if (topLevelMessage || !payload) {
        return {
          success: false,
          message: topLevelMessage ?? 'Registration failed',
          errors: [],
        };
      }

      if (!payload.success || !payload.accessToken || !payload.customer) {
        return {
          success: false,
          message: payload.message ?? payload.errors?.[0]?.message ?? 'Registration failed',
          errors: payload.errors ?? [],
        };
      }

      const session = persistSession(payload.accessToken, payload.refreshToken, payload.customer);
      set({ session, initialized: true });

      return {
        success: true,
        message: payload.message ?? null,
        errors: [],
      };
    } catch {
      return {
        success: false,
        message: 'Registration failed',
        errors: [],
      };
    } finally {
      set({ isSubmitting: false });
    }
  },

  logout: async () => {
    const token = getAuthToken();

    try {
      if (token) {
        await graphqlRequest<LogoutResponse>(LOGOUT_MUTATION, undefined, { token });
      }
    } catch {
      // Ignore logout transport errors and clear the local session regardless.
    } finally {
      clearSessionStorage();
      useCartStore.getState().clear();
      useWishlistStore.getState().resetLocal();
      set({ session: createGuestSession(), initialized: true });
    }
  },

  clearSession: () => {
    clearSessionStorage();
    set({ session: createGuestSession(), initialized: true });
  },
}));
