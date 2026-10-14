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

// Never leave the slot blank if Google's frame never reports a load.
const GOOGLE_BUTTON_REVEAL_FALLBACK_MS = 2_500;

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
  const [buttonReady, setButtonReady] = useState(false);
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
    if (providerEnabled === null) return;
    onAvailabilityChange(providerEnabled);
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

    // Google first paints a plain fallback button, then swaps in its frame
    // (possibly personalised as "Continue as …"). Keep the placeholder until
    // the frame has loaded so the visitor sees one change, not two.
    let revealed = false;
    const markReady = () => {
      if (revealed) return;
      revealed = true;
      setButtonReady(true);
    };
    const watchFrame = () => {
      const frame = button.querySelector('iframe');
      if (!frame) return false;
      frame.addEventListener('load', markReady, { once: true });
      return true;
    };
    const frameObserver = new MutationObserver(() => {
      if (watchFrame()) frameObserver.disconnect();
    });
    if (!watchFrame()) {
      frameObserver.observe(button, { childList: true, subtree: true });
    }
    const revealFallback = window.setTimeout(markReady, GOOGLE_BUTTON_REVEAL_FALLBACK_MS);

    return () => {
      window.clearTimeout(revealFallback);
      frameObserver.disconnect();
      resizeObserver.disconnect();
      googleIdentity.cancel();
      button.replaceChildren();
    };
  }, [config, handleCredential, mode, scriptReady]);

  // The server already said Google is configured, so the slot is reserved
  // from the first paint and only collapses if discovery fails.
  if (providerEnabled === false) return null;

  return (
    <div data-testid="google-auth-section">
      {config && (
        <Script
          id={`google-identity-services-${locale}`}
          src={`https://accounts.google.com/gsi/client?hl=${locale}`}
          strategy="afterInteractive"
          onLoad={() => setScriptReady(true)}
          onReady={() => setScriptReady(true)}
          onError={() => {
            setError(t('googleFailed'));
            setButtonReady(true);
          }}
        />
      )}
      <div
        className="relative h-11 w-full overflow-hidden rounded-full"
        aria-busy={!buttonReady || isSubmitting}
      >
        <span className="sr-only">{t(mode === 'login' ? 'googleLoginLabel' : 'googleRegisterLabel')}</span>
        {!buttonReady && (
          <div
            aria-hidden="true"
            className="absolute inset-0 animate-pulse rounded-full border"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-muted)' }}
          />
        )}
        <div
          ref={buttonRef}
          className={`flex h-11 w-full items-center justify-center transition-opacity duration-200 ${isSubmitting ? 'pointer-events-none opacity-60' : buttonReady ? 'opacity-100' : 'opacity-0'}`}
        />
      </div>
      {error && (
        <p className="mt-2 text-center text-xs" style={{ color: 'var(--color-destructive)' }} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
