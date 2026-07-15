'use client';

import { Facebook } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useWishlistStore } from '@/stores/wishlist-store';

interface FacebookFlowConfig {
  appId: string;
  apiVersion: string;
  state: string;
}

interface FacebookAuthResponse {
  accessToken?: string;
}

interface FacebookLoginResponse {
  status?: string;
  authResponse?: FacebookAuthResponse | null;
}

interface FacebookSdk {
  init(config: {
    appId: string;
    cookie: false;
    autoLogAppEvents: false;
    status: false;
    xfbml: false;
    version: string;
  }): void;
  login(
    callback: (response: FacebookLoginResponse) => void,
    options: {
      scope: 'public_profile,email';
      return_scopes: true;
    },
  ): void;
}

declare global {
  interface Window {
    FB?: FacebookSdk;
  }
}

const sdkLoads = new Map<string, Promise<FacebookSdk>>();

function loadFacebookSdk(locale: 'pl' | 'en'): Promise<FacebookSdk> {
  if (window.FB) return Promise.resolve(window.FB);

  const sdkLocale = locale === 'pl' ? 'pl_PL' : 'en_US';
  const existingLoad = sdkLoads.get(sdkLocale);
  if (existingLoad) return existingLoad;

  const load = new Promise<FacebookSdk>((resolve, reject) => {
    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.dataset.facebookCustomerAuth = 'true';
    script.src = `https://connect.facebook.net/${sdkLocale}/sdk.js`;
    script.addEventListener('load', () => {
      if (window.FB) {
        resolve(window.FB);
      } else {
        reject(new Error('Facebook SDK unavailable'));
      }
    }, { once: true });
    script.addEventListener('error', () => {
      reject(new Error('Facebook SDK unavailable'));
    }, { once: true });
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    sdkLoads.delete(sdkLocale);
    throw error;
  });

  sdkLoads.set(sdkLocale, load);
  return load;
}

interface FacebookSignInProps {
  mode: 'login' | 'register';
  returnTo: string;
  onAvailabilityChange: (enabled: boolean) => void;
}

export function FacebookSignIn({
  mode,
  returnTo,
  onAvailabilityChange,
}: FacebookSignInProps) {
  const t = useTranslations('auth');
  const activeLocale = useLocale();
  const locale: 'pl' | 'en' = activeLocale === 'en' ? 'en' : 'pl';
  const router = useRouter();
  const facebookLogin = useAuthStore((state) => state.facebookLogin);
  const isSubmitting = useAuthStore((state) => state.isSubmitting);
  const loginInFlightRef = useRef(false);
  const [config, setConfig] = useState<FacebookFlowConfig | null>(null);
  const [providerEnabled, setProviderEnabled] = useState<boolean | null>(null);
  const [sdkLoading, setSdkLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startFlow = useCallback(async (): Promise<FacebookFlowConfig | null> => {
    try {
      const response = await fetch('/api/auth/facebook/start', {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      const payload = await response.json() as {
        enabled?: unknown;
        appId?: unknown;
        apiVersion?: unknown;
        state?: unknown;
      };

      if (
        response.ok
        && payload.enabled === true
        && typeof payload.appId === 'string'
        && typeof payload.apiVersion === 'string'
        && typeof payload.state === 'string'
      ) {
        const nextConfig = {
          appId: payload.appId,
          apiVersion: payload.apiVersion,
          state: payload.state,
        };
        setConfig(nextConfig);
        setProviderEnabled(true);
        return nextConfig;
      }
    } catch {
      // Email/password remains available when provider discovery is unavailable.
    }

    setConfig(null);
    setProviderEnabled(false);
    return null;
  }, []);

  useEffect(() => {
    void startFlow();
  }, [startFlow]);

  useEffect(() => {
    onAvailabilityChange(providerEnabled === true);
  }, [onAvailabilityChange, providerEnabled]);

  const handleClick = useCallback(async () => {
    if (loginInFlightRef.current) return;

    loginInFlightRef.current = true;
    setSdkLoading(true);
    setError(null);

    try {
      const activeConfig = await startFlow();
      if (!activeConfig) {
        setError(t('facebookFailed'));
        return;
      }

      // Privacy gate: connect.facebook.net is contacted only after this
      // explicit button click. The official SDK owns popup/mobile behavior.
      const facebookSdk = await loadFacebookSdk(locale);
      facebookSdk.init({
        appId: activeConfig.appId,
        cookie: false,
        autoLogAppEvents: false,
        status: false,
        xfbml: false,
        version: activeConfig.apiVersion,
      });

      const loginResponse = await new Promise<FacebookLoginResponse>((resolve) => {
        facebookSdk.login(resolve, {
          scope: 'public_profile,email',
          return_scopes: true,
        });
      });
      const accessToken = loginResponse.status === 'connected'
        ? loginResponse.authResponse?.accessToken
        : null;
      if (!accessToken) {
        setError(t('facebookFailed'));
        await startFlow();
        return;
      }

      const guestSnapshot = [...useWishlistStore.getState().guestItems];
      const result = await facebookLogin(accessToken, activeConfig.state, locale);
      if (!result.success) {
        setError(t('facebookFailed'));
        await startFlow();
        return;
      }

      await useWishlistStore.getState().syncGuestWishlist(guestSnapshot);
      await useWishlistStore.getState().loadWishlist();
      toast.success(t('facebookSuccess'));
      if (useAuthStore.getState().session.user?.emailVerified === false) {
        toast.info(t('facebookVerifyEmail'));
      }
      router.replace(returnTo);
    } catch {
      setError(t('facebookFailed'));
      await startFlow();
    } finally {
      setSdkLoading(false);
      loginInFlightRef.current = false;
    }
  }, [facebookLogin, locale, returnTo, router, startFlow, t]);

  if (providerEnabled !== true || !config) return null;

  const isBusy = sdkLoading || isSubmitting;

  return (
    <div data-testid="facebook-auth-section">
      <button
        type="button"
        onClick={() => { void handleClick(); }}
        disabled={isBusy}
        className="flex h-11 w-full items-center justify-center gap-2.5 rounded-full px-5 text-sm font-semibold text-white transition-all duration-fast active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        style={{ backgroundColor: '#1877F2' }}
        aria-label={t(mode === 'login' ? 'facebookLoginLabel' : 'facebookRegisterLabel')}
      >
        <Facebook className="h-5 w-5" aria-hidden="true" />
        <span>
          {isBusy
            ? t('facebookLoading')
            : t(mode === 'login' ? 'facebookLoginLabel' : 'facebookRegisterLabel')}
        </span>
      </button>
      {error && (
        <p className="mt-2 text-center text-xs" style={{ color: 'var(--color-destructive)' }} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
