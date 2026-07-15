'use client';

import { useEffect, useState } from 'react';
import { Loader2, MailWarning } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/stores/auth-store';

const RESEND_COOLDOWN_SECONDS = 60;

export function EmailVerificationBanner() {
  const tAccount = useTranslations('account');
  const activeLocale = useLocale();
  const locale: 'pl' | 'en' = activeLocale === 'en' ? 'en' : 'pl';
  const router = useRouter();
  const clearSession = useAuthStore((state) => state.clearSession);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((seconds) => Math.max(0, seconds - 1));
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function resendVerification() {
    if (sending || cooldown > 0) return;
    setSending(true);
    setStatus(null);
    setError(null);

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({ locale }),
      });

      if (response.status === 401) {
        clearSession();
        router.replace('/login?returnTo=%2Faccount');
        return;
      }
      if (response.status === 429) {
        setCooldown(RESEND_COOLDOWN_SECONDS);
        setError(tAccount('verificationRateLimited'));
        return;
      }
      if (!response.ok) {
        setError(tAccount('verificationSendFailed'));
        return;
      }

      setCooldown(RESEND_COOLDOWN_SECONDS);
      setStatus(tAccount('verificationSent'));
    } catch {
      setError(tAccount('verificationSendFailed'));
    } finally {
      setSending(false);
    }
  }

  const buttonLabel = sending
    ? tAccount('resendingVerification')
    : cooldown > 0
      ? tAccount('verificationCooldown', { seconds: cooldown })
      : tAccount('resendVerification');

  return (
    <section
      className="mt-6 rounded-2xl border p-5 md:flex md:items-center md:justify-between md:gap-6"
      style={{
        borderColor:
          'color-mix(in srgb, var(--color-accent) 55%, var(--color-border))',
        backgroundColor:
          'color-mix(in srgb, var(--color-accent) 9%, var(--color-card))',
      }}
      aria-labelledby="email-verification-title"
    >
      <div className="flex min-w-0 items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          style={{
            backgroundColor:
              'color-mix(in srgb, var(--color-accent) 18%, white)',
          }}
        >
          <MailWarning
            className="h-5 w-5"
            style={{ color: 'var(--color-foreground)' }}
            aria-hidden="true"
          />
        </div>
        <div>
          <h2
            id="email-verification-title"
            className="text-base font-semibold"
            style={{ color: 'var(--color-foreground)' }}
          >
            {tAccount('verificationPendingTitle')}
          </h2>
          <p
            className="mt-1 text-sm"
            style={{ color: 'var(--color-muted-foreground)' }}
          >
            {tAccount('verificationPendingDescription')}
          </p>
          {status && (
            <p
              className="mt-2 text-sm font-medium"
              style={{ color: 'var(--color-primary)' }}
              role="status"
              aria-live="polite"
            >
              {status}
            </p>
          )}
          {error && (
            <p
              className="mt-2 text-sm font-medium"
              style={{ color: 'var(--color-destructive)' }}
              role="alert"
            >
              {error}
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={resendVerification}
        disabled={sending || cooldown > 0}
        className="mt-4 inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-all duration-fast active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 md:mt-0 md:w-auto"
        style={{ backgroundColor: 'var(--color-primary)' }}
      >
        {sending && (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        )}
        {buttonLabel}
      </button>
    </section>
  );
}
