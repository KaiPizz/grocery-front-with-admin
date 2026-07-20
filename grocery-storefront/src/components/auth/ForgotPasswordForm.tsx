'use client';

import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Mail } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';

import { Link } from '@/i18n/navigation';
import { safeReturnPath } from '@/lib/auth/safe-return-path';

export function ForgotPasswordForm() {
  const locale = useLocale() === 'en' ? 'en' : 'pl';
  const t = useTranslations('auth');
  const searchParams = useSearchParams();
  const returnTo = safeReturnPath(searchParams.get('returnTo'));
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedEmail = email.trim();
    setError(null);

    if (!trimmedEmail) {
      setError(t('emailRequired'));
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({ email: trimmedEmail, locale }),
      });

      if (!response.ok) {
        setError(t('forgotPasswordFailed'));
        return;
      }

      // Always show the same copy so the UI cannot disclose whether an account exists.
      setSent(true);
    } catch {
      setError(t('forgotPasswordFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  const loginHref = `/login?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <div className="container-grocery py-10 md:py-16">
      <div className="mx-auto max-w-md">
        <div
          className="rounded-[28px] border p-6 shadow-sm md:p-8"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
        >
          <p
            className="mb-2 text-xs font-semibold uppercase tracking-[0.24em]"
            style={{ color: 'var(--color-primary)' }}
          >
            {t('forgotPasswordEyebrow')}
          </p>
          <h1 className="heading-display text-2xl md:text-3xl" style={{ color: 'var(--color-foreground)' }}>
            {t('forgotPasswordTitle')}
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            {t('forgotPasswordSubtitle')}
          </p>

          {sent ? (
            <div className="mt-6" role="status" aria-live="polite">
              <div
                className="flex items-start gap-3 rounded-2xl border p-4 text-sm"
                style={{
                  borderColor: 'color-mix(in srgb, var(--color-primary) 35%, var(--color-border))',
                  backgroundColor: 'color-mix(in srgb, var(--color-primary) 8%, transparent)',
                  color: 'var(--color-foreground)',
                }}
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
                <span>{t('forgotPasswordSent')}</span>
              </div>
              <button
                type="button"
                className="mt-4 text-sm font-semibold hover:opacity-80"
                style={{ color: 'var(--color-primary)' }}
                onClick={() => setSent(false)}
              >
                {t('forgotPasswordSendAgain')}
              </button>
            </div>
          ) : (
            <form method="post" className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <label className="block" htmlFor="forgot-password-email">
                <span className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
                  {t('email')}
                </span>
                <div
                  className="flex h-12 items-center gap-3 rounded-2xl border px-4"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)' }}
                >
                  <Mail className="h-4 w-4 shrink-0" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
                  <input
                    id="forgot-password-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full bg-transparent text-sm outline-none"
                    style={{ color: 'var(--color-foreground)' }}
                    placeholder={t('emailPlaceholder')}
                  />
                </div>
              </label>

              {error && (
                <p className="text-sm" style={{ color: 'var(--color-destructive)' }} role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="checkout-btn flex h-12 w-full items-center justify-center gap-2 rounded-2xl font-semibold text-white transition-all duration-fast active:scale-[0.98] disabled:opacity-60"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <span>{submitting ? t('submitting') : t('forgotPasswordButton')}</span>
                {!submitting && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
              </button>
            </form>
          )}

          <Link
            href={loginHref}
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold hover:opacity-80"
            style={{ color: 'var(--color-primary)' }}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t('backToLogin')}
          </Link>
        </div>
      </div>
    </div>
  );
}
