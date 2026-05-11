'use client';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ScrollToTopButton } from '@/components/layout/ScrollToTopButton';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { usePathname } from '@/i18n/navigation';

const NAV_HIDDEN_PREFIXES = ['/cart', '/checkout'] as const;

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const navHidden = NAV_HIDDEN_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  return (
    <div
      className="min-h-screen flex flex-col md:!pb-0"
      style={{
        paddingBottom: navHidden
          ? undefined
          : 'calc(3.5rem + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <Header />
      <main id="main-content" className="flex-1">{children}</main>
      <ScrollToTopButton />
      <MobileBottomNav />
      <Footer />
    </div>
  );
}
