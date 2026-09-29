'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { getLocaleNeutralConfiguredHref } from '@/lib/configured-content-localization';
import type { ShowcaseHeroSlide } from '@/types/storefront-config';
import { SHOWCASE_ACCENT, showcaseText } from './showcase-ui';

const AUTOPLAY_MS = 6000;
// Warm white close to the product-banner backgrounds, so the art's faded edge melts into the card.
const HERO_CARD = '#FBF8F3';

export function ShowcaseHero({ slides, english }: { slides: ShowcaseHeroSlide[]; english: boolean }) {
  const t = useTranslations('home.showcase');
  const active = slides.filter((slide) => slide.enabled);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const pointerStart = useRef<number | null>(null);
  const count = active.length;

  const goTo = useCallback((index: number) => setCurrent((count + index) % count), [count]);

  useEffect(() => {
    // Phones swipe; a banner changing under the thumb reads as flicker.
    if (paused || count <= 1 || !window.matchMedia('(min-width: 768px)').matches) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = setInterval(() => setCurrent((index) => (index + 1) % count), AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [paused, count]);

  if (count === 0) return null;

  const onPointerDown = (event: PointerEvent) => { pointerStart.current = event.clientX; };
  const onPointerUp = (event: PointerEvent) => {
    if (pointerStart.current === null) return;
    const dx = event.clientX - pointerStart.current;
    pointerStart.current = null;
    if (Math.abs(dx) > 40) goTo(current + (dx < 0 ? 1 : -1));
  };

  // Small dots beside the button (phone) or under it (desktop): never on the product art.
  const renderDots = (className: string) => (
    <div className={`flex gap-1.5 ${className}`} data-testid="showcase-hero-dots">
      {active.map((slide, index) => (
        <button
          key={slide.id}
          type="button"
          onClick={() => goTo(index)}
          aria-label={t('goToSlide', { index: index + 1 })}
          aria-current={index === current}
          className="flex h-6 items-center"
        >
          <span
            className="block h-1.5 rounded-full transition-all"
            style={{
              width: index === current ? 18 : 6,
              backgroundColor: index === current ? 'var(--color-primary)' : 'color-mix(in srgb, var(--color-foreground) 22%, transparent)',
            }}
          />
        </button>
      ))}
    </div>
  );

  return (
    <section
      className="container-grocery pt-4 md:pt-8"
      aria-roledescription="carousel"
      aria-label={t('heroLabel')}
      data-testid="showcase-hero"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        className="relative overflow-hidden rounded-[24px] touch-pan-y"
        style={{ backgroundColor: HERO_CARD }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        <div className="grid [&>*]:col-start-1 [&>*]:row-start-1">
          {active.map((slide, index) => {
            const visible = index === current;
            const href = getLocaleNeutralConfiguredHref(slide.ctaLink, slide.id);
            return (
              <div
                key={slide.id}
                className="transition-opacity duration-500 md:grid md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:items-center"
                style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none' }}
                aria-hidden={!visible}
                aria-roledescription="slide"
                aria-label={t('slideOf', { index: index + 1, count })}
                data-testid="showcase-hero-slide"
              >
                <picture className="block md:order-2">
                  {slide.mobileImageUrl ? <source media="(max-width: 767px)" srcSet={slide.mobileImageUrl} /> : null}
                  <img
                    src={slide.imageUrl}
                    alt=""
                    className="block aspect-[16/10] w-full object-cover md:[mask-image:linear-gradient(to_right,transparent,#000_14%)]"
                    loading={index === 0 ? 'eager' : 'lazy'}
                    fetchPriority={index === 0 ? 'high' : 'auto'}
                    draggable={false}
                  />
                </picture>
                <div className="px-5 pb-4 pt-3 md:order-1 md:flex md:flex-col md:justify-center md:py-10 md:pl-12 md:pr-4 lg:pl-16">
                  <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: SHOWCASE_ACCENT }}>
                    {showcaseText(slide.eyebrow, slide.eyebrowEn, english)}
                  </p>
                  <p
                    className="mt-1 font-display text-[1.4rem] font-bold leading-[1.1] md:text-[2.1rem] lg:text-[2.5rem]"
                    style={{ color: 'var(--color-foreground)' }}
                  >
                    {showcaseText(slide.headline, slide.headlineEn, english)}
                  </p>
                  <p className="mt-3 hidden max-w-md text-base leading-relaxed md:block" style={{ color: 'var(--color-muted-foreground)' }}>
                    {showcaseText(slide.subline, slide.sublineEn, english)}
                  </p>
                  <Link
                    href={href}
                    tabIndex={visible ? 0 : -1}
                    className="mt-2.5 inline-flex min-h-11 w-fit items-center gap-2 rounded-full px-6 text-sm font-semibold text-white transition-opacity hover:opacity-90 md:mt-6"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                    data-testid="showcase-hero-cta"
                  >
                    {showcaseText(slide.ctaText, slide.ctaTextEn, english)}
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {count > 1 ? (
          <>
            {renderDots('absolute bottom-[26px] right-5 md:bottom-3 md:left-12 md:right-auto lg:left-16')}
            <div className="absolute bottom-3 right-4 hidden gap-2 md:flex">
              {[{ step: -1, Icon: ChevronLeft, label: t('previousSlide') }, { step: 1, Icon: ChevronRight, label: t('nextSlide') }].map(({ step, Icon, label }) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => goTo(current + step)}
                  aria-label={label}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-sm transition hover:bg-white"
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </button>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
