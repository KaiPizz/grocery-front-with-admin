'use client';

import { useEffect } from 'react';
import { useCartStore } from '@/stores/cart-store';

export function CartBootstrap() {
  const hydrateCart = useCartStore((state) => state.hydrateCart);

  useEffect(() => {
    void hydrateCart();
  }, [hydrateCart]);

  return null;
}
