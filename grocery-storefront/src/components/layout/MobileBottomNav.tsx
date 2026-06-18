'use client';

import { Grid2X2, Home, Heart, ShoppingCart } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { useCartStore } from '@/stores/cart-store';
import { useWishlistStore } from '@/stores/wishlist-store';
import { useHydrated } from '@/hooks/use-hydrated';

/**
 * Mobile bottom navigation for high-frequency storefront routes.
 *
 * Hidden on checkout and form/account flows where a fixed nav competes with
 * primary actions. Product detail keeps this nav; its add-to-cart bar floats
 * above it when needed.
 */

const HIDE_PREFIXES = ['/checkout', '/login', '/register', '/account'] as const;

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge: number;
  showBadge: boolean;
  testId: string;
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));
}

export function MobileBottomNav() {
  const t = useTranslations('nav');
  const tCommon = useTranslations('common');
  const pathname = usePathname();
  const isHydrated = useHydrated();
  const cartCount = useCartStore((s) => s.getItemCount());
  const cartInitialized = useCartStore((s) => s.initialized);
  const wishlistCount = useWishlistStore((s) => s.items.length);

  const hidden = HIDE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (hidden) return null;

  const items: NavItem[] = [
    {
      href: '/',
      label: t('home'),
      icon: Home,
      badge: 0,
      showBadge: false,
      testId: 'mobile-bottom-nav-home',
    },
    {
      href: '/categories',
      label: t('categories'),
      icon: Grid2X2,
      badge: 0,
      showBadge: false,
      testId: 'mobile-bottom-nav-categories',
    },
    {
      href: '/wishlist',
      label: t('wishlist'),
      icon: Heart,
      badge: wishlistCount,
      showBadge: isHydrated && wishlistCount > 0,
      testId: 'mobile-bottom-nav-wishlist',
    },
    {
      href: '/cart',
      label: t('cart'),
      icon: ShoppingCart,
      badge: cartCount,
      showBadge: isHydrated && cartInitialized && cartCount > 0,
      testId: 'mobile-bottom-nav-cart',
    },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t backdrop-blur md:hidden"
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'color-mix(in srgb, var(--color-card) 96%, transparent)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
      aria-label="Primary mobile navigation"
      data-testid="mobile-bottom-nav"
    >
      <ul className="grid grid-cols-4">
        {items.map(({ href, label, icon: Icon, badge, showBadge, testId }) => {
          const isActive = isActivePath(pathname, href);
          return (
            <li key={href} className="flex">
              <Link
                href={href}
                aria-current={isActive ? 'page' : undefined}
                aria-label={
                  showBadge
                    ? `${label}, ${tCommon('itemCount', { count: badge })}`
                    : label
                }
                className="relative flex h-14 w-full flex-col items-center justify-center gap-1 transition-colors duration-fast hover-surface"
                style={{
                  color: isActive ? 'var(--color-primary)' : 'var(--color-foreground)',
                }}
                data-testid={testId}
              >
                <span className="relative inline-flex">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {showBadge && (
                    <span
                      className="absolute -right-2.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white"
                      style={{ backgroundColor: 'var(--color-primary)' }}
                      aria-hidden="true"
                      data-testid={`${testId}-badge`}
                    >
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-medium leading-none">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
