'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useStorefrontConfig } from '@/components/ConfigProvider';

interface BannerSlide {
  headline: string;
  subtext: string;
  cta: string;
  href: string;
  gradient: string;
  imageUrl?: string | null;
}

export function PromoBanner() {
  const t = useTranslations('home');
  const [current, setCurrent] = useState(0);
  const siteConfig = useStorefrontConfig();
  const configBanners = siteConfig?.homepage?.promoBanners;

  const fallbackSlides: BannerSlide[] = [
    {
      headline: t('banner1Title'),
      subtext: t('banner1Sub'),
      cta: t('banner1Cta'),
      href: '/products?zone=CHILLED',
      gradient: 'linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 70%, #000))',
    },
    {
      headline: t('banner2Title'),
      subtext: t('banner2Sub'),
      cta: t('banner2Cta'),
      href: '/products?sort=price_asc',
      gradient: 'linear-gradient(135deg, var(--color-frozen), color-mix(in srgb, var(--color-frozen) 70%, #000))',
    },
    {
      headline: t('banner3Title'),
      subtext: t('banner3Sub'),
      cta: t('banner3Cta'),
      href: '/products?zone=FROZEN',
      gradient: 'linear-gradient(135deg, var(--color-ambient), color-mix(in srgb, var(--color-ambient) 70%, #000))',
    },
  ];

  const slides: BannerSlide[] = configBanners && configBanners.length > 0
    ? configBanners
        .filter(b => b.enabled)
        .sort((a, b) => a.order - b.order)
        .map(b => ({ headline: b.headline, subtext: b.subtext, cta: b.ctaText, href: b.ctaLink, gradient: b.gradient, imageUrl: b.imageUrl }))
    : fallbackSlides;

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;

    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next]);

  return (
    <div
      className="rounded-xl overflow-hidden relative"
      style={{ height: 'clamp(200px, 30vw, 280px)' }}
      aria-roledescription="carousel"
      aria-label={t('promoTitle')}
    >
      <div
        className="flex h-full transition-transform duration-500 ease-out"
        style={{
          transform: `translateX(-${(current * 100) / slides.length}%)`,
          width: `${slides.length * 100}%`,
        }}
      >
        {slides.map((slide, i) => (
          <div
            key={i}
            className="flex-shrink-0 relative overflow-hidden"
            style={{
              width: `${100 / slides.length}%`,
              ...(!slide.imageUrl ? { background: slide.gradient } : {}),
            }}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${slides.length}: ${slide.headline}`}
          >
            {slide.imageUrl && (
              <>
                <img
                  src={slide.imageUrl}
                  alt={slide.headline}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/35" aria-hidden="true" />
              </>
            )}
            <div className="relative z-10 flex items-center justify-center h-full px-8 md:px-16">
              <div className="text-center text-white max-w-md">
                {slide.headline && (
                  <h3 className="heading-display text-xl md:text-2xl lg:text-3xl mb-2">{slide.headline}</h3>
                )}
                {slide.subtext && (
                  <p className="text-sm md:text-base opacity-90 mb-4">{slide.subtext}</p>
                )}
                {slide.cta && (
                  <Link
                    href={slide.href}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-white/20 backdrop-blur-sm text-sm font-semibold text-white transition-all hover:bg-white/30 active:scale-95"
                  >
                    {slide.cta}
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setCurrent(i)}
            className="w-2 h-2 rounded-full transition-all duration-fast"
            style={{
              backgroundColor: i === current ? 'white' : 'rgba(255,255,255,0.4)',
              transform: i === current ? 'scale(1.3)' : 'scale(1)',
            }}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
