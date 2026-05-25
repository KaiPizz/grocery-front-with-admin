'use client';

/* eslint-disable @next/next/no-img-element -- Runtime-configured admin media can use arbitrary URLs until the production media loader policy is defined. */

import Link from 'next/link';
import type { SidebarBannerBlock } from '@/types/storefront-config';

interface SidebarBannerProps {
  block: SidebarBannerBlock;
}

export function SidebarBanner({ block }: SidebarBannerProps) {
  const content = (
    <div className="relative w-full overflow-hidden rounded-xl" style={{ aspectRatio: '1 / 2' }}>
      {block.imageUrl ? (
        <img
          src={block.imageUrl}
          alt={block.title || 'Sidebar banner'}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-b from-gray-200 to-gray-300" />
      )}

      {(block.title || block.ctaText) && (
        <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/60 to-transparent flex flex-col items-start gap-2">
          {block.title && (
            <p className="text-white text-sm font-semibold drop-shadow">{block.title}</p>
          )}
          {block.ctaText && (
            <span className="inline-flex items-center rounded-full bg-white text-gray-900 px-3 py-1.5 text-xs font-semibold hover:bg-gray-100 transition-colors shadow">
              {block.ctaText}
            </span>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="hidden md:block">
      {block.ctaLink ? (
        <Link href={block.ctaLink} className="block">{content}</Link>
      ) : (
        content
      )}
    </div>
  );
}
