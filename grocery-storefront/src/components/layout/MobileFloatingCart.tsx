'use client';

import { ShoppingCart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { useCartStore } from '@/stores/cart-store';
import { useMobileChromeStore } from '@/stores/mobile-chrome-store';
import { useHydrated } from '@/hooks/use-hydrated';

/**
 * Floating cart pill that appears in the top-right on mobile when the
 * scroll-driven hide-on-scroll header (`Header.tsx`) is hidden. Keeps the
 * cart one tap away even mid-scroll on long product/category pages.
 *
 * - mobile-only (`md:hidden`)
 * - hidden on `/cart` itself (no point)
 * - fades in/out via opacity + translate, GPU-only transitions per project convention
 * - reads `mobileHeaderVisible` from `useMobileChromeStore`; visible exactly when
 *   the in-header mobile cart link is hidden
 */
export function MobileFloatingCart() {
  const t = useTranslations('nav');
  const tCommon = useTranslations('common');
  const pathname = usePathname();
  const isHydrated = useHydrated();
  const itemCount = useCartStore((s) => s.getItemCount());
  const cartInitialized = useCartStore((s) => s.initialized);
  const mobileHeaderVisible = useMobileChromeStore((s) => s.mobileHeaderVisible);

  // Don't render at all on the cart page or before hydration
  if (!isHydrated || pathname === '/cart') return null;

  const isVisible = !mobileHeaderVisible;
  const hasCount = cartInitialized && itemCount > 0;

  return (
    <Link
      href="/cart"
      className="fixed top-3 right-3 z-[60] flex h-12 w-12 items-center justify-center rounded-full border shadow-lg backdrop-blur-md transition-all duration-normal ease-out md:hidden"
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'color-mix(in srgb, var(--color-card) 92%, transparent)',
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? 'auto' : 'none',
        transform: isVisible ? 'translateY(0)' : 'translateY(-8px)',
      }}
      aria-label={`${t('cart')}${hasCount ? `, ${tCommon('itemCount', { count: itemCount })}` : ''}`}
      aria-hidden={!isVisible}
      tabIndex={isVisible ? 0 : -1}
      data-testid="mobile-floating-cart"
    >
      <ShoppingCart className="h-5 w-5" style={{ color: 'var(--color-foreground)' }} aria-hidden="true" />
      {hasCount && (
        <span
          className="absolute -top-0.5 -right-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
          style={{ backgroundColor: 'var(--color-primary)' }}
          aria-hidden="true"
          data-testid="mobile-floating-cart-count"
        >
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </Link>
  );
}
