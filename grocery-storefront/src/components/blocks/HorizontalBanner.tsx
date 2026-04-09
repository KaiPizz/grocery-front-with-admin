'use client';

import Link from 'next/link';
import type { HorizontalBannerBlock } from '@/types/storefront-config';

interface HorizontalBannerProps {
  block: HorizontalBannerBlock;
}

export function HorizontalBanner({ block }: HorizontalBannerProps) {
  const content = (
    <div className="relative w-full overflow-hidden rounded-xl aspect-[3.2/1] md:aspect-[4/1]">
      {block.imageUrl || block.mobileImageUrl ? (
        <>
          {block.mobileImageUrl && (
            <img
              src={block.mobileImageUrl}
              alt={block.title || 'Banner'}
              className="w-full h-full object-cover block md:hidden"
              loading="lazy"
            />
          )}
          <img
            src={block.imageUrl || block.mobileImageUrl || ''}
            alt={block.title || 'Banner'}
            className={`w-full h-full object-cover ${block.mobileImageUrl ? 'hidden md:block' : 'block'}`}
            loading="lazy"
          />
        </>
      ) : (
        <div className="w-full h-full bg-gradient-to-r from-gray-200 to-gray-300 flex items-center justify-center text-gray-400 text-sm">
          No image
        </div>
      )}

      {(block.title || block.ctaText) && (
        <div className="absolute inset-0 flex flex-col items-start justify-center px-8 bg-gradient-to-r from-black/40 to-transparent">
          {block.title && (
            <p className="text-white text-lg md:text-2xl font-bold drop-shadow-md mb-2">{block.title}</p>
          )}
          {block.ctaText && block.ctaLink && (
            <span className="inline-flex items-center rounded-full bg-white text-gray-900 px-4 py-2 text-sm font-semibold hover:bg-gray-100 transition-colors shadow">
              {block.ctaText}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (block.ctaLink && !block.ctaText) {
    return <Link href={block.ctaLink} className="block w-full">{content}</Link>;
  }

  return content;
}
