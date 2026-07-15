'use client';

import { useTranslations } from 'next-intl';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ScrollToTopButton } from '@/components/layout/ScrollToTopButton';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { usePathname } from '@/i18n/navigation';

const NAV_HIDDEN_PREFIXES = [
  '/checkout',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/account',
] as const;

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  const tCommon = useTranslations('common');
  const pathname = usePathname();
  const navHidden = NAV_HIDDEN_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  ) || /^\/products\/[^/]+/.test(pathname);

  function handleSkipToContent() {
    const mainContent = document.getElementById('main-content');
    mainContent?.focus();
  }

  return (
    <div
      className="min-h-screen flex flex-col md:!pb-0"
      style={{
        paddingBottom: navHidden
          ? undefined
          : 'calc(3.5rem + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <button
        type="button"
        className="skip-link"
        aria-controls="main-content"
        onClick={handleSkipToContent}
      >
        {tCommon('skipToContent')}
      </button>
      <Header />
      <main id="main-content" tabIndex={-1} className="flex-1">{children}</main>
      <ScrollToTopButton />
      <MobileBottomNav />
      <Footer />
    </div>
  );
}
