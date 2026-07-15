'use client';

import Script from 'next/script';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useWishlistStore } from '@/stores/wishlist-store';

interface GoogleFlowConfig {
  clientId: string;
  nonce: string;
}

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleIdentityApi {
  initialize(config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    nonce: string;
    auto_select: boolean;
    cancel_on_tap_outside: boolean;
    context: 'signin' | 'signup';
    ux_mode: 'popup';
  }): void;
  renderButton(
    parent: HTMLElement,
    options: {
      type: 'standard';
      theme: 'outline';
      size: 'large';
      shape: 'pill';
      text: 'signin_with' | 'signup_with';
      logo_alignment: 'left';
      width: number;
    },
  ): void;
  cancel(): void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleIdentityApi;
      };
    };
  }
}

interface GoogleSignInProps {
  mode: 'login' | 'register';
  returnTo: string;
  onAvailabilityChange: (enabled: boolean) => void;
}

export function GoogleSignIn({
  mode,
  returnTo,
  onAvailabilityChange,
}: GoogleSignInProps) {
  const t = useTranslations('auth');
  const activeLocale = useLocale();
  const locale = activeLocale === 'en' ? 'en' : 'pl';
  const router = useRouter();
  const googleLogin = useAuthStore((state) => state.googleLogin);
  const isSubmitting = useAuthStore((state) => state.isSubmitting);
  const buttonRef = useRef<HTMLDivElement>(null);
  const exchangeInFlightRef = useRef(false);
  const [config, setConfig] = useState<GoogleFlowConfig | null>(null);
  const [providerEnabled, setProviderEnabled] = useState<boolean | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startFlow = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/google/start', {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      const payload = await response.json() as {
        enabled?: unknown;
        clientId?: unknown;
        nonce?: unknown;
      };

      if (
        response.ok
        && payload.enabled === true
        && typeof payload.clientId === 'string'
        && typeof payload.nonce === 'string'
      ) {
        setConfig({ clientId: payload.clientId, nonce: payload.nonce });
        setProviderEnabled(true);
        return;
      }
    } catch {
      // Email/password remains available when provider discovery is unavailable.
    }

    setConfig(null);
    setProviderEnabled(false);
  }, []);

  useEffect(() => {
    void startFlow();
  }, [startFlow]);

  useEffect(() => {
    onAvailabilityChange(providerEnabled === true);
  }, [onAvailabilityChange, providerEnabled]);

  useEffect(() => {
    if (window.google?.accounts?.id) {
      setScriptReady(true);
    }
  }, []);

  const handleCredential = useCallback(async (response: GoogleCredentialResponse) => {
    const credential = response.credential;
    if (!credential || exchangeInFlightRef.current) {
      setError(t('googleFailed'));
      return;
    }

    exchangeInFlightRef.current = true;
    setError(null);
    const guestSnapshot = [...useWishlistStore.getState().guestItems];

    try {
      const result = await googleLogin(credential);
      if (!result.success) {
        setError(t('googleFailed'));
        await startFlow();
        return;
      }

      await useWishlistStore.getState().syncGuestWishlist(guestSnapshot);
      await useWishlistStore.getState().loadWishlist();
      toast.success(t('googleSuccess'));
      router.replace(returnTo);
    } finally {
      exchangeInFlightRef.current = false;
    }
  }, [googleLogin, returnTo, router, startFlow, t]);

  useEffect(() => {
    const googleIdentity = window.google?.accounts?.id;
    const button = buttonRef.current;
    if (!config || !scriptReady || !googleIdentity || !button) return;

    googleIdentity.initialize({
      client_id: config.clientId,
      callback: (response) => {
        void handleCredential(response);
      },
      nonce: config.nonce,
      auto_select: false,
      cancel_on_tap_outside: true,
      context: mode === 'login' ? 'signin' : 'signup',
      ux_mode: 'popup',
    });

    let renderedWidth = 0;
    const renderButton = () => {
      const width = Math.min(400, Math.max(200, Math.floor(button.getBoundingClientRect().width)));
      if (width === renderedWidth) return;
      renderedWidth = width;
      button.replaceChildren();
      googleIdentity.renderButton(button, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text: mode === 'login' ? 'signin_with' : 'signup_with',
        logo_alignment: 'left',
        width,
      });
    };

    renderButton();
    const resizeObserver = new ResizeObserver(renderButton);
    resizeObserver.observe(button);

    return () => {
      resizeObserver.disconnect();
      googleIdentity.cancel();
      button.replaceChildren();
    };
  }, [config, handleCredential, mode, scriptReady]);

  if (providerEnabled !== true || !config) return null;

  return (
    <div data-testid="google-auth-section">
      <Script
        id={`google-identity-services-${locale}`}
        src={`https://accounts.google.com/gsi/client?hl=${locale}`}
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onReady={() => setScriptReady(true)}
        onError={() => setError(t('googleFailed'))}
      />
      <div
        className={`min-h-11 w-full overflow-hidden rounded-full transition-opacity ${isSubmitting ? 'pointer-events-none opacity-60' : ''}`}
        aria-busy={!scriptReady || isSubmitting}
      >
        <span className="sr-only">{t(mode === 'login' ? 'googleLoginLabel' : 'googleRegisterLabel')}</span>
        <div ref={buttonRef} className="flex min-h-11 w-full justify-center" />
      </div>
      {error && (
        <p className="mt-2 text-center text-xs" style={{ color: 'var(--color-destructive)' }} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
