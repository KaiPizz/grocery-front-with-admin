'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Truck } from 'lucide-react';
import {
  DEFAULT_SAME_DAY_SHIPPING_CUTOFF,
  formatShippingCountdown,
  getShippingCutoffState,
  parseShippingCutoff,
} from '@/lib/shipping-cutoff';

interface ShippingCountdownProps {
  cutoff: string | null | undefined;
}

interface LiveCountdownState {
  phase: 'before' | 'after';
  cutoffLabel: string;
  remainingLabel: string | null;
}

function getLiveCountdownState(cutoff: string | null | undefined): LiveCountdownState {
  const state = getShippingCutoffState(new Date(), cutoff);

  return {
    phase: state.phase,
    cutoffLabel: state.cutoff.label,
    remainingLabel: state.phase === 'before' ? formatShippingCountdown(state.remainingMs) : null,
  };
}

export function ShippingCountdown({ cutoff }: ShippingCountdownProps) {
  const t = useTranslations('shippingCountdown');
  const cutoffValue = cutoff ?? DEFAULT_SAME_DAY_SHIPPING_CUTOFF;
  const staticCutoff = useMemo(() => parseShippingCutoff(cutoffValue), [cutoffValue]);
  const [liveState, setLiveState] = useState<LiveCountdownState | null>(null);

  useEffect(() => {
    function updateCountdown() {
      setLiveState(getLiveCountdownState(cutoffValue));
    }

    updateCountdown();

    // B8 needs second-level countdown precision; setInterval is cheaper than
    // a frame loop and matches the visible HH:MM:SS cadence.
    const intervalId = setInterval(updateCountdown, 1000);

    return () => clearInterval(intervalId);
  }, [cutoffValue]);

  const label = (() => {
    if (!liveState) {
      return t('static', { time: staticCutoff.label });
    }

    if (liveState.phase === 'before' && liveState.remainingLabel) {
      return t('countdown', { time: liveState.remainingLabel });
    }

    return t('tomorrow', { time: liveState.cutoffLabel });
  })();

  return (
    <div
      className="border-b text-xs font-medium sm:text-sm"
      style={{
        minHeight: 'var(--shipping-countdown-height)',
        borderColor: 'var(--color-border)',
        backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, var(--color-background))',
        color: 'var(--color-foreground)',
      }}
    >
      <div
        className="container-grocery flex items-center justify-center gap-2 py-1 text-center"
        style={{ minHeight: 'var(--shipping-countdown-height)' }}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <Truck className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
        <span>{label}</span>
      </div>
    </div>
  );
}
