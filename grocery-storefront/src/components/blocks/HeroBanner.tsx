'use client';

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type FocusEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
  const pointerStartRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const lastSwipeAtRef = useRef(0);

  const goTo = useCallback(
    (index: number) => setCurrent((slides.length + index) % slides.length),
    [slides.length]
  );

  const startTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (
      !block.autoPlay ||
      slides.length <= 1 ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    timerRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % slides.length);
    }, block.autoPlayInterval);
  }, [block.autoPlay, block.autoPlayInterval, slides.length]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    startTimer();
    return stopTimer;
  }, [startTimer, stopTimer]);

  if (slides.length === 0) return null;

  const activeIndex = current % slides.length;
  const fallbackHeading = heading?.trim() || t('hero');

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'touch' || !event.isPrimary) return;
    pointerStartRef.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    stopTimer();
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = pointerStartRef.current;
    pointerStartRef.current = null;

    if (start?.id === event.pointerId) {
      const deltaX = event.clientX - start.x;
      const deltaY = event.clientY - start.y;
      const isHorizontalDrag =
        Math.abs(deltaX) >= 10 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2;

      if (isHorizontalDrag) {
        lastSwipeAtRef.current = Date.now();
      }
      if (isHorizontalDrag && Math.abs(deltaX) >= 40) {
        goTo(activeIndex + (deltaX > 0 ? -1 : 1));
      }
    }

    startTimer();
  }

  function handlePointerCancel() {
    pointerStartRef.current = null;
    startTimer();
  }

  function handleClickCapture(event: MouseEvent<HTMLDivElement>) {
    if (Date.now() - lastSwipeAtRef.current < 500) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  function handleMouseLeave(event: MouseEvent<HTMLDivElement>) {
    if (event.currentTarget.contains(document.activeElement)) return;
    startTimer();
  }

  function handleBlurCapture(event: FocusEvent<HTMLDivElement>) {
    if (
      event.relatedTarget &&
      event.currentTarget.contains(event.relatedTarget as Node)
    ) {
      return;
    }
    startTimer();
  }

  const inner = (
    <div
      className="relative aspect-[3.2/1] w-full touch-pan-y overflow-hidden"
      role="region"
      aria-label={fallbackHeading}
      aria-roledescription="carousel"
      onMouseEnter={stopTimer}
      onMouseLeave={handleMouseLeave}
      onFocusCapture={stopTimer}
      onBlurCapture={handleBlurCapture}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClickCapture={handleClickCapture}
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
          <button
            type="button"
            onClick={() => goTo(activeIndex - 1)}
            className="absolute left-0.5 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:left-2"
            aria-label={t('heroBannerPreviousSlide')}
          >
            <span
              data-testid="hero-carousel-arrow-visual"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-white/60 bg-black/25 shadow-md backdrop-blur-sm hover:bg-black/45 md:h-11 md:w-11"
            >
              <ChevronLeft
                className="h-4 w-4 drop-shadow md:h-5 md:w-5"
                aria-hidden="true"
              />
            </span>
          </button>

          <button
            type="button"
            onClick={() => goTo(activeIndex + 1)}
            className="absolute right-0.5 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:right-2"
            aria-label={t('heroBannerNextSlide')}
          >
            <span
              data-testid="hero-carousel-arrow-visual"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-white/60 bg-black/25 shadow-md backdrop-blur-sm hover:bg-black/45 md:h-11 md:w-11"
            >
              <ChevronRight
                className="h-4 w-4 drop-shadow md:h-5 md:w-5"
                aria-hidden="true"
              />
            </span>
          </button>

          <div
            className="absolute bottom-0 left-1/2 z-20 flex -translate-x-1/2"
            data-testid="hero-carousel-indicators"
          >
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                className="flex h-9 w-5 items-end justify-center rounded-full pb-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1 focus-visible:ring-offset-black/40"
                aria-label={t('heroBannerGoToSlide', { number: i + 1 })}
                aria-current={i === activeIndex ? 'true' : undefined}
              >
                <span
                  data-testid="hero-carousel-indicator"
                  className={`h-1 rounded-full ${i === activeIndex ? 'w-2.5' : 'w-1'}`}
                  style={{
                    backgroundColor: i === activeIndex ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.78)',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.48)',
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
