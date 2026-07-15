'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { UserRound, ChevronRight, Loader2 } from 'lucide-react';
import { AccountTabs } from '@/components/account/AccountTabs';
import { EmailVerificationBanner } from '@/components/account/EmailVerificationBanner';
import { Link } from '@/i18n/navigation';
import { useAuthStore } from '@/stores/auth-store';

export default function AccountPage() {
  const tNav = useTranslations('nav');
  const tAccount = useTranslations('account');
  const session = useAuthStore((state) => state.session);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="container-grocery py-12 md:py-16 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--color-muted-foreground)' }} />
      </div>
    );
  }

  const isAuthenticated = session.status === 'authenticated';

  if (!isAuthenticated) {
    return (
      <div className="container-grocery py-12 md:py-16">
        <div
          className="mx-auto max-w-2xl rounded-[28px] border p-8 text-center"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
        >
          <UserRound className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
          <h1 className="heading-display text-2xl md:text-3xl" style={{ color: 'var(--color-foreground)' }}>
            {tAccount('loginTitle')}
          </h1>
          <p className="mt-3 text-sm md:text-base" style={{ color: 'var(--color-muted-foreground)' }}>
            {tAccount('loginDescription')}
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-xl font-semibold text-white transition-all duration-fast active:scale-[0.98]"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <span>{tAccount('loginAction')}</span>
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-grocery py-8 md:py-12">
      <div
        className="rounded-[32px] border p-6 md:p-8"
        style={{
          borderColor: 'var(--color-border)',
          background:
            'linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 55%, white) 0%, var(--color-card) 38%, color-mix(in srgb, var(--color-primary) 8%, white) 100%)',
        }}
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-[0.22em]"
              style={{ color: 'var(--color-primary)' }}
            >
              {tNav('account')}
            </p>
            <h1 className="heading-display text-3xl md:text-4xl mt-2" style={{ color: 'var(--color-foreground)' }}>
              {tAccount('title')}
            </h1>
            <p className="mt-3 max-w-2xl text-sm md:text-base" style={{ color: 'var(--color-muted-foreground)' }}>
              {tAccount('subtitle')}
            </p>
          </div>

          <div
            className="min-w-0 rounded-2xl border px-5 py-4"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'color-mix(in srgb, var(--color-card) 88%, white)' }}
          >
            <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
              {tAccount('signedInAs')}
            </p>
            <p className="mt-2 text-base font-semibold truncate" style={{ color: 'var(--color-foreground)' }}>
              {session.user?.fullName || tNav('account')}
            </p>
            <p className="text-sm truncate" style={{ color: 'var(--color-muted-foreground)' }}>
              {session.user?.email}
            </p>
          </div>
        </div>
      </div>

      {session.user?.emailVerified === false && <EmailVerificationBanner />}

      <div className="mt-8">
        <AccountTabs />
      </div>
    </div>
  );
}
