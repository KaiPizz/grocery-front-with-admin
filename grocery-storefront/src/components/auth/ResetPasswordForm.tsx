'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, CheckCircle2, Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import { useAuthStore } from '@/stores/auth-store';

export function ResetPasswordForm() {
  const t = useTranslations('auth');
  const [token, setToken] = useState('');
  const [tokenReady, setTokenReady] = useState(false);
  const tokenCaptured = useRef(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tokenCaptured.current) return;
    tokenCaptured.current = true;
    const url = new URL(window.location.href);
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
    const fragmentToken = hashParams.get('token')?.trim() ?? '';
    const legacyQueryToken = url.searchParams.get('token')?.trim() ?? '';
    setToken(fragmentToken || legacyQueryToken);
    url.searchParams.delete('token');
    url.hash = '';
    const sanitizedUrl = `${url.pathname}${url.search}`;
    window.history.replaceState(window.history.state, '', sanitizedUrl);
    setTokenReady(true);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError(t('resetPasswordInvalidLink'));
      return;
    }
    if (newPassword.length < 8) {
      setError(t('passwordMin'));
      return;
    }
    if (newPassword.length > 72) {
      setError(t('passwordMax'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('passwordMismatch'));
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({ token, newPassword }),
      });

      if (!response.ok) {
        setError(t('resetPasswordFailed'));
        return;
      }

      useAuthStore.getState().clearSession();
      setToken('');
      setNewPassword('');
      setConfirmPassword('');
      setComplete(true);
    } catch {
      setError(t('resetPasswordFailed'));
    } finally {
      setSubmitting(false);
    }
  }

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
            {t('resetPasswordEyebrow')}
          </p>
          <h1 className="heading-display text-2xl md:text-3xl" style={{ color: 'var(--color-foreground)' }}>
            {t('resetPasswordTitle')}
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            {t('resetPasswordSubtitle')}
          </p>

          {complete ? (
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
                <span>{t('resetPasswordSuccess')}</span>
              </div>
              <Link
                href="/login"
                className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {t('backToLogin')}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              {tokenReady && !token && (
                <p className="rounded-xl border p-3 text-sm" style={{ color: 'var(--color-destructive)', borderColor: 'var(--color-border)' }} role="alert">
                  {t('resetPasswordInvalidLink')}
                </p>
              )}

              <PasswordField
                id="reset-new-password"
                label={t('newPassword')}
                value={newPassword}
                onChange={setNewPassword}
              />
              <PasswordField
                id="reset-confirm-password"
                label={t('confirmPassword')}
                value={confirmPassword}
                onChange={setConfirmPassword}
              />

              <p className="text-xs" style={{ color: error ? 'var(--color-destructive)' : 'var(--color-muted-foreground)' }} role={error ? 'alert' : undefined}>
                {error ?? t('passwordHint')}
              </p>

              <button
                type="submit"
                disabled={submitting || !tokenReady || !token}
                className="checkout-btn flex h-12 w-full items-center justify-center gap-2 rounded-2xl font-semibold text-white transition-all duration-fast active:scale-[0.98] disabled:opacity-60"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <span>{submitting ? t('submitting') : t('resetPasswordButton')}</span>
                {!submitting && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block" htmlFor={id}>
      <span className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
        {label}
      </span>
      <div
        className="flex h-12 items-center gap-3 rounded-2xl border px-4"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)' }}
      >
        <Lock className="h-4 w-4 shrink-0" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
        <input
          id={id}
          name={id}
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={72}
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full bg-transparent text-sm outline-none"
          style={{ color: 'var(--color-foreground)' }}
        />
      </div>
    </label>
  );
}
