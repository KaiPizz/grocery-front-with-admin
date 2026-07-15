'use client';

import Script from 'next/script';
import {
  AlertCircle,
  CheckCircle2,
  Facebook,
  Link2,
  Loader2,
  ShieldCheck,
  Unlink,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/stores/auth-store';
import type { CustomerLoginProvider, CustomerProfile } from '@/types';

type SocialLoginProvider = 'google' | 'facebook';

interface GoogleLinkConfig {
  clientId: string;
  nonce: string;
}

interface FacebookLinkConfig {
  appId: string;
  apiVersion: string;
  state: string;
}

interface FacebookLoginResponse {
  status?: string;
  authResponse?: { accessToken?: string } | null;
}

type FacebookSdk = NonNullable<Window['FB']>;
type PasswordDocumentSafety = 'checking' | 'safe' | 'reload-required';

const SOCIAL_PROVIDERS: SocialLoginProvider[] = ['google', 'facebook'];
const facebookSdkLoads = new Map<string, Promise<FacebookSdk>>();

function hasProviderSdkExposure(): boolean {
  if (window.google?.accounts?.id || window.FB) return true;

  return Array.from(document.scripts).some((script) => (
    script.src.startsWith('https://accounts.google.com/gsi/client')
    || script.dataset.facebookCustomerAuth === 'true'
    || script.dataset.facebookCustomerLink === 'true'
  ));
}

function isLoginProvider(value: string): value is CustomerLoginProvider {
  return value === 'password' || value === 'google' || value === 'facebook';
}

function isPasswordValid(value: string): boolean {
  return value.length > 0
    && value.length <= 72
    && new TextEncoder().encode(value).length <= 72;
}

function loadFacebookSdk(locale: 'pl' | 'en'): Promise<FacebookSdk> {
  if (window.FB) return Promise.resolve(window.FB);

  const sdkLocale = locale === 'pl' ? 'pl_PL' : 'en_US';
  const existingLoad = facebookSdkLoads.get(sdkLocale);
  if (existingLoad) return existingLoad;

  const load = new Promise<FacebookSdk>((resolve, reject) => {
    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.dataset.facebookCustomerLink = 'true';
    script.src = `https://connect.facebook.net/${sdkLocale}/sdk.js`;
    script.addEventListener('load', () => {
      if (window.FB) resolve(window.FB);
      else reject(new Error('Facebook SDK unavailable'));
    }, { once: true });
    script.addEventListener('error', () => {
      reject(new Error('Facebook SDK unavailable'));
    }, { once: true });
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    facebookSdkLoads.delete(sdkLocale);
    throw error;
  });

  facebookSdkLoads.set(sdkLocale, load);
  return load;
}

interface ProviderConnectionsPanelProps {
  profile: CustomerProfile | null;
  onPasswordIsolationChange: (isolated: boolean) => void;
}

export function ProviderConnectionsPanel({
  profile,
  onPasswordIsolationChange,
}: ProviderConnectionsPanelProps) {
  const tAccount = useTranslations('account');
  const activeLocale = useLocale();
  const locale: 'pl' | 'en' = activeLocale === 'en' ? 'en' : 'pl';
  const router = useRouter();
  const clearSession = useAuthStore((state) => state.clearSession);
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const actionInFlightRef = useRef(false);
  const googleNonceRef = useRef('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [stepUpReady, setStepUpReady] = useState(false);
  const [steppingUp, setSteppingUp] = useState(false);
  const [busyProvider, setBusyProvider] = useState<SocialLoginProvider | null>(null);
  const [pendingUnlink, setPendingUnlink] = useState<SocialLoginProvider | null>(null);
  const [googleConfig, setGoogleConfig] = useState<GoogleLinkConfig | null>(null);
  const [googleScriptReady, setGoogleScriptReady] = useState(false);
  const [googleUnavailable, setGoogleUnavailable] = useState(false);
  const [passwordDocumentSafety, setPasswordDocumentSafety] = useState<PasswordDocumentSafety>('checking');
  const [error, setError] = useState<string | null>(null);

  googleNonceRef.current = googleConfig?.nonce ?? '';

  const hasAuthoritativeMetadata = typeof profile?.hasPassword === 'boolean'
    && Array.isArray(profile.linkedProviders);
  const canManageProviders = hasAuthoritativeMetadata && profile?.hasPassword === true;
  const linkedProviders = new Set<CustomerLoginProvider>(
    (profile?.linkedProviders ?? []).filter(isLoginProvider),
  );
  if (profile?.hasPassword === true) linkedProviders.add('password');
  const googleLinked = linkedProviders.has('google');
  const passwordIsValid = isPasswordValid(currentPassword);

  const resetStepUp = useCallback(() => {
    const providerSdkExposed = hasProviderSdkExposure();
    setCurrentPassword('');
    setStepUpReady(false);
    setGoogleConfig(null);
    setPendingUnlink(null);
    setPasswordDocumentSafety(providerSdkExposed ? 'reload-required' : 'safe');
    onPasswordIsolationChange(providerSdkExposed);
  }, [onPasswordIsolationChange]);

  const redirectToSecurityLogin = useCallback(() => {
    clearSession();
    router.replace('/login?returnTo=%2Faccount%23security');
  }, [clearSession, router]);

  const handleFailure = useCallback((response: Response, action: 'link' | 'unlink') => {
    // Every provider mutation consumes the short-lived proof cookie, whether
    // the provider operation succeeds or fails.
    resetStepUp();
    if (response.status === 428) {
      setError(tAccount('providerStepUpExpired'));
      return;
    }
    if (response.status === 401) {
      redirectToSecurityLogin();
      return;
    }
    if (response.status === 409) {
      setError(tAccount(action === 'link' ? 'providerLinkConflict' : 'providerUnlinkConflict'));
      return;
    }
    if (response.status === 429) {
      setError(tAccount('providerActionRateLimited'));
      return;
    }
    if (response.status >= 500) {
      setError(tAccount('providerActionUnavailable'));
      return;
    }
    setError(tAccount('providerActionFailed'));
  }, [redirectToSecurityLogin, resetStepUp, tAccount]);

  const finishSuccessfulAction = useCallback((provider: SocialLoginProvider, action: 'link' | 'unlink') => {
    setCurrentPassword('');
    resetStepUp();
    setPendingUnlink(null);
    clearSession();
    toast.success(tAccount(action === 'link' ? 'providerLinked' : 'providerUnlinked', {
      provider: provider === 'google' ? 'Google' : 'Facebook',
    }));
    router.replace('/login?returnTo=%2Faccount%23security');
  }, [clearSession, resetStepUp, router, tAccount]);

  const confirmProviderStepUp = useCallback(async () => {
    if (
      !canManageProviders
      || !passwordIsValid
      || steppingUp
      || actionInFlightRef.current
    ) {
      setError(tAccount('providerPasswordRequired'));
      return;
    }

    actionInFlightRef.current = true;
    setSteppingUp(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/provider/step-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({ currentPassword }),
      });
      if (!response.ok) {
        setCurrentPassword('');
        resetStepUp();
        if (response.status === 401) {
          redirectToSecurityLogin();
        } else if (response.status === 429) {
          setError(tAccount('providerActionRateLimited'));
        } else if (response.status >= 500) {
          setError(tAccount('providerActionUnavailable'));
        } else {
          setError(tAccount('providerPasswordInvalid'));
        }
        return;
      }

      // Remove every account-security password field from the document before
      // any Google or Meta SDK is allowed to execute in this document.
      setCurrentPassword('');
      onPasswordIsolationChange(true);
      setStepUpReady(true);
      setGoogleUnavailable(false);
    } catch {
      setCurrentPassword('');
      resetStepUp();
      setError(tAccount('providerActionUnavailable'));
    } finally {
      actionInFlightRef.current = false;
      setSteppingUp(false);
    }
  }, [
    canManageProviders,
    currentPassword,
    passwordIsValid,
    onPasswordIsolationChange,
    redirectToSecurityLogin,
    resetStepUp,
    steppingUp,
    tAccount,
  ]);

  const startGoogleLink = useCallback(async () => {
    if (!canManageProviders || googleLinked || !stepUpReady) {
      setGoogleConfig(null);
      return;
    }

    try {
      const response = await fetch('/api/auth/google/link/start', {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      if (response.status === 401) {
        redirectToSecurityLogin();
        return;
      }
      if (response.status === 428) {
        resetStepUp();
        setError(tAccount('providerStepUpExpired'));
        return;
      }
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
        setGoogleConfig({ clientId: payload.clientId, nonce: payload.nonce });
        setGoogleUnavailable(false);
        return;
      }
    } catch {
      // A normal password session remains usable if provider discovery fails.
    }
    setGoogleConfig(null);
    setGoogleUnavailable(true);
  }, [
    canManageProviders,
    googleLinked,
    redirectToSecurityLogin,
    resetStepUp,
    stepUpReady,
    tAccount,
  ]);

  useEffect(() => {
    void startGoogleLink();
  }, [startGoogleLink]);

  useEffect(() => {
    if (!hasAuthoritativeMetadata) return;

    if (!canManageProviders) {
      setPasswordDocumentSafety('safe');
      onPasswordIsolationChange(false);
      return;
    }

    // Social login uses client navigation. If its SDK survived the navigation,
    // require an explicit new document before ever mounting the password field.
    // Do not auto-reload: an extension that reinjects a provider SDK could
    // otherwise create a reload loop.
    if (hasProviderSdkExposure()) {
      setPasswordDocumentSafety('reload-required');
      onPasswordIsolationChange(true);
      return;
    }
    setPasswordDocumentSafety('safe');
    onPasswordIsolationChange(false);
  }, [canManageProviders, hasAuthoritativeMetadata, onPasswordIsolationChange]);

  const handleGoogleCredential = useCallback(async (credential?: string) => {
    if (actionInFlightRef.current) return;
    if (!credential || !stepUpReady) {
      setError(tAccount('providerStepUpExpired'));
      return;
    }

    actionInFlightRef.current = true;
    setBusyProvider('google');
    setError(null);
    try {
      const response = await fetch('/api/auth/google/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({
          credential,
          nonce: googleNonceRef.current,
        }),
      });
      if (!response.ok) {
        handleFailure(response, 'link');
        return;
      }
      finishSuccessfulAction('google', 'link');
    } catch {
      resetStepUp();
      setError(tAccount('providerActionUnavailable'));
    } finally {
      actionInFlightRef.current = false;
      setBusyProvider(null);
    }
  }, [finishSuccessfulAction, handleFailure, resetStepUp, stepUpReady, tAccount]);

  useEffect(() => {
    const googleIdentity = window.google?.accounts?.id;
    const button = googleButtonRef.current;
    if (!googleConfig || !googleScriptReady || !googleIdentity || !button) return;

    googleIdentity.initialize({
      client_id: googleConfig.clientId,
      callback: (response) => { void handleGoogleCredential(response.credential); },
      nonce: googleConfig.nonce,
      auto_select: false,
      cancel_on_tap_outside: true,
      context: 'signin',
      ux_mode: 'popup',
    });

    let renderedWidth = 0;
    const renderButton = () => {
      const width = Math.min(360, Math.max(200, Math.floor(button.getBoundingClientRect().width)));
      if (width === renderedWidth) return;
      renderedWidth = width;
      button.replaceChildren();
      googleIdentity.renderButton(button, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text: 'signin_with',
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
  }, [googleConfig, googleScriptReady, handleGoogleCredential]);

  async function startFacebookLink(): Promise<FacebookLinkConfig | null> {
    const response = await fetch('/api/auth/facebook/link/start', {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (response.status === 401) {
      redirectToSecurityLogin();
      return null;
    }
    if (response.status === 428) {
      resetStepUp();
      setError(tAccount('providerStepUpExpired'));
      return null;
    }
    const payload = await response.json() as {
      enabled?: unknown;
      appId?: unknown;
      apiVersion?: unknown;
      state?: unknown;
    };
    if (
      !response.ok
      || payload.enabled !== true
      || typeof payload.appId !== 'string'
      || typeof payload.apiVersion !== 'string'
      || typeof payload.state !== 'string'
    ) {
      setError(tAccount('providerActionUnavailable'));
      return null;
    }
    return { appId: payload.appId, apiVersion: payload.apiVersion, state: payload.state };
  }

  async function handleFacebookLink() {
    if (busyProvider || actionInFlightRef.current) return;
    if (!stepUpReady) {
      setError(tAccount('providerStepUpExpired'));
      return;
    }

    actionInFlightRef.current = true;
    setBusyProvider('facebook');
    setError(null);
    try {
      const config = await startFacebookLink();
      if (!config) return;

      // Keep the existing privacy rule: Facebook is contacted only after click.
      const facebook = await loadFacebookSdk(locale);
      facebook.init({
        appId: config.appId,
        cookie: false,
        autoLogAppEvents: false,
        status: false,
        xfbml: false,
        version: config.apiVersion,
      });
      const loginResponse = await new Promise<FacebookLoginResponse>((resolve) => {
        facebook.login(resolve, { scope: 'public_profile,email', return_scopes: true });
      });
      const accessToken = loginResponse.status === 'connected'
        ? loginResponse.authResponse?.accessToken
        : null;
      if (!accessToken) {
        setError(tAccount('providerActionFailed'));
        return;
      }

      const response = await fetch('/api/auth/facebook/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({
          accessToken,
          state: config.state,
        }),
      });
      if (!response.ok) {
        handleFailure(response, 'link');
        return;
      }
      finishSuccessfulAction('facebook', 'link');
    } catch {
      resetStepUp();
      setError(tAccount('providerActionUnavailable'));
    } finally {
      actionInFlightRef.current = false;
      setBusyProvider(null);
    }
  }

  async function handleUnlink(provider: SocialLoginProvider) {
    if (busyProvider || actionInFlightRef.current) return;
    if (!stepUpReady) {
      setError(tAccount('providerStepUpExpired'));
      return;
    }

    actionInFlightRef.current = true;
    setBusyProvider(provider);
    setError(null);
    try {
      const response = await fetch('/api/auth/provider/unlink', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({ provider }),
      });
      if (!response.ok) {
        handleFailure(response, 'unlink');
        return;
      }
      finishSuccessfulAction(provider, 'unlink');
    } catch {
      resetStepUp();
      setError(tAccount('providerActionUnavailable'));
    } finally {
      actionInFlightRef.current = false;
      setBusyProvider(null);
    }
  }

  return (
    <section className="mb-7 max-w-2xl" aria-labelledby="provider-connections-title">
      <h3 id="provider-connections-title" className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
        {tAccount('signInMethodsTitle')}
      </h3>
      <p className="mt-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
        {tAccount('signInMethodsDescription')}
      </p>

      {!hasAuthoritativeMetadata ? (
        <p className="mt-3 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted-foreground)' }}>
          {tAccount('providerMetadataUnavailable')}
        </p>
      ) : (
        <>
          {canManageProviders && stepUpReady ? (
            <div
              className="mt-4 flex max-w-lg items-start gap-2 rounded-xl border px-4 py-3 text-sm font-medium"
              style={{
                borderColor: 'color-mix(in srgb, var(--color-primary) 35%, var(--color-border))',
                backgroundColor: 'color-mix(in srgb, var(--color-primary) 7%, transparent)',
                color: 'var(--color-foreground)',
              }}
              role="status"
              aria-live="polite"
            >
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
              {tAccount('providerStepUpReady')}
            </div>
          ) : canManageProviders && passwordDocumentSafety === 'safe' ? (
            <div className="mt-4 max-w-lg">
              <label className="block" htmlFor="provider-current-password">
                <span className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
                  {tAccount('providerCurrentPassword')}
                </span>
                <input
                  id="provider-current-password"
                  name="provider-current-password"
                  type="password"
                  autoComplete="current-password"
                  maxLength={72}
                  disabled={steppingUp || Boolean(busyProvider)}
                  value={currentPassword}
                  onChange={(event) => {
                    setCurrentPassword(event.target.value);
                    setError(null);
                  }}
                  className="h-11 w-full rounded-xl border bg-transparent px-4 text-sm outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-foreground)',
                    '--tw-ring-color': 'color-mix(in srgb, var(--color-primary) 35%, transparent)',
                  } as CSSProperties}
                />
              </label>
              <p className="mt-2 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                {tAccount('providerPasswordHint')}
              </p>
              <button
                type="button"
                onClick={() => { void confirmProviderStepUp(); }}
                disabled={!passwordIsValid || steppingUp || Boolean(busyProvider)}
                className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {steppingUp
                  ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
                {steppingUp
                  ? tAccount('providerStepUpChecking')
                  : tAccount('providerStepUpAction')}
              </button>
            </div>
          ) : canManageProviders && passwordDocumentSafety === 'reload-required' ? (
            <div
              className="mt-4 max-w-lg rounded-xl border px-4 py-3 text-sm"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted-foreground)' }}
              role="status"
            >
              <p>{tAccount('providerStepUpReloadRequired')}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-3 inline-flex min-h-11 items-center justify-center rounded-full border px-5 text-sm font-semibold"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
              >
                {tAccount('providerStepUpReloadAction')}
              </button>
            </div>
          ) : canManageProviders ? (
            <p className="mt-4 text-xs" style={{ color: 'var(--color-muted-foreground)' }} role="status">
              {tAccount('providerStepUpDocumentCheck')}
            </p>
          ) : (
            <p className="mt-4 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
              {tAccount('providerPasswordSetupRequired')}
            </p>
          )}

          <div className="mt-4 divide-y rounded-2xl border px-4" style={{ borderColor: 'var(--color-border)' }}>
            {SOCIAL_PROVIDERS.map((provider) => {
              const linked = linkedProviders.has(provider);
              const canUnlink = linkedProviders.size > 1;
              const providerName = provider === 'google' ? 'Google' : 'Facebook';
              const busy = busyProvider === provider;
              return (
                <div key={provider} className="py-4 first:pt-4 last:pb-4" style={{ borderColor: 'var(--color-border)' }}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border font-bold"
                        style={{
                          borderColor: 'var(--color-border)',
                          backgroundColor: 'var(--color-background)',
                          color: provider === 'facebook' ? '#1877F2' : 'var(--color-foreground)',
                        }}
                        aria-hidden="true"
                      >
                        {provider === 'facebook' ? <Facebook className="h-5 w-5" /> : 'G'}
                      </div>
                      <div>
                        <p className="font-semibold" style={{ color: 'var(--color-foreground)' }}>{providerName}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                          {linked && <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--color-primary)' }} aria-hidden="true" />}
                          {tAccount(linked ? 'providerConnected' : 'providerNotConnected')}
                        </p>
                      </div>
                    </div>

                    {linked ? (
                      <button
                        type="button"
                        onClick={() => {
                          setPendingUnlink(provider);
                          setError(null);
                        }}
                        disabled={!canManageProviders || !canUnlink || !stepUpReady || Boolean(busyProvider)}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
                      >
                        <Unlink className="h-4 w-4" aria-hidden="true" />
                        {tAccount('providerDisconnect')}
                      </button>
                    ) : provider === 'google' ? (
                      <div className="w-full sm:w-[260px]">
                        {canManageProviders && stepUpReady && googleConfig && !googleUnavailable ? (
                          <>
                            <Script
                              id={`google-identity-link-${locale}`}
                              src={`https://accounts.google.com/gsi/client?hl=${locale}`}
                              strategy="afterInteractive"
                              onLoad={() => setGoogleScriptReady(true)}
                              onReady={() => setGoogleScriptReady(true)}
                              onError={() => setGoogleUnavailable(true)}
                            />
                            <div
                              className={`min-h-11 overflow-hidden rounded-full ${busyProvider ? 'pointer-events-none opacity-60' : ''}`}
                              aria-busy={Boolean(busyProvider) || !googleScriptReady}
                            >
                              <span className="sr-only">{tAccount('providerConnectGoogle')}</span>
                              <div ref={googleButtonRef} className="flex min-h-11 w-full justify-center" />
                            </div>
                          </>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border px-5 text-sm font-semibold opacity-50"
                            style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
                          >
                            <Link2 className="h-4 w-4" aria-hidden="true" />
                            {tAccount(googleUnavailable ? 'providerUnavailable' : 'providerConnectGoogle')}
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { void handleFacebookLink(); }}
                        disabled={!canManageProviders || !stepUpReady || Boolean(busyProvider)}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                        style={{ backgroundColor: '#1877F2' }}
                      >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Facebook className="h-4 w-4" aria-hidden="true" />}
                        {tAccount('providerConnectFacebook')}
                      </button>
                    )}
                  </div>

                  {linked && !canUnlink && (
                    <p className="mt-2 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                      {tAccount('providerLastMethod')}
                    </p>
                  )}

                  {pendingUnlink === provider && (
                    <div className="mt-3 rounded-xl border p-3" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)' }}>
                      <p className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
                        {tAccount('providerDisconnectConfirm', { provider: providerName })}
                      </p>
                      <p className="mt-1 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                        {tAccount('providerSessionRevocationNotice')}
                      </p>
                      <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row">
                        <button
                          type="button"
                          onClick={() => setPendingUnlink(null)}
                          disabled={busy}
                          className="inline-flex min-h-11 items-center justify-center rounded-full border px-4 text-sm font-semibold disabled:opacity-50"
                          style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
                        >
                          {tAccount('providerCancel')}
                        </button>
                        <button
                          type="button"
                          onClick={() => { void handleUnlink(provider); }}
                          disabled={busy || !stepUpReady}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold text-white disabled:opacity-50"
                          style={{ backgroundColor: 'var(--color-destructive)' }}
                        >
                          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                          {tAccount('providerDisconnectConfirmAction')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {error && (
        <p
          className="mt-3 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm"
          style={{
            borderColor: 'color-mix(in srgb, var(--color-destructive) 40%, var(--color-border))',
            color: 'var(--color-destructive)',
          }}
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </section>
  );
}
