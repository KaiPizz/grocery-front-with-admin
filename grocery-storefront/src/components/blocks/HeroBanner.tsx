'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { getLocaleNeutralConfiguredHref } from '@/lib/configured-content-localization';
import { getImageSrc } from '@/lib/utils';
import type { HeroBannerBlock } from '@/types/storefront-config';

interface HeroBannerProps {
  block: HeroBannerBlock;
  heading?: string;
}

export function HeroBanner({ block, heading }: HeroBannerProps) {
  const t = useTranslations('home');
  const slides = block.slides.filter((s) => s.enabled);
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback(
    (index: number) => setCurrent((slides.length + index) % slides.length),
    [slides.length]
  );

  const startTimer = useCallback(() => {
    if (!block.autoPlay || slides.length <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % slides.length);
    }, block.autoPlayInterval);
  }, [block.autoPlay, block.autoPlayInterval, slides.length]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    startTimer();
    return stopTimer;
  }, [startTimer, stopTimer]);

  if (slides.length === 0) return null;

  const activeIndex = current % slides.length;
  const fallbackHeading = heading?.trim() || t('hero');

  const inner = (
    <div
      className="relative aspect-[3.2/1] w-full overflow-hidden"
      onMouseEnter={stopTimer}
      onMouseLeave={startTimer}
      onFocusCapture={stopTimer}
      onBlurCapture={startTimer}
    >
      {slides.map((s, i) => {
        const isActive = i === activeIndex;
        const slideMedia = s.imageUrl || s.mobileImageUrl ? (
            <picture className="block h-full w-full">
              {s.mobileImageUrl && (
                <source
                  media="(max-width: 767px)"
                  srcSet={getImageSrc(s.mobileImageUrl, { maxWidth: 768 }) || s.mobileImageUrl}
                />
              )}
              <img
                src={getImageSrc(s.imageUrl || s.mobileImageUrl, { maxWidth: 1440 }) || s.imageUrl || s.mobileImageUrl || ''}
                alt={s.title.trim() || t('heroBannerSlideAlt', { title: fallbackHeading, number: i + 1 })}
                className="block h-full w-full object-cover"
                loading={i === 0 ? 'eager' : 'lazy'}
              />
            </picture>
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-green-700 to-green-900" />
          );
        const imageOnlyLink = s.ctaLink && !s.title && !s.ctaText;

        return (
          <div
            key={s.id}
            className={`absolute inset-0 transition-opacity duration-700 ${isActive ? 'z-10 opacity-100' : 'pointer-events-none z-0 opacity-0'}`}
            aria-hidden={!isActive}
          >
            {imageOnlyLink ? (
              <Link
                href={getLocaleNeutralConfiguredHref(s.ctaLink, s.id)}
                className="block h-full w-full"
                aria-label={t('heroBannerCtaAria', { title: fallbackHeading })}
                tabIndex={isActive ? 0 : -1}
              >
                {slideMedia}
              </Link>
            ) : slideMedia}

            {(s.title || s.ctaText) && (
              <div className="absolute inset-0 flex flex-col items-start justify-center px-8 md:px-16 bg-gradient-to-r from-black/40 to-transparent">
                {s.title && (
                  <h2 className="text-white text-xl md:text-3xl font-bold drop-shadow-md max-w-md mb-3">
                    {s.title}
                  </h2>
                )}
                {s.ctaText && s.ctaLink && (
                  <Link
                    href={getLocaleNeutralConfiguredHref(s.ctaLink, s.id)}
                    className="inline-flex items-center gap-2 rounded-full bg-white text-gray-900 px-5 py-2.5 text-sm font-semibold hover:bg-gray-100 transition-colors shadow"
                    tabIndex={isActive ? 0 : -1}
                  >
                    {s.ctaText}
                  </Link>
                )}
              </div>
            )}
          </div>
        );
      })}

      {slides.length > 1 && (
        <>
          <div className="absolute bottom-0 left-1/2 z-20 flex -translate-x-1/2">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                className="flex h-11 w-11 items-center justify-center rounded-full"
                aria-label={t('heroBannerGoToSlide', { number: i + 1 })}
                aria-current={i === activeIndex ? 'true' : undefined}
              >
                <span
                  className={`h-2 rounded-full transition-all ${i === activeIndex ? 'w-4' : 'w-2'}`}
                  style={{
                    backgroundColor: i === activeIndex ? 'var(--color-primary)' : 'var(--color-card)',
                    boxShadow: '0 0 0 1px color-mix(in srgb, var(--color-foreground) 45%, transparent), 0 1px 3px color-mix(in srgb, var(--color-foreground) 24%, transparent)',
                  }}
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );

  return inner;
}
