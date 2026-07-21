'use client';

/* eslint-disable @next/next/no-img-element -- Runtime-configured admin media can use arbitrary URLs until the production media loader policy is defined. */

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { getLocaleNeutralConfiguredHref } from '@/lib/configured-content-localization';
import { getImageSrc } from '@/lib/utils';
import type { SmallStickyBannerBlock } from '@/types/storefront-config';

interface SmallStickyBannerProps {
  block: SmallStickyBannerBlock;
}

export function SmallStickyBanner({ block }: SmallStickyBannerProps) {
  const storageKey = `sticky-dismissed-${block.id}`;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (block.dismissible) {
      const dismissed = localStorage.getItem(storageKey);
      if (!dismissed) setVisible(true);
    } else {
      setVisible(true);
    }
  }, [block.dismissible, storageKey]);

  function dismiss() {
    setVisible(false);
    if (block.dismissible) localStorage.setItem(storageKey, '1');
  }

  if (!visible) return null;

  const posClass = block.position === 'top' ? 'top-0' : 'bottom-0';

  const imageEl = (
    <>
      {block.desktopImageUrl && (
        <img
          src={getImageSrc(block.desktopImageUrl, { maxWidth: 1440 }) || block.desktopImageUrl}
          alt={block.title || 'Announcement'}
          className="hidden md:block h-full w-auto object-contain mx-auto"
        />
      )}
      {block.mobileImageUrl && (
        <img
          src={getImageSrc(block.mobileImageUrl, { maxWidth: 768 }) || block.mobileImageUrl}
          alt={block.title || 'Announcement'}
          className="block md:hidden h-full w-auto object-contain mx-auto"
        />
      )}
      {!block.desktopImageUrl && !block.mobileImageUrl && block.title && (
        <p className="text-sm font-medium text-gray-800">{block.title}</p>
      )}
    </>
  );

  const inner = (
    <div className={`fixed ${posClass} inset-x-0 z-50 flex items-center justify-center bg-white border-y border-gray-200 shadow-sm`}
      style={{ height: block.mobileImageUrl ? 'clamp(50px, 8vw, 90px)' : undefined }}
    >
      <div className="relative flex-1 flex items-center justify-center h-full px-8">
        {imageEl}
      </div>
      {block.ctaText && block.ctaLink && (
        <Link
          href={getLocaleNeutralConfiguredHref(block.ctaLink, block.id)}
          className="hidden md:inline-flex items-center mr-6 rounded-full bg-indigo-600 text-white px-4 py-1.5 text-xs font-semibold hover:bg-indigo-700 transition-colors shrink-0"
        >
          {block.ctaText}
        </Link>
      )}
      {block.dismissible && (
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );

  if (block.ctaLink && !block.ctaText) {
    return <Link href={getLocaleNeutralConfiguredHref(block.ctaLink, block.id)} className="contents">{inner}</Link>;
  }

  return inner;
}
