'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';

import type { SocialAuthProviders } from '@/lib/auth/social-availability';

import { FacebookSignIn } from './FacebookSignIn';
import { GoogleSignIn } from './GoogleSignIn';

interface SocialSignInProps {
  mode: 'login' | 'register';
  returnTo: string;
  providers: SocialAuthProviders;
}

export function SocialSignIn({ mode, returnTo, providers }: SocialSignInProps) {
  const t = useTranslations('auth');
  // Seeded from the server so the section (and divider) is laid out on the
  // first paint; a provider is dropped only if its discovery later fails.
  const [googleEnabled, setGoogleEnabled] = useState(providers.google);
  const [facebookEnabled, setFacebookEnabled] = useState(providers.facebook);
  const handleGoogleAvailability = useCallback((enabled: boolean) => {
    setGoogleEnabled(enabled);
  }, []);
  const handleFacebookAvailability = useCallback((enabled: boolean) => {
    setFacebookEnabled(enabled);
  }, []);
  const hasSocialProvider = googleEnabled || facebookEnabled;

  return (
    <div
      className={hasSocialProvider ? 'mb-5' : 'contents'}
      data-testid={hasSocialProvider ? 'social-auth-section' : undefined}
    >
      <div className={hasSocialProvider ? 'space-y-3' : 'contents'}>
        {providers.google && (
          <GoogleSignIn
            mode={mode}
            returnTo={returnTo}
            onAvailabilityChange={handleGoogleAvailability}
          />
        )}
        {providers.facebook && (
          <FacebookSignIn
            mode={mode}
            returnTo={returnTo}
            onAvailabilityChange={handleFacebookAvailability}
          />
        )}
      </div>
      {hasSocialProvider && (
        <div className="mt-5 flex items-center gap-3" role="separator" aria-label={t('emailDivider')}>
          <span className="h-px flex-1" style={{ backgroundColor: 'var(--color-border)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--color-muted-foreground)' }}>
            {t('emailDivider')}
          </span>
          <span className="h-px flex-1" style={{ backgroundColor: 'var(--color-border)' }} />
        </div>
      )}
    </div>
  );
}
