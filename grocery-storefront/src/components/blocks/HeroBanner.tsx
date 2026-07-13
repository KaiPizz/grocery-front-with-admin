'use client';

/* eslint-disable @next/next/no-img-element -- Runtime-configured admin media can use arbitrary URLs until the production media loader policy is defined. */

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { getImageSrc } from '@/lib/utils';
import type { HeroBannerBlock } from '@/types/storefront-config';

interface HeroBannerProps {
  block: HeroBannerBlock;
}

export function HeroBanner({ block }: HeroBannerProps) {
  const slides = block.slides.filter((s) => s.enabled);
  const hasDedicatedMobileArtwork = slides.every((s) => Boolean(s.mobileImageUrl));
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

  const slide = slides[current];

  const inner = (
    <div
      className={`relative w-full overflow-hidden ${
        hasDedicatedMobileArtwork ? 'aspect-[1.6/1]' : 'aspect-[3.2/1]'
      } md:aspect-[3.2/1]`}
      onMouseEnter={stopTimer}
      onMouseLeave={startTimer}
    >
      {slides.map((s, i) => (
        <div
          key={s.id}
          className={`absolute inset-0 transition-opacity duration-700 ${i === current ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
        >
          {s.imageUrl || s.mobileImageUrl ? (
            <>
              {hasDedicatedMobileArtwork && s.mobileImageUrl && (
                <img
                  src={getImageSrc(s.mobileImageUrl, { maxWidth: 768 }) || s.mobileImageUrl}
                  alt={s.title.trim() || `Store promotion banner ${i + 1}`}
                  className="w-full h-full object-cover block md:hidden"
                  loading={i === 0 ? 'eager' : 'lazy'}
                />
              )}
              <img
                src={getImageSrc(s.imageUrl || s.mobileImageUrl, { maxWidth: 1440 }) || s.imageUrl || s.mobileImageUrl || ''}
                alt={s.title.trim() || `Store promotion banner ${i + 1}`}
                className={`w-full h-full object-cover ${hasDedicatedMobileArtwork ? 'hidden md:block' : 'block'}`}
                loading={i === 0 ? 'eager' : 'lazy'}
              />
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-green-700 to-green-900" />
          )}

          {(s.title || s.ctaText) && (
            <div className="absolute inset-0 flex flex-col items-start justify-center px-8 md:px-16 bg-gradient-to-r from-black/40 to-transparent">
              {s.title && (
                <h2 className="text-white text-xl md:text-3xl font-bold drop-shadow-md max-w-md mb-3">
                  {s.title}
                </h2>
              )}
              {s.ctaText && s.ctaLink && (
                <Link
                  href={s.ctaLink}
                  className="inline-flex items-center gap-2 rounded-full bg-white text-gray-900 px-5 py-2.5 text-sm font-semibold hover:bg-gray-100 transition-colors shadow"
                >
                  {s.ctaText}
                </Link>
              )}
            </div>
          )}
        </div>
      ))}

      {slides.length > 1 && (
        <>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === current ? 'bg-white w-4' : 'bg-white/50 hover:bg-white/75'}`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );

  if (slide.ctaLink && slides.length === 1 && !slide.title && !slide.ctaText) {
    return <Link href={slide.ctaLink} className="block w-full">{inner}</Link>;
  }

  return inner;
}
