'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

export function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let rafId = 0;

    function handleScroll() {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        setIsVisible(window.scrollY > 360);
      });
    }

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <button
      type="button"
      onClick={scrollToTop}
      className={`fixed bottom-[calc(8.75rem+env(safe-area-inset-bottom,0px))] right-5 z-20 flex h-12 w-12 items-center justify-center rounded-full border shadow-lg transition-all duration-normal md:bottom-5 md:z-40 ${
        isVisible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
      style={{
        backgroundColor: 'color-mix(in srgb, var(--color-card) 92%, transparent)',
        borderColor: 'var(--color-border)',
        color: 'var(--color-foreground)',
        boxShadow: '0 16px 40px -18px color-mix(in srgb, var(--color-foreground) 30%, transparent)',
      }}
      aria-label="Scroll to top"
    >
      <ArrowUp className="w-5 h-5" aria-hidden="true" />
    </button>
  );
}
