'use client';

import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useRef, useState } from 'react';
import {
  Check,
  CircleAlert,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';

import { LangSwitcher, useLanguage } from '@/i18n';
import { getSafeAdminReturnPath } from '@/lib/safe-return-path';

interface FieldErrors {
  username?: string;
  password?: string;
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnPath = getSafeAdminReturnPath(searchParams.get('from'));
  const { t } = useLanguage();

  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const submittingRef = useRef(false);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function focusServerError() {
    requestAnimationFrame(() => errorRef.current?.focus());
  }

  function showAuthenticationError(message: string) {
    setError(message);
    setPassword('');
    setLoading(false);
    submittingRef.current = false;
    focusServerError();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;

    const normalizedUsername = username.trim();
    const nextFieldErrors: FieldErrors = {};

    if (!normalizedUsername) {
      nextFieldErrors.username = t('login.usernameRequired');
    }
    if (!password) {
      nextFieldErrors.password = t('login.passwordRequired');
    }

    setFieldErrors(nextFieldErrors);
    setError('');

    if (nextFieldErrors.username) {
      usernameRef.current?.focus();
      return;
    }
    if (nextFieldErrors.password) {
      passwordRef.current?.focus();
      return;
    }

    submittingRef.current = true;
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: normalizedUsername, password }),
      });

      let authenticated = false;
      try {
        const data = (await response.json()) as { success?: boolean };
        authenticated = data.success === true;
      } catch {
        authenticated = false;
      }

      if (!response.ok || !authenticated) {
        const message = response.status === 429
          ? t('login.errorTooManyAttempts')
          : response.status === 401
            ? t('login.errorInvalidCredentials')
            : t('login.errorFailedConnect');

        showAuthenticationError(message);
        return;
      }

      router.replace(returnPath);
      router.refresh();
    } catch {
      showAuthenticationError(t('login.errorFailedConnect'));
    }
  }

  return (
    <div className="relative min-h-[100svh] overflow-hidden bg-[#fbf8ef] text-slate-950">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-28 h-72 w-72 rounded-full bg-[#169B45]/[0.07]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-36 -right-24 h-80 w-80 rounded-full border-[44px] border-[#E30613]/[0.05]"
      />

      <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-[1120px] flex-col px-4 sm:px-6 lg:px-10">
        <header className="flex min-h-20 items-center justify-between gap-4 border-b border-slate-900/10 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative h-12 w-24 shrink-0 overflow-hidden rounded-lg bg-white">
              <Image
                src="/brand/asia-deli-go-logo.jpg"
                alt="Asia Deli Go"
                fill
                priority
                unoptimized
                sizes="96px"
                className="object-cover"
              />
            </div>
            <span className="border-l border-slate-300 pl-3 text-sm font-semibold tracking-tight text-slate-700">
              Admin
            </span>
          </div>
          <LangSwitcher />
        </header>

        <main className="flex flex-1 items-center py-8 sm:py-12 lg:py-16">
          <div className="grid w-full items-center gap-10 lg:grid-cols-[minmax(0,1fr)_430px] lg:gap-16 xl:gap-24">
            <section className="hidden max-w-xl lg:block" aria-labelledby="brand-heading">
              <div className="mb-6 inline-flex min-h-8 items-center rounded-full border border-[#169B45]/25 bg-[#169B45]/[0.07] px-3 text-xs font-bold uppercase tracking-[0.14em] text-[#0f6f35]">
                {t('login.eyebrow')}
              </div>
              <h2
                id="brand-heading"
                className="max-w-lg text-4xl font-light leading-[1.12] tracking-[-0.035em] text-slate-950 xl:text-5xl"
              >
                {t('login.brandHeadline')}
              </h2>
              <p className="mt-5 max-w-lg text-base leading-7 text-slate-600">
                {t('login.brandDescription')}
              </p>

              <div className="mt-8 grid max-w-lg gap-3 text-sm font-medium text-slate-800">
                <div className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-900/10 bg-white/70 px-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#169B45] text-white">
                    <Check aria-hidden="true" className="h-4 w-4" strokeWidth={2.5} />
                  </span>
                  {t('login.brandFeatureContent')}
                </div>
                <div className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-900/10 bg-white/70 px-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#169B45] text-white">
                    <Check aria-hidden="true" className="h-4 w-4" strokeWidth={2.5} />
                  </span>
                  {t('login.brandFeaturePublish')}
                </div>
              </div>
            </section>

            <section
              className="relative w-full overflow-hidden rounded-2xl border border-slate-900/10 bg-white shadow-[0_18px_55px_-28px_rgba(15,23,42,0.45)]"
              aria-labelledby="login-heading"
            >
              <div aria-hidden="true" className="h-1 w-full bg-[#E30613]" />
              <div className="p-6 sm:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#0f6f35]">
                  {t('login.eyebrow')}
                </p>
                <h1
                  id="login-heading"
                  className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-slate-950"
                >
                  {t('login.welcome')}
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {t('login.description')}
                </p>

                <form
                  onSubmit={handleSubmit}
                  noValidate
                  aria-busy={loading}
                  className="mt-7 space-y-5"
                >
                  {error && (
                    <div
                      ref={errorRef}
                      role="alert"
                      aria-live="assertive"
                      tabIndex={-1}
                      className="flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-900 outline-none focus:ring-2 focus:ring-red-700 focus:ring-offset-2"
                    >
                      <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div>
                    <label htmlFor="username" className="mb-2 block text-sm font-semibold text-slate-800">
                      {t('login.username')}
                    </label>
                    <input
                      ref={usernameRef}
                      id="username"
                      name="username"
                      type="text"
                      value={username}
                      onChange={(event) => {
                        setUsername(event.target.value);
                        setFieldErrors((current) => ({ ...current, username: undefined }));
                        setError('');
                      }}
                      autoFocus
                      autoComplete="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      enterKeyHint="next"
                      aria-invalid={Boolean(fieldErrors.username)}
                      aria-describedby={fieldErrors.username ? 'username-error' : undefined}
                      className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-base text-slate-950 outline-none transition-[border-color,box-shadow] placeholder:text-slate-400 hover:border-slate-400 focus:border-[#169B45] focus:ring-2 focus:ring-[#169B45]/20"
                    />
                    {fieldErrors.username && (
                      <p id="username-error" role="alert" className="mt-2 text-sm text-red-800">
                        {fieldErrors.username}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-800">
                      {t('login.password')}
                    </label>
                    <div className="relative">
                      <input
                        ref={passwordRef}
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(event) => {
                          setPassword(event.target.value);
                          setFieldErrors((current) => ({ ...current, password: undefined }));
                          setError('');
                        }}
                        autoComplete="current-password"
                        enterKeyHint="go"
                        aria-invalid={Boolean(fieldErrors.password)}
                        aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                        className="min-h-12 w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-3.5 pr-14 text-base text-slate-950 outline-none transition-[border-color,box-shadow] hover:border-slate-400 focus:border-[#169B45] focus:ring-2 focus:ring-[#169B45]/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((visible) => !visible)}
                        aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                        aria-pressed={showPassword}
                        className="absolute inset-y-0 right-0 flex min-w-12 items-center justify-center rounded-r-lg text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#169B45]"
                      >
                        {showPassword
                          ? <EyeOff aria-hidden="true" className="h-5 w-5" />
                          : <Eye aria-hidden="true" className="h-5 w-5" />}
                      </button>
                    </div>
                    {fieldErrors.password && (
                      <p id="password-error" role="alert" className="mt-2 text-sm text-red-800">
                        {fieldErrors.password}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#169B45] px-5 text-sm font-bold text-white shadow-sm transition-[background-color,box-shadow,transform] hover:bg-[#117a36] hover:shadow-md active:translate-y-px disabled:cursor-wait disabled:bg-slate-400 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f6f35] focus-visible:ring-offset-2"
                  >
                    {loading ? (
                      <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                    ) : (
                      <LockKeyhole aria-hidden="true" className="h-4 w-4" />
                    )}
                    {loading ? t('login.signingIn') : t('login.signIn')}
                  </button>
                </form>

                <div className="mt-6 flex items-start gap-2.5 border-t border-slate-200 pt-5 text-xs leading-5 text-slate-600">
                  <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#0f6f35]" />
                  <span>{t('login.securityNotice')}</span>
                </div>
              </div>
            </section>
          </div>
        </main>

        <footer className="flex min-h-14 items-center justify-center border-t border-slate-900/10 py-3 text-center text-xs font-medium text-slate-600">
          {t('login.footer')}
        </footer>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={(
        <div className="flex min-h-[100svh] items-center justify-center bg-[#fbf8ef]">
          <Loader2 aria-hidden="true" className="h-6 w-6 animate-spin text-[#169B45]" />
          <span className="sr-only">Loading...</span>
        </div>
      )}
    >
      <LoginContent />
    </Suspense>
  );
}
