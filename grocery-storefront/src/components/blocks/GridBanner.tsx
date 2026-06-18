'use client';

/* eslint-disable @next/next/no-img-element -- Runtime-configured admin media can use arbitrary URLs until the production media loader policy is defined. */

import Link from 'next/link';
import type { GridBannerBlock } from '@/types/storefront-config';

interface GridBannerProps {
  block: GridBannerBlock;
}

export function GridBanner({ block }: GridBannerProps) {
  const items = block.items.filter((i) => i.enabled);
  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-3 md:gap-8">
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className="group flex flex-col items-center gap-2"
        >
          <div className="relative w-full overflow-hidden rounded-lg md:rounded-xl border border-gray-100 bg-white aspect-square">
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.title || 'Category'}
                className="h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-105 md:p-3"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200" />
            )}
          </div>
          {item.title && (
            <span className="text-xs md:text-sm font-medium text-gray-700 text-center group-hover:text-indigo-600 transition-colors">
              {item.title}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
