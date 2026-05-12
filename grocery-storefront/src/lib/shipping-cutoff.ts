export const DEFAULT_SAME_DAY_SHIPPING_CUTOFF = '12:00';

export type ShippingCutoffPhase = 'before' | 'after';

export interface ShippingCutoffTime {
  hours: number;
  minutes: number;
  label: string;
}

export interface ShippingCutoffState {
  phase: ShippingCutoffPhase;
  cutoff: ShippingCutoffTime;
  remainingMs: number;
}

function padTimeUnit(value: number) {
  return String(value).padStart(2, '0');
}

export function parseShippingCutoff(value: string | null | undefined): ShippingCutoffTime {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value ?? '');

  if (!match) {
    return { hours: 12, minutes: 0, label: DEFAULT_SAME_DAY_SHIPPING_CUTOFF };
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  return {
    hours,
    minutes,
    label: `${padTimeUnit(hours)}:${padTimeUnit(minutes)}`,
  };
}

export function getShippingCutoffDate(now: Date, cutoff: ShippingCutoffTime) {
  const cutoffDate = new Date(now);
  cutoffDate.setHours(cutoff.hours, cutoff.minutes, 0, 0);
  return cutoffDate;
}

export function getShippingCutoffState(now: Date, value: string | null | undefined): ShippingCutoffState {
  const cutoff = parseShippingCutoff(value);
  const cutoffDate = getShippingCutoffDate(now, cutoff);
  const remainingMs = cutoffDate.getTime() - now.getTime();

  if (remainingMs > 0) {
    return { phase: 'before', cutoff, remainingMs };
  }

  return { phase: 'after', cutoff, remainingMs: 0 };
}

export function isBeforeShippingCutoff(now: Date, value: string | null | undefined) {
  return getShippingCutoffState(now, value).phase === 'before';
}

export function formatShippingCountdown(remainingMs: number) {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${padTimeUnit(hours)}:${padTimeUnit(minutes)}:${padTimeUnit(seconds)}`;
}
