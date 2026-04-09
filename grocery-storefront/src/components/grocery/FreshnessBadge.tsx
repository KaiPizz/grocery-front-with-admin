'use client';

import { useTranslations } from 'next-intl';
import { Clock, AlertCircle, Flame } from 'lucide-react';
import type { Freshness } from '@/types';

interface FreshnessBadgeProps {
  freshness?: Freshness;
  nearestExpiry?: string;
  shelfLifeDays?: number;
  compact?: boolean;
}

export function FreshnessBadge({ freshness, nearestExpiry, compact = false }: FreshnessBadgeProps) {
  const t = useTranslations('product.freshness');

  if (!freshness) return null;

  const config: Record<Freshness, { label: string; className: string; icon: typeof Clock }> = {
    FRESH: { label: t('fresh'), className: 'freshness-fresh', icon: Clock },
    EXPIRING_SOON: { label: t('expiringSoon'), className: 'freshness-expiring', icon: AlertCircle },
    LAST_CHANCE: { label: t('lastChance'), className: 'freshness-last-chance', icon: Flame },
  };

  const { label, className, icon: Icon } = config[freshness];

  const daysLeft = nearestExpiry
    ? Math.ceil((new Date(nearestExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const ariaLabel = daysLeft !== null && daysLeft > 0
    ? `${label}, ${daysLeft} days left`
    : label;

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${className}`}
        role="status"
        aria-label={ariaLabel}
      >
        <Icon className="w-3 h-3" aria-hidden="true" />
        {label}
      </span>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${className}`}
      role="status"
      aria-label={ariaLabel}
    >
      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
      <span>{label}</span>
      {daysLeft !== null && daysLeft > 0 && (
        <span className="opacity-75">
          &middot; {daysLeft}d
        </span>
      )}
    </div>
  );
}
