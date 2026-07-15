'use client';

import { useState, type FormEvent } from 'react';
import { AlertCircle, Loader2, Lock, Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Link, useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/stores/auth-store';

export function SecurityPanel() {
  const tAccount = useTranslations('account');
  const router = useRouter();
  const clearSession = useAuthStore((state) => state.clearSession);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
    >
      <div className="mb-6 flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
          style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)' }}
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
          className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all duration-fast active:scale-[0.98] disabled:opacity-60"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {saving ? tAccount('changingPassword') : tAccount('changePassword')}
        </button>
      </form>

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
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)' }}
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
