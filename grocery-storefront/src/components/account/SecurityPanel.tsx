'use client';

import { useState, type FormEvent } from 'react';
import { AlertCircle, CheckCircle2, KeyRound, Loader2, Lock, Shield } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Link, useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/stores/auth-store';
import type { CustomerLoginProvider } from '@/types';
import { DeleteAccountPanel } from './DeleteAccountPanel';

const LOGIN_PROVIDERS: CustomerLoginProvider[] = ['password', 'google', 'facebook'];

function isLoginProvider(value: string): value is CustomerLoginProvider {
  return LOGIN_PROVIDERS.includes(value as CustomerLoginProvider);
}

export function SecurityPanel() {
  const tAccount = useTranslations('account');
  const locale = useLocale() === 'en' ? 'en' : 'pl';
  const router = useRouter();
  const profile = useAuthStore((state) => state.session.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestingPasswordSetup, setRequestingPasswordSetup] = useState(false);
  const [passwordSetupSent, setPasswordSetupSent] = useState(false);
  const [passwordSetupError, setPasswordSetupError] = useState<string | null>(null);
  const hasCapabilityMetadata = typeof profile?.hasPassword === 'boolean' || Array.isArray(profile?.linkedProviders);
  const hasPassword = profile?.hasPassword !== false;
  const linkedProviders = Array.from(new Set((profile?.linkedProviders ?? []).filter(isLoginProvider)));
  if (profile?.hasPassword === true && !linkedProviders.includes('password')) {
    linkedProviders.unshift('password');
  }

  function providerLabel(provider: CustomerLoginProvider): string {
    if (provider === 'google') return tAccount('loginMethodGoogle');
    if (provider === 'facebook') return tAccount('loginMethodFacebook');
    return tAccount('loginMethodPassword');
  }

  async function requestPasswordSetup() {
    if (requestingPasswordSetup || profile?.emailVerified !== true || !profile.email) return;

    setRequestingPasswordSetup(true);
    setPasswordSetupError(null);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({ email: profile.email, locale }),
      });

      if (!response.ok) {
        setPasswordSetupError(tAccount('setPasswordFailed'));
        return;
      }
      setPasswordSetupSent(true);
    } catch {
      setPasswordSetupError(tAccount('setPasswordFailed'));
    } finally {
      setRequestingPasswordSetup(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!currentPassword) {
      setError(tAccount('currentPasswordRequired'));
      return;
    }
    if (newPassword.length < 8) {
      setError(tAccount('newPasswordMin'));
      return;
    }
    if (newPassword.length > 72) {
      setError(tAccount('newPasswordMax'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(tAccount('newPasswordMismatch'));
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!response.ok) {
        setCurrentPassword('');
        if (response.status === 401) {
          clearSession();
          router.replace('/login?returnTo=%2Faccount%23security');
          return;
        }
        setError(tAccount('passwordChangeFailed'));
        return;
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      clearSession();
      toast.success(tAccount('passwordChanged'));
      router.replace('/login?returnTo=%2Faccount%23security');
    } catch {
      setError(tAccount('passwordChangeFailed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className="rounded-2xl border p-5 md:p-6"
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-card)',
      }}
    >
      <div className="mb-6 flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
          }}
        >
          <Shield className="h-5 w-5" style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-foreground)' }}>
            {tAccount('securityTitle')}
          </h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            {tAccount('securityDescription')}
          </p>
        </div>
      </div>

      {hasCapabilityMetadata && linkedProviders.length > 0 && (
        <div className="mb-6 max-w-lg">
          <p className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
            {tAccount('signInMethodsTitle')}
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            {tAccount('signInMethodsDescription')}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {linkedProviders.map((provider) => (
              <span
                key={provider}
                className="inline-flex min-h-9 items-center rounded-full border px-3 text-sm font-medium"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-foreground)',
                }}
              >
                {providerLabel(provider)}
              </span>
            ))}
          </div>
        </div>
      )}

      {hasPassword ? (
        <form className="max-w-lg space-y-4" onSubmit={handleSubmit}>
          <PasswordField
            id="security-current-password"
            label={tAccount('currentPassword')}
            autoComplete="current-password"
            value={currentPassword}
            onChange={setCurrentPassword}
          />
          <PasswordField
            id="security-new-password"
            label={tAccount('newPassword')}
            autoComplete="new-password"
            value={newPassword}
            onChange={setNewPassword}
          />
          <PasswordField
            id="security-confirm-password"
            label={tAccount('confirmNewPassword')}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={setConfirmPassword}
          />

          <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
            {tAccount('passwordChangeHint')}
          </p>

          {error && (
            <div
              className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm"
              style={{
                borderColor: 'color-mix(in srgb, var(--color-destructive) 40%, var(--color-border))',
                backgroundColor: 'color-mix(in srgb, var(--color-destructive) 8%, transparent)',
                color: 'var(--color-destructive)',
              }}
              role="alert"
            >
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all duration-fast active:scale-[0.98] disabled:opacity-60"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {saving ? tAccount('changingPassword') : tAccount('changePassword')}
          </button>
        </form>
      ) : (
        <div
          className="max-w-lg rounded-2xl border p-4 md:p-5"
          style={{
            borderColor: 'color-mix(in srgb, var(--color-primary) 30%, var(--color-border))',
            backgroundColor: 'color-mix(in srgb, var(--color-primary) 7%, var(--color-card))',
          }}
        >
          <div className="flex items-start gap-3">
            <KeyRound className="mt-0.5 h-5 w-5 shrink-0" style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
            <div>
              <h3 className="font-semibold" style={{ color: 'var(--color-foreground)' }}>
                {tAccount('setPasswordTitle')}
              </h3>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                {profile?.emailVerified === true ? tAccount('setPasswordDescription') : tAccount('setPasswordVerifyFirst')}
              </p>
              {passwordSetupSent ? (
                <p
                  className="mt-4 flex items-start gap-2 text-sm font-medium"
                  style={{ color: 'var(--color-primary)' }}
                  role="status"
                  aria-live="polite"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  {tAccount('setPasswordSent')}
                </p>
              ) : profile?.emailVerified === true ? (
                <button
                  type="button"
                  onClick={requestPasswordSetup}
                  disabled={requestingPasswordSetup}
                  className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white transition-all duration-fast active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {requestingPasswordSetup && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  {requestingPasswordSetup ? tAccount('setPasswordSending') : tAccount('setPasswordAction')}
                </button>
              ) : null}
              {passwordSetupError && (
                <p className="mt-3 flex items-start gap-2 text-sm font-medium" style={{ color: 'var(--color-destructive)' }} role="alert">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  {passwordSetupError}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <DeleteAccountPanel profile={profile} />

      <div className="mt-6 max-w-lg border-t pt-5" style={{ borderColor: 'var(--color-border)' }}>
        <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          {tAccount('dataDeletionHelp')}
        </p>
        <Link
          href="/privacy#data-deletion"
          className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4"
          style={{ color: 'var(--color-primary)' }}
        >
          {tAccount('dataDeletionLink')}
        </Link>
      </div>
    </section>
  );
}

function PasswordField({
  id,
  label,
  autoComplete,
  value,
  onChange,
}: {
  id: string;
  label: string;
  autoComplete: 'current-password' | 'new-password';
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block" htmlFor={id}>
      <span className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
        {label}
      </span>
      <div
        className="flex h-11 items-center gap-3 rounded-xl border px-4"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-background)',
        }}
      >
        <Lock className="h-4 w-4 shrink-0" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
        <input
          id={id}
          name={id}
          type="password"
          autoComplete={autoComplete}
          minLength={autoComplete === 'new-password' ? 8 : undefined}
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
