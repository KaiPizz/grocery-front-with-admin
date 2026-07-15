'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, LoaderCircle, ShieldAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';

type VerificationState = 'verifying' | 'success' | 'invalid' | 'failed';

export function VerifyEmailPanel() {
  const t = useTranslations('auth');
  const started = useRef(false);
  const [state, setState] = useState<VerificationState>('verifying');
  const [requiresPasswordReset, setRequiresPasswordReset] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const verify = async () => {
      const url = new URL(window.location.href);
      const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
      const token = hashParams.get('token')?.trim()
        || url.searchParams.get('token')?.trim()
        || '';
      url.searchParams.delete('token');
      url.hash = '';
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}`);

      if (!token) {
        setState('invalid');
        return;
      }

      try {
        const response = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          cache: 'no-store',
          body: JSON.stringify({ token }),
        });
        const payload = await response.json().catch(() => null) as {
          requiresPasswordReset?: boolean;
        } | null;
        if (response.ok) {
          setRequiresPasswordReset(payload?.requiresPasswordReset === true);
          setState('success');
        } else {
          setState('failed');
        }
      } catch {
        setState('failed');
      }
    };

    void verify();
  }, []);

  const successful = state === 'success';
  const pending = state === 'verifying';
  const message = pending
    ? t('verifyEmailPending')
    : successful
      ? requiresPasswordReset
        ? t('verifyEmailSuccessReset')
        : t('verifyEmailSuccess')
      : state === 'invalid'
        ? t('verifyEmailInvalid')
        : t('verifyEmailFailed');

  return (
    <div className="container-grocery py-10 md:py-16">
      <div className="mx-auto max-w-md rounded-[28px] border p-6 shadow-sm md:p-8" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: 'var(--color-primary)' }}>
          {t('verifyEmailEyebrow')}
        </p>
        <h1 className="heading-display text-2xl md:text-3xl" style={{ color: 'var(--color-foreground)' }}>
          {t('verifyEmailTitle')}
        </h1>
        <div className="mt-6 flex items-start gap-3 rounded-2xl border p-4 text-sm" role="status" aria-live="polite" style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}>
          {pending ? (
            <LoaderCircle className="mt-0.5 h-5 w-5 shrink-0 animate-spin" aria-hidden="true" />
          ) : successful ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
          ) : (
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" style={{ color: 'var(--color-destructive)' }} aria-hidden="true" />
          )}
          <span>{message}</span>
        </div>
        {!pending && (
          <Link href={successful && requiresPasswordReset ? '/forgot-password' : '/login'} className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white" style={{ backgroundColor: 'var(--color-primary)' }}>
            {successful && requiresPasswordReset ? t('setPasswordSecurely') : t('backToLogin')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </div>
    </div>
  );
}
