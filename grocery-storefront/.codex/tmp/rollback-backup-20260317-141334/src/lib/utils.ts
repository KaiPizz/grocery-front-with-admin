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

export function formatWeight(grams: number): string {
  if (grams >= 1000) return `${(grams / 1000).toFixed(1)} kg`;
  return `${grams} g`;
}

export function extractMoney(
  value?:
    | { amount: number; currency: string }
    | { gross?: { amount: number; currency: string } | null }
    | null
): { amount: number; currency: string } | null {
  if (!value) return null;

  if ('amount' in value && typeof value.amount === 'number') {
    return { amount: value.amount, currency: value.currency };
  }

  if ('gross' in value && value.gross) {
    return extractMoney(value.gross);
  }

  return null;
}

export function normalizeImageUrl(url?: string | null): string | null {
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

export function getImageSrc(url?: string | null): string | null {
  const normalized = normalizeImageUrl(url);
  if (!normalized) return null;

  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return `/api/image?url=${encodeURIComponent(normalized)}`;
  }

  return normalized;
}

export function isImageProxySrc(url?: string | null): boolean {
  return Boolean(url?.startsWith('/api/image?url='));
}

export function getStorageZoneColor(zone?: string): string {
  switch (zone) {
    case 'FROZEN': return 'var(--color-frozen)';
    case 'CHILLED': return 'var(--color-chilled)';
    case 'AMBIENT': return 'var(--color-ambient)';
    default: return 'var(--color-muted-foreground)';
  }
}

export function getStorageZoneIcon(zone?: string): string {
  switch (zone) {
    case 'FROZEN': return '\u2744\ufe0f';
    case 'CHILLED': return '\u2603\ufe0f';
    case 'AMBIENT': return '\ud83c\udf3e';
    default: return '\ud83d\udce6';
  }
}
