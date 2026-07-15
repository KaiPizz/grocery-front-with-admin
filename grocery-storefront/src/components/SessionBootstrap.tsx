'use client';

import { useEffect } from 'react';
import { AUTH_SESSION_EXPIRED_EVENT } from '@/lib/auth';
import { useAuthStore } from '@/stores/auth-store';
import { useWishlistStore } from '@/stores/wishlist-store';

export function SessionBootstrap() {
  const initialize = useAuthStore((state) => state.initialize);
  const initialized = useAuthStore((state) => state.initialized);
  const authStatus = useAuthStore((state) => state.session.status);
  const clearSession = useAuthStore((state) => state.clearSession);
  const loadWishlist = useWishlistStore((state) => state.loadWishlist);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, clearSession);
    return () => window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, clearSession);
  }, [clearSession]);

  useEffect(() => {
    if (!initialized) return;
    void loadWishlist();
  }, [initialized, authStatus, loadWishlist]);

  return null;
}
