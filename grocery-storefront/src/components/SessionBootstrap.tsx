'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useWishlistStore } from '@/stores/wishlist-store';

export function SessionBootstrap() {
  const initialize = useAuthStore((state) => state.initialize);
  const initialized = useAuthStore((state) => state.initialized);
  const authStatus = useAuthStore((state) => state.session.status);
  const loadWishlist = useWishlistStore((state) => state.loadWishlist);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (!initialized) return;
    void loadWishlist();
  }, [initialized, authStatus, loadWishlist]);

  return null;
}
