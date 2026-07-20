'use client';

import { useState, type CSSProperties, type FormEvent } from 'react';
import { AlertCircle, AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/stores/auth-store';
import type { CustomerProfile } from '@/types';

interface DeleteAccountPanelProps {
  profile: CustomerProfile | null;
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function DeleteAccountPanel({ profile }: DeleteAccountPanelProps) {
  const tAccount = useTranslations('account');
  const locale = useLocale();
  const router = useRouter();
  const clearSession = useAuthStore((state) => state.clearSession);
  const [confirming, setConfirming] = useState(false);
  const [emailConfirmation, setEmailConfirmation] = useState('');
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete = profile?.hasPassword === true && Boolean(profile.email);

  function closeConfirmation() {
    if (deleting) return;
    setConfirming(false);
    setEmailConfirmation('');
    setPassword('');
    setError(null);
  }

  async function handleDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!profile?.email || normalizeEmail(emailConfirmation) !== normalizeEmail(profile.email)) {
      setError(tAccount('deleteAccountEmailMismatch'));
      return;
    }
    if (!password) {
      setError(tAccount('deleteAccountPasswordRequired'));
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
        // Email is an in-browser anti-accident check only; the BFF receives the minimum secret input.
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        setPassword('');
        if (response.status === 401) {
          clearSession();
          router.replace('/login?returnTo=%2Faccount%23security');
          return;
        }
        const errorMessageKey = response.status === 409 || response.status === 429
          ? 'deleteAccountRetryLater'
          : response.status >= 500
            ? 'deleteAccountTemporarilyUnavailable'
            : 'deleteAccountFailed';
        setError(tAccount(errorMessageKey));
        return;
      }

      setPassword('');
      setEmailConfirmation('');
      clearSession();
      toast.success(tAccount('deleteAccountSuccess'));
      // Leave the guarded account route synchronously so its signed-out redirect
      // cannot win the race and send a successfully deleted customer to login.
      window.location.replace(locale === 'pl' ? '/' : `/${locale}`);
    } catch {
      setPassword('');
      setError(tAccount('deleteAccountFailed'));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section
      className="mt-8 rounded-2xl border p-4 md:p-5"
      style={{
        borderColor: 'color-mix(in srgb, var(--color-destructive) 38%, var(--color-border))',
        backgroundColor: 'color-mix(in srgb, var(--color-destructive) 5%, var(--color-card))',
      }}
      aria-labelledby="delete-account-title"
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-destructive) 12%, transparent)',
            color: 'var(--color-destructive)',
          }}
        >
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 id="delete-account-title" className="font-semibold" style={{ color: 'var(--color-foreground)' }}>
            {tAccount('deleteAccountTitle')}
          </h3>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            {tAccount('deleteAccountDescription')}
          </p>
          <p className="mt-3 text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
            {tAccount('deleteAccountRetentionNotice')}
          </p>
        </div>
      </div>

      {canDelete ? (
        confirming ? (
          <form
            id="delete-account-confirmation"
            method="post"
            className="mt-5 space-y-4 border-t pt-5"
            style={{ borderColor: 'var(--color-border)' }}
            onSubmit={handleDelete}
            aria-labelledby="delete-account-confirmation-title"
          >
            <div>
              <h4 id="delete-account-confirmation-title" className="font-semibold" style={{ color: 'var(--color-foreground)' }}>
                {tAccount('deleteAccountConfirmationTitle')}
              </h4>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                {tAccount('deleteAccountConfirmationDescription', { email: profile.email })}
              </p>
            </div>

            <label className="block max-w-lg" htmlFor="delete-account-email-confirmation">
              <span className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
                {tAccount('deleteAccountEmailLabel')}
              </span>
              <input
                id="delete-account-email-confirmation"
                name="delete-account-email-confirmation"
                type="email"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={254}
                required
                value={emailConfirmation}
                onChange={(event) => setEmailConfirmation(event.target.value)}
                className="h-11 w-full rounded-xl border bg-transparent px-4 text-sm outline-none focus:ring-2"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-foreground)',
                  '--tw-ring-color': 'color-mix(in srgb, var(--color-destructive) 45%, transparent)',
                } as CSSProperties}
              />
            </label>

            <label className="block max-w-lg" htmlFor="delete-account-password">
              <span className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
                {tAccount('deleteAccountPasswordLabel')}
              </span>
              <input
                id="delete-account-password"
                name="delete-account-password"
                type="password"
                autoComplete="current-password"
                maxLength={72}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 w-full rounded-xl border bg-transparent px-4 text-sm outline-none focus:ring-2"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-foreground)',
                  '--tw-ring-color': 'color-mix(in srgb, var(--color-destructive) 45%, transparent)',
                } as CSSProperties}
              />
            </label>

            {error && (
              <div
                className="flex max-w-lg items-start gap-2 rounded-xl border px-4 py-3 text-sm"
                style={{
                  borderColor: 'color-mix(in srgb, var(--color-destructive) 40%, var(--color-border))',
                  backgroundColor: 'color-mix(in srgb, var(--color-destructive) 8%, transparent)',
                  color: 'var(--color-destructive)',
                }}
                role="alert"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {error}
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <button
                type="button"
                onClick={closeConfirmation}
                disabled={deleting}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border px-5 text-sm font-semibold transition-colors disabled:opacity-60"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
              >
                {tAccount('deleteAccountCancel')}
              </button>
              <button
                type="submit"
                disabled={deleting || !emailConfirmation || !password}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white transition-all duration-fast active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                style={{ backgroundColor: 'var(--color-destructive)' }}
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                )}
                {deleting ? tAccount('deletingAccount') : tAccount('deleteAccountConfirm')}
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-5 text-sm font-semibold transition-all duration-fast active:scale-[0.98]"
            style={{
              borderColor: 'var(--color-destructive)',
              color: 'var(--color-destructive)',
              backgroundColor: 'var(--color-card)',
            }}
            aria-expanded="false"
            aria-controls="delete-account-confirmation"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            {tAccount('deleteAccountAction')}
          </button>
        )
      ) : (
        <p
          className="mt-5 rounded-xl border px-4 py-3 text-sm"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted-foreground)' }}
        >
          {profile?.hasPassword === false
            ? tAccount('deleteAccountSocialOnly')
            : tAccount('deleteAccountUnavailable')}
        </p>
      )}
    </section>
  );
}
