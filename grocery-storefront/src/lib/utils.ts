import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number, currency = 'PLN', locale = 'pl-PL'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

interface NormalizeImageUrlOptions {
  maxWidth?: number;
}

function normalizeWikimediaThumbnailUrl(parsed: URL, maxWidth: number) {
  if (!parsed.hostname.endsWith('wikimedia.org')) {
    return;
  }

  const pathParts = parsed.pathname.split('/');
  const filePartIndex = pathParts.findIndex((part) => /^\d+px-/i.test(part));
  if (filePartIndex === -1) {
    return;
  }

  const currentWidthMatch = pathParts[filePartIndex].match(/^(\d+)px-(.+)$/i);
  if (!currentWidthMatch) {
    return;
  }

  const currentWidth = Number(currentWidthMatch[1]);
  if (!Number.isFinite(currentWidth) || currentWidth <= maxWidth) {
    return;
  }

  pathParts[filePartIndex] = `${maxWidth}px-${currentWidthMatch[2]}`;
  parsed.pathname = pathParts.join('/');
}

export function normalizeImageUrl(url?: string | null, options: NormalizeImageUrlOptions = {}): string | null {
  if (!url) return null;

  const trimmed = url.trim();
  if (!trimmed) return null;

  const normalized = trimmed.startsWith('//') ? `https:${trimmed}` : trimmed;

  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    try {
      const parsed = new URL(normalized);
      parsed.pathname = parsed.pathname.replace(/\/{2,}/g, '/');

      // The current CDN responses 404 for these assets, but the same IDs resolve on Unsplash.
      if (parsed.hostname === 'img.zira.pl' && parsed.pathname.startsWith('/photo-')) {
        parsed.hostname = 'images.unsplash.com';
      }

      if (parsed.hostname === 'images.unsplash.com') {
        const fit = parsed.searchParams.get('fit');
        if (fit?.endsWith('.webp')) {
          parsed.searchParams.set('fit', fit.replace('.webp', ''));
        }
        if (!parsed.searchParams.has('auto')) {
          parsed.searchParams.set('auto', 'format');
        }
      }

      normalizeWikimediaThumbnailUrl(parsed, options.maxWidth ?? 1200);

      return parsed.toString();
    } catch {
      return normalized;
    }
  }

  if (normalized.startsWith('/')) {
    return normalized.replace(/\/{2,}/g, '/');
  }

  return normalized;
}

export function getImageSrc(url?: string | null, options: NormalizeImageUrlOptions = {}): string | null {
  const normalized = normalizeImageUrl(url, options);
  if (!normalized) return null;

  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return `/api/image?url=${encodeURIComponent(normalized)}`;
  }

  return normalized;
}

export function isImageProxySrc(url?: string | null): boolean {
  return Boolean(url?.startsWith('/api/image?url='));
}
