'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Loader2, UserRound, Check, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { UPDATE_PROFILE_MUTATION } from '@/lib/graphql/operations/grocery';
import { getGraphqlErrorMessage, graphqlRequest } from '@/lib/graphql/request';
import { setStoredCustomerProfile } from '@/lib/auth';

interface UpdateProfileResponse {
  updateProfile: {
    success: boolean;
    customer: {
      id: string;
      fullName: string;
      phone?: string | null;
    } | null;
    errors: { field: string; message: string }[] | null;
  } | null;
}

export function ProfilePanel() {
  const locale = useLocale();
  const tAccount = useTranslations('account');
  const session = useAuthStore((state) => state.session);
  const user = session.user;

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName ?? '');
      setPhone(user.phone ?? '');
    }
  }, [user]);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(false), 3000);
    return () => clearTimeout(timer);
  }, [success]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await graphqlRequest<UpdateProfileResponse>(UPDATE_PROFILE_MUTATION, {
        input: {
          fullName: fullName.trim(),
          phone: phone.trim() || undefined,
        },
      });

      const topError = getGraphqlErrorMessage(response.errors);
      const payload = response.data?.updateProfile;

      if (topError) {
        setError(tAccount('profileUpdateFailed'));
        return;
      }

      if (!payload?.success) {
        setError(tAccount('profileUpdateFailed'));
        return;
      }

      const updatedUser = {
        ...user,
        fullName: payload.customer?.fullName ?? fullName.trim(),
        phone: (payload.customer?.phone ?? phone.trim()) || null,
      };

      setStoredCustomerProfile(updatedUser);
      useAuthStore.setState((state) => ({
        session: { ...state.session, user: updatedUser },
      }));

      setSuccess(true);
    } catch {
      setError(tAccount('profileUpdateFailed'));
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <section
      className="rounded-2xl border p-5 md:p-6"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
    >
      <div className="flex items-start gap-3 mb-6">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)' }}
        >
          <UserRound className="w-5 h-5" style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-foreground)' }}>
            {tAccount('profileTitle')}
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
            {tAccount('profileDescription')}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-foreground)' }}>
            {tAccount('emailLabel')}
          </label>
          <div
            className="rounded-xl border px-4 py-2.5 text-sm"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'color-mix(in srgb, var(--color-muted) 30%, var(--color-card))',
              color: 'var(--color-muted-foreground)',
            }}
          >
            {user.email}
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
            {tAccount('emailReadonly')}
          </p>
        </div>

        <div>
          <label htmlFor="profile-fullname" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-foreground)' }}>
            {tAccount('fullNameLabel')}
          </label>
          <input
            id="profile-fullname"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors duration-fast focus:ring-2"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-card)',
              color: 'var(--color-foreground)',
              // @ts-expect-error CSS custom property
              '--tw-ring-color': 'var(--color-primary)',
            }}
          />
        </div>

        <div>
          <label htmlFor="profile-phone" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-foreground)' }}>
            {tAccount('phoneLabel')}
          </label>
          <input
            id="profile-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+48 123 456 789"
            className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors duration-fast focus:ring-2"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-card)',
              color: 'var(--color-foreground)',
              // @ts-expect-error CSS custom property
              '--tw-ring-color': 'var(--color-primary)',
            }}
          />
        </div>

        {memberSince && (
          <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
            {tAccount('memberSince', { date: memberSince })}
          </p>
        )}

        {error && (
          <div
            className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm"
            style={{
              borderColor: 'color-mix(in srgb, var(--color-destructive) 40%, var(--color-border))',
              backgroundColor: 'color-mix(in srgb, var(--color-destructive) 8%, transparent)',
              color: 'var(--color-destructive)',
            }}
          >
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            {error}
          </div>
        )}

        {success && (
          <div
            className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm"
            style={{
              borderColor: 'color-mix(in srgb, var(--color-primary) 40%, var(--color-border))',
              backgroundColor: 'color-mix(in srgb, var(--color-primary) 8%, transparent)',
              color: 'var(--color-primary)',
            }}
          >
            <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
            {tAccount('profileUpdated')}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all duration-fast active:scale-[0.98] disabled:opacity-60"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
          {tAccount('saveProfile')}
        </button>
      </form>
    </section>
  );
}
