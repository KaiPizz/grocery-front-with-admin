'use client';

import { useEffect } from 'react';
import { AUTH_SESSION_EXPIRED_EVENT } from '@/lib/auth';
import { CUSTOMER_STATE_OWNER_KEY, useAuthStore } from '@/stores/auth-store';
import { useWishlistStore } from '@/stores/wishlist-store';

export function SessionBootstrap() {
  const initialize = useAuthStore((state) => state.initialize);
  const initialized = useAuthStore((state) => state.initialized);
  const authStatus = useAuthStore((state) => state.session.status);
  const customerId = useAuthStore((state) => state.session.user?.id);
  const clearSession = useAuthStore((state) => state.clearSession);
  const loadWishlist = useWishlistStore((state) => state.loadWishlist);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, clearSession);
    const synchronize = (event: StorageEvent) => {
      if (event.key === CUSTOMER_STATE_OWNER_KEY) useAuthStore.getState().synchronizeSession(event.newValue);
    };
    window.addEventListener('storage', synchronize);
    return () => {
      window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, clearSession);
      window.removeEventListener('storage', synchronize);
    };
  }, [clearSession]);

  useEffect(() => {
    if (!initialized) return;
    void loadWishlist();
  }, [initialized, authStatus, customerId, loadWishlist]);

  return null;
}
