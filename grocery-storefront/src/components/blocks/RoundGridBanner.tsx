'use client';

import Link from 'next/link';
import type { RoundGridBannerBlock } from '@/types/storefront-config';

interface RoundGridBannerProps {
  block: RoundGridBannerBlock;
}

export function RoundGridBanner({ block }: RoundGridBannerProps) {
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
          <div className="relative w-full overflow-hidden rounded-full border border-gray-100 bg-gray-50 aspect-square">
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.title || 'Category'}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
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
