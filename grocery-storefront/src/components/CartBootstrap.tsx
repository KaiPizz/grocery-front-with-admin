'use client';

import { useEffect, useMemo, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { useCartStore } from '@/stores/cart-store';

export function CartBootstrap() {
  const pathname = usePathname();
  // This root bootstrap lives outside the locale's NextIntlClientProvider.
  const text = useMemo(() => pathname?.startsWith('/en') ? {
    failed: 'Your cart could not be synced. Your saved cart has not been cleared. Try again before checkout.',
    verify: 'Verify your email to sync your cart across devices. You can keep shopping on this device.',
    pending: 'Syncing your account cart…',
    changed: 'Your cart changed on another device during checkout. The newer cart was kept; review it before ordering again.',
    attention: 'Some saved items are no longer available in the requested quantity. Remove them or reduce quantities before checkout.',
    retry: 'Retry',
  } : {
    failed: 'Nie udało się zsynchronizować koszyka. Zapisany koszyk nie został usunięty. Spróbuj ponownie przed zamówieniem.',
    verify: 'Potwierdź adres e-mail, aby synchronizować koszyk między urządzeniami. Możesz nadal robić zakupy na tym urządzeniu.',
    pending: 'Synchronizowanie koszyka konta…',
    changed: 'Koszyk zmienił się na innym urządzeniu podczas składania zamówienia. Zachowano nowszy koszyk; sprawdź go przed kolejnym zamówieniem.',
    attention: 'Niektóre zapisane produkty nie są już dostępne w wybranej ilości. Usuń je lub zmniejsz ilość przed zamówieniem.',
    retry: 'Spróbuj ponownie',
  }, [pathname]);
  const initialized = useAuthStore((state) => state.initialized);
  const authStatus = useAuthStore((state) => state.session.status);
  const customerId = useAuthStore((state) => state.session.user?.id);
  const verified = useAuthStore((state) => state.session.user?.emailVerified === true);
  const hydrateCart = useCartStore((state) => state.hydrateCart);
  const syncAccountCart = useCartStore((state) => state.syncAccountCart);
  const syncStatus = useCartStore((state) => state.syncStatus);
  const syncNotice = useCartStore((state) => state.syncNotice);
  const notifiedCustomer = useRef<string | null>(null);

  useEffect(() => {
    if (!initialized || authStatus === 'unavailable') return;
    void hydrateCart();
  }, [initialized, authStatus, customerId, verified, hydrateCart]);

  useEffect(() => {
    if (!initialized || authStatus !== 'authenticated' || !verified) return;
    const refresh = () => {
      if (document.visibilityState !== 'hidden' && !useCartStore.getState().isLoading) void syncAccountCart();
    };
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', refresh);
    const timer = window.setInterval(refresh, 15_000);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.clearInterval(timer);
    };
  }, [initialized, authStatus, customerId, verified, syncAccountCart]);

  useEffect(() => {
    if (syncStatus === 'ready') notifiedCustomer.current = null;
    if (syncStatus === 'error' && customerId && notifiedCustomer.current !== customerId) {
      notifiedCustomer.current = customerId;
      toast.error(text.failed);
    }
  }, [syncStatus, customerId, text.failed]);

  if (!initialized || authStatus !== 'authenticated') return null;
  const message = syncStatus === 'error' ? text.failed
    : syncStatus === 'unverified' ? text.verify
      : syncStatus === 'pending' ? text.pending
        : syncNotice === 'changed' ? text.changed : syncNotice === 'attention' ? text.attention : null;
  if (!message) return null;
  return (
    <div className="container-grocery py-3 text-sm" role={syncStatus === 'error' ? 'alert' : 'status'}>
      <span>{message}</span>
      {syncStatus === 'error' && (
        <button type="button" className="ml-3 underline" onClick={() => void syncAccountCart()}>{text.retry}</button>
      )}
    </div>
  );
}
