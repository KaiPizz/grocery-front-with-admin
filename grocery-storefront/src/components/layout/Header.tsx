'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ShoppingCart, Search, Menu, X, Leaf, Heart, LogIn, LogOut, UserRound, ChevronDown, Package, MapPin, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useCartStore } from '@/stores/cart-store';
import { useWishlistStore } from '@/stores/wishlist-store';
import { useMobileChromeStore } from '@/stores/mobile-chrome-store';
import { useStorefrontConfig } from '@/components/ConfigProvider';
import { SearchAutocomplete } from '@/components/search/SearchAutocomplete';
import { MiniCart } from './MiniCart';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { ShippingCountdown } from './ShippingCountdown';

export function Header() {
  const t = useTranslations('nav');
  const tAuth = useTranslations('auth');
  const tAccount = useTranslations('account');
  const tCommon = useTranslations('common');
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const mobileHeaderVisible = useMobileChromeStore((s) => s.mobileHeaderVisible);
  const setMobileHeaderVisible = useMobileChromeStore((s) => s.setMobileHeaderVisible);
  const itemCount = useCartStore((s) => s.getItemCount());
  const cartInitialized = useCartStore((s) => s.initialized);
  const wishlistCount = useWishlistStore((s) => s.items.length);
  const session = useAuthStore((s) => s.session);
  const logout = useAuthStore((s) => s.logout);
  const [isMounted, setIsMounted] = useState(false);
  const idleCycleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleCycleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastScrollYRef = useRef(0);
  const siteConfig = useStorefrontConfig();
  const isProductsRoute = pathname === '/products';
  const activeProductsSearch = searchParams.get('search') || '';

  const storeName = siteConfig?.branding?.storeName || 'Grocery';
  const logoUrl = siteConfig?.branding?.logoUrl;
  const headerCfg = siteConfig?.layout?.header;

  const hrefToI18n: Record<string, string> = {
    '/': t('home'),
    '/products': t('products'),
    '/recipes': t('recipes'),
  };

  const navItems = headerCfg?.navItems
    ? headerCfg.navItems
        .filter(n => n.enabled)
        .sort((a, b) => a.order - b.order)
        .map(n => ({ ...n, label: hrefToI18n[n.href] || n.label }))
    : [
        { label: t('home'), href: '/', enabled: true, order: 0 },
        { label: t('products'), href: '/products', enabled: true, order: 1 },
        { label: t('recipes'), href: '/recipes', enabled: true, order: 2 },
      ];
  const showSearch = headerCfg?.showSearch ?? true;
  const showWishlist = headerCfg?.showWishlist ?? true;
  const showLanguageSwitcher = headerCfg?.showLanguageSwitcher ?? true;
  const showThemeToggle = headerCfg?.showThemeToggle ?? true;

  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    if (isProductsRoute) {
      setSearchValue(activeProductsSearch);
    }
  }, [activeProductsSearch, isProductsRoute]);

  useEffect(() => {
    if (!isMounted) return;

    let rafId = 0;

    const resetIdleCycle = () => {
      setMobileHeaderVisible(true);

      if (idleCycleTimeoutRef.current) {
        clearTimeout(idleCycleTimeoutRef.current);
      }

      if (idleCycleIntervalRef.current) {
        clearInterval(idleCycleIntervalRef.current);
      }

      idleCycleTimeoutRef.current = setTimeout(() => {
        idleCycleIntervalRef.current = setInterval(() => {
          setMobileHeaderVisible((current) => !current);
        }, 5000);
      }, 5000);
    };

    const handleWindowScroll = () => {
      if (rafId) return;                       // throttle: one update per frame
      rafId = requestAnimationFrame(() => {
        rafId = 0;

        if (window.innerWidth >= 768) return;

        const currentScrollY = window.scrollY;
        const previousScrollY = lastScrollYRef.current;
        const delta = currentScrollY - previousScrollY;

        lastScrollYRef.current = currentScrollY;

        if (menuOpen || searchOpen) {
          setMobileHeaderVisible(true);
          return;
        }

        if (currentScrollY <= 24) {
          setMobileHeaderVisible(true);
          resetIdleCycle();
          return;
        }

        if (Math.abs(delta) < 6) {
          return;                               // skip tiny scrolls entirely
        }

        resetIdleCycle();                       // only reset when meaningful scroll

        if (delta > 0) {
          setMobileHeaderVisible(false);
        } else {
          setMobileHeaderVisible(true);
        }
      });
    };

    const handleInteraction = () => {
      if (window.innerWidth >= 768) return;
      resetIdleCycle();
    };

    lastScrollYRef.current = window.scrollY;
    resetIdleCycle();

    window.addEventListener('scroll', handleWindowScroll, { passive: true });
    window.addEventListener('pointerdown', handleInteraction, { passive: true });
    window.addEventListener('keydown', handleInteraction);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', handleWindowScroll);
      window.removeEventListener('pointerdown', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);

      if (idleCycleTimeoutRef.current) {
        clearTimeout(idleCycleTimeoutRef.current);
      }

      if (idleCycleIntervalRef.current) {
        clearInterval(idleCycleIntervalRef.current);
      }
    };
  }, [isMounted, menuOpen, searchOpen]);

  useEffect(() => {
    if (menuOpen || searchOpen) {
      setMobileHeaderVisible(true);
    }
  }, [menuOpen, searchOpen]);

  function handleSearch(query: string) {
    const q = query.trim();
    if (!q) return;
    const nextUrl = `/products?search=${encodeURIComponent(q)}`;

    if (isProductsRoute) {
      router.replace(nextUrl, { scroll: false });
    } else {
      router.push(nextUrl);
    }

    setSearchOpen(false);
    setSearchValue(q);
  }

  function handleMobileSearchAction() {
    setSearchOpen((current) => !current);
  }

  const isAuthenticated = isMounted && session.status === 'authenticated';
  const accountName = session.user?.fullName?.split(' ')[0] || t('account');
  const accountMenuItems = [
    { href: '/account#profile', label: tAccount('menuAccount'), icon: UserRound },
    { href: '/account#orders', label: tAccount('menuOrders'), icon: Package },
    { href: '/account#addresses', label: tAccount('menuAddresses'), icon: MapPin },
    { href: '/account#security', label: tAccount('menuSecurity'), icon: Shield },
    { href: '/wishlist', label: t('wishlist'), icon: Heart },
    { href: '/cart', label: t('cart'), icon: ShoppingCart },
  ];

  async function handleLogout() {
    await logout();
    setMenuOpen(false);
    toast.success(tAuth('logoutSuccess'));
    router.push('/');
  }

  return (
    <header
      className="sticky top-0 z-50 border-b backdrop-blur-md transition-transform duration-normal ease-out md:translate-y-0"
      style={{
        height: 'var(--header-height)',
        borderColor: 'var(--color-border)',
        backgroundColor: 'color-mix(in srgb, var(--color-background) 92%, transparent)',
        transform: isMounted && typeof window !== 'undefined' && window.innerWidth < 768 && !mobileHeaderVisible ? 'translateY(calc(-1 * var(--header-height)))' : undefined,
      }}
      role="banner"
      data-testid="mobile-sticky-header"
    >
      <ShippingCountdown cutoff={siteConfig?.general?.sameDayShippingCutoff} />

      <div
        className="container-grocery flex items-center justify-between gap-4"
        style={{ height: 'var(--header-main-height)' }}
      >
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group" aria-label={`${storeName} Home`}>
          {logoUrl ? (
            <img src={logoUrl} alt={storeName} className="h-9 w-auto rounded-xl transition-transform duration-fast group-hover:scale-105" />
          ) : (
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-fast group-hover:scale-105"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              <Leaf className="w-5 h-5 text-white" />
            </div>
          )}
          <span className="font-display text-lg font-bold hidden sm:block tracking-tight" style={{ color: 'var(--color-foreground)' }}>
            {storeName}
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
          {navItems.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="px-3 py-2 text-sm font-medium rounded-lg hover-surface"
              style={{ color: 'var(--color-foreground)' }}
            >
              {label}
            </Link>
          ))}
        </nav>

        {showSearch && <div className="hidden md:flex flex-1 max-w-md">
          <SearchAutocomplete
            inputId="desktop-search"
            value={searchValue}
            onValueChange={setSearchValue}
            onSearch={handleSearch}
            placeholder={t('searchPlaceholder')}
            className="w-full"
          />
        </div>}

        <div className="flex items-center gap-1">
          <button
            type="button"
            className="md:hidden p-2.5 rounded-xl hover-surface"
            onClick={handleMobileSearchAction}
            aria-label={searchOpen ? tCommon('closeSearch') : tCommon('openSearch')}
            aria-expanded={searchOpen}
          >
            {searchOpen ? (
              <X className="w-5 h-5" style={{ color: 'var(--color-foreground)' }} />
            ) : (
              <Search className="w-5 h-5" style={{ color: 'var(--color-foreground)' }} />
            )}
          </button>

          {showThemeToggle && <div className="hidden md:block" data-testid="mobile-header-theme">
            <ThemeToggle />
          </div>}
          {showLanguageSwitcher && <div className="hidden md:block" data-testid="mobile-header-language">
            <LanguageSwitcher />
          </div>}

          {showWishlist && <Link
            href="/wishlist"
            className="relative hidden md:inline-flex p-2.5 rounded-xl hover-surface"
            aria-label={`${t('wishlist')}${isMounted && wishlistCount > 0 ? `, ${tCommon('itemCount', { count: wishlistCount })}` : ''}`}
          >
            <Heart className="w-5 h-5" style={{ color: 'var(--color-foreground)' }} />
            {isMounted && wishlistCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
                style={{ backgroundColor: 'var(--color-primary)' }}
                aria-hidden="true"
              >
                {wishlistCount > 99 ? '99+' : wishlistCount}
              </span>
            )}
          </Link>}

          <MiniCart />

          {isAuthenticated ? (
            <div className="relative hidden md:block ml-1 group/account">
              <button
                type="button"
                className="h-10 max-w-[160px] rounded-xl px-3 flex items-center gap-2 border transition-colors duration-fast hover-surface"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
                title={session.user?.fullName || t('account')}
                aria-haspopup="menu"
              >
                <UserRound className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="text-sm font-medium truncate">{accountName}</span>
                <ChevronDown className="w-4 h-4 shrink-0 opacity-70 transition-transform duration-fast group-hover/account:rotate-180 group-focus-within/account:rotate-180" aria-hidden="true" />
              </button>

              <div className="absolute right-0 top-full pt-2 w-[280px] opacity-0 invisible translate-y-2 transition-all duration-fast group-hover/account:opacity-100 group-hover/account:visible group-hover/account:translate-y-0 group-focus-within/account:opacity-100 group-focus-within/account:visible group-focus-within/account:translate-y-0">
                <div
                  className="rounded-2xl border p-3 shadow-lg"
                  style={{
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'color-mix(in srgb, var(--color-card) 96%, white)',
                  }}
                >
                  <div className="px-2 pt-1 pb-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
                      {tAccount('greeting')}
                    </p>
                    <p className="mt-1 text-sm font-semibold truncate" style={{ color: 'var(--color-foreground)' }}>
                      {session.user?.fullName || t('account')}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--color-muted-foreground)' }}>
                      {session.user?.email}
                    </p>
                  </div>

                  <div className="py-2">
                    {accountMenuItems.map(({ href, label, icon: Icon }) => (
                      <Link
                        key={href}
                        href={href}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-fast hover-surface"
                        style={{ color: 'var(--color-foreground)' }}
                      >
                        <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>{label}</span>
                      </Link>
                    ))}
                  </div>

                  <div className="pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                    <button
                      type="button"
                      onClick={() => void handleLogout()}
                      className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-fast hover-surface"
                      style={{ color: 'var(--color-foreground)' }}
                    >
                      <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>{t('logout')}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden md:inline-flex h-10 px-3 rounded-xl border items-center gap-2 text-sm font-medium hover-surface ml-1"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
            >
              <LogIn className="w-4 h-4" aria-hidden="true" />
              <span>{t('login')}</span>
            </Link>
          )}

          <Link
            href="/wishlist"
            className="relative p-2.5 rounded-xl hover-surface md:hidden"
            aria-label={`${t('wishlist')}${isMounted && wishlistCount > 0 ? `, ${tCommon('itemCount', { count: wishlistCount })}` : ''}`}
            data-testid="mobile-header-wishlist"
          >
            <Heart className="w-5 h-5" style={{ color: 'var(--color-foreground)' }} />
            {isMounted && wishlistCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
                style={{ backgroundColor: 'var(--color-primary)' }}
                aria-hidden="true"
              >
                {wishlistCount > 99 ? '99+' : wishlistCount}
              </span>
            )}
          </Link>

          <Link
            href="/cart"
            className="relative p-2.5 rounded-xl hover-surface md:hidden"
            aria-label={`${t('cart')}${isMounted && cartInitialized && itemCount > 0 ? `, ${tCommon('itemCount', { count: itemCount })}` : ''}`}
          >
            <ShoppingCart className="w-5 h-5" style={{ color: 'var(--color-foreground)' }} />
            {isMounted && cartInitialized && itemCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
                style={{ backgroundColor: 'var(--color-primary)' }}
                data-testid="mobile-cart-count"
              >
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            )}
          </Link>

          <button
            type="button"
            className="md:hidden p-2.5 rounded-xl hover-surface"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? tCommon('closeMenu') : tCommon('openMenu')}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
          >
            {menuOpen ? (
              <X className="w-5 h-5" style={{ color: 'var(--color-foreground)' }} />
            ) : (
              <Menu className="w-5 h-5" style={{ color: 'var(--color-foreground)' }} />
            )}
          </button>
        </div>
      </div>

      {searchOpen && (
        <div
          className="md:hidden border-t px-4 py-3 animate-fade-up"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
        >
          <SearchAutocomplete
            inputId="mobile-search"
            value={searchValue}
            onValueChange={setSearchValue}
            onSearch={handleSearch}
            placeholder={t('searchPlaceholder')}
            autoFocus
            className="w-full"
            onDismiss={() => setSearchOpen(false)}
          />
        </div>
      )}

      {menuOpen && (
        <nav
          id="mobile-nav"
          className="md:hidden border-t animate-fade-up"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
          aria-label="Mobile navigation"
        >
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <div className="grid grid-cols-2 gap-2">
              <ThemeToggle
                className="w-full justify-center rounded-xl border px-3 py-3 text-sm"
                showLabel
                buttonTestId="mobile-nav-theme"
              />
              <LanguageSwitcher
                className="w-full justify-center rounded-xl border px-3 py-3 text-sm"
                showLabel
                buttonTestId="mobile-nav-language"
              />
            </div>
          </div>

          {isAuthenticated ? (
            <>
              <div
                className="px-4 py-3.5 text-sm font-medium border-b flex items-center gap-2"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
              >
                <UserRound className="w-4 h-4" aria-hidden="true" />
                <span>{session.user?.fullName || t('account')}</span>
              </div>
              <Link
                href="/account"
                className="block px-4 py-3.5 text-sm font-medium border-b hover-surface"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
                onClick={() => setMenuOpen(false)}
              >
                {tAccount('menuAccount')}
              </Link>
              <Link
                href="/wishlist"
                className="block px-4 py-3.5 text-sm font-medium border-b hover-surface"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
                onClick={() => setMenuOpen(false)}
              >
                {t('wishlist')}
                {isMounted && wishlistCount > 0 ? ` (${wishlistCount})` : ''}
              </Link>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="w-full text-left px-4 py-3.5 text-sm font-medium border-b hover-surface flex items-center gap-2"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
                <span>{t('logout')}</span>
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="block px-4 py-3.5 text-sm font-medium border-b hover-surface"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
                onClick={() => setMenuOpen(false)}
              >
                {t('login')}
              </Link>
              <Link
                href="/register"
                className="block px-4 py-3.5 text-sm font-medium border-b hover-surface"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
                onClick={() => setMenuOpen(false)}
              >
                {t('register')}
              </Link>
              <Link
                href="/wishlist"
                className="block px-4 py-3.5 text-sm font-medium border-b hover-surface"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
                onClick={() => setMenuOpen(false)}
              >
                {t('wishlist')}
                {isMounted && wishlistCount > 0 ? ` (${wishlistCount})` : ''}
              </Link>
            </>
          )}
          {[
            ...navItems,
            { href: '/cart', label: `${t('cart')}${isMounted && cartInitialized && itemCount > 0 ? ` (${itemCount})` : ''}`, enabled: true, order: 99 },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="block px-4 py-3.5 text-sm font-medium border-b hover-surface"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
