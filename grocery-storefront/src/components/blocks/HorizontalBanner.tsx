'use client';

/* eslint-disable @next/next/no-img-element -- Runtime-configured admin media can use arbitrary URLs until the production media loader policy is defined. */

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getImageSrc } from '@/lib/utils';
import type { HorizontalBannerBlock } from '@/types/storefront-config';

interface HorizontalBannerProps {
  block: HorizontalBannerBlock;
}

export function HorizontalBanner({ block }: HorizontalBannerProps) {
  const content = (
    <div
      className="group relative w-full overflow-hidden rounded-[24px] border shadow-[0_20px_46px_-36px_rgba(15,35,23,0.45)] aspect-[1.95/1] md:aspect-[4.2/1]"
      style={{ borderColor: 'color-mix(in srgb, var(--color-primary) 16%, var(--color-border))' }}
    >
      {block.imageUrl || block.mobileImageUrl ? (
        <>
          {block.mobileImageUrl && (
            <img
              src={getImageSrc(block.mobileImageUrl, { maxWidth: 768 }) || block.mobileImageUrl}
              alt={block.title || 'Banner'}
              className="w-full h-full object-cover block transition-transform duration-normal group-hover:scale-[1.02] md:hidden"
              loading="lazy"
            />
          )}
          <img
            src={getImageSrc(block.imageUrl || block.mobileImageUrl, { maxWidth: 1440 }) || block.imageUrl || block.mobileImageUrl || ''}
            alt={block.title || 'Banner'}
            className={`w-full h-full object-cover transition-transform duration-normal group-hover:scale-[1.02] ${block.mobileImageUrl ? 'hidden md:block' : 'block'}`}
            loading="lazy"
          />
        </>
      ) : (
        <div className="w-full h-full bg-gradient-to-r from-gray-200 to-gray-300 flex items-center justify-center text-gray-400 text-sm">
          No image
        </div>
      )}

      {(block.title || block.ctaText) && (
        <div className="absolute inset-0 flex flex-col items-start justify-end px-5 py-5 md:justify-center md:px-8 md:py-8"
          style={{ background: 'linear-gradient(90deg, rgba(15, 23, 18, 0.72) 0%, rgba(15, 23, 18, 0.42) 42%, rgba(15, 23, 18, 0.1) 100%)' }}
        >
          {block.title && (
            <p className="max-w-[18rem] text-balance font-display text-xl font-semibold leading-tight text-white drop-shadow-md md:max-w-[28rem] md:text-3xl">
              {block.title}
            </p>
          )}
          {block.ctaText && block.ctaLink && (
            <span className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-gray-950 shadow transition-colors group-hover:bg-gray-100 md:mt-4 md:px-5">
              {block.ctaText}
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (block.ctaLink) {
    return <Link href={block.ctaLink} className="block w-full">{content}</Link>;
  }

  return content;
}
