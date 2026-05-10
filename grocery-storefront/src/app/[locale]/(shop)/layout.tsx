'use client';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ScrollToTopButton } from '@/components/layout/ScrollToTopButton';
import { MobileFloatingCart } from '@/components/layout/MobileFloatingCart';

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main id="main-content" className="flex-1">{children}</main>
      <ScrollToTopButton />
      <MobileFloatingCart />
      <Footer />
    </div>
  );
}
