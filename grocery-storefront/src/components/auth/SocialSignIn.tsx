'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';

import { FacebookSignIn } from './FacebookSignIn';
import { GoogleSignIn } from './GoogleSignIn';

interface SocialSignInProps {
  mode: 'login' | 'register';
  returnTo: string;
}

export function SocialSignIn({ mode, returnTo }: SocialSignInProps) {
  const t = useTranslations('auth');
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [facebookEnabled, setFacebookEnabled] = useState(false);
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
        <GoogleSignIn
          mode={mode}
          returnTo={returnTo}
          onAvailabilityChange={handleGoogleAvailability}
        />
        <FacebookSignIn
          mode={mode}
          returnTo={returnTo}
          onAvailabilityChange={handleFacebookAvailability}
        />
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
