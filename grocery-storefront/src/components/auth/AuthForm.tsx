'use client';

import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react';
import { useSearchParams } from 'next/navigation';
import { UserRound, Mail, Phone, Lock, ArrowRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Link, useRouter } from '@/i18n/navigation';
import { safeReturnPath } from '@/lib/auth/safe-return-path';
import { isValidOptionalPhoneNumber } from '@/lib/phone-validation';
import { useAuthStore } from '@/stores/auth-store';
import { useWishlistStore } from '@/stores/wishlist-store';
import { SocialSignIn } from './SocialSignIn';

interface AuthFormProps {
  mode: 'login' | 'register';
}

type AuthField = 'fullName' | 'email' | 'phone' | 'password' | 'confirmPassword';

interface AuthFormError {
  message: string;
  fields: AuthField[];
}

export function AuthForm({ mode }: AuthFormProps) {
  const t = useTranslations('auth');
  const activeLocale = useLocale();
  const locale: 'pl' | 'en' = activeLocale === 'en' ? 'en' : 'pl';
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = safeReturnPath(searchParams.get('returnTo'));
  const initialized = useAuthStore((state) => state.initialized);
  const session = useAuthStore((state) => state.session);
  const isSubmitting = useAuthStore((state) => state.isSubmitting);
  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<AuthFormError | null>(null);
  const fullNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (initialized && session.status === 'authenticated') {
      router.replace(returnTo);
    }
  }, [initialized, returnTo, router, session.status]);

  useEffect(() => {
    if (!error) return;

    const fieldRefs: Record<AuthField, RefObject<HTMLInputElement | null>> = {
      fullName: fullNameRef,
      email: emailRef,
      phone: phoneRef,
      password: passwordRef,
      confirmPassword: confirmPasswordRef,
    };
    const firstInvalidField = error.fields[0];
    const focusTarget = firstInvalidField ? fieldRefs[firstInvalidField].current : errorRef.current;
    focusTarget?.focus();
  }, [error]);

  function showError(message: string, fields: AuthField[] = []) {
    setError({ message, fields });
  }

  function clearFieldError(field: AuthField) {
    setError((current) => current?.fields.includes(field) ? null : current);
  }

  function hasFieldError(field: AuthField): boolean {
    return error?.fields.includes(field) ?? false;
  }

  function describedBy(field: AuthField, helperId?: string): string | undefined {
    const ids = [helperId, hasFieldError(field) ? 'auth-form-error' : null].filter(Boolean);
    return ids.length > 0 ? ids.join(' ') : undefined;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (mode === 'register' && !trimmedName) {
      showError(t('fullNameRequired'), ['fullName']);
      return;
    }

    if (!trimmedEmail) {
      showError(t('emailRequired'), ['email']);
      return;
    }

    if (mode === 'register' && !isValidOptionalPhoneNumber(trimmedPhone)) {
      showError(t('phoneInvalid'), ['phone']);
      return;
    }

    if (!password) {
      showError(t('passwordRequired'), ['password']);
      return;
    }

    if (password.length < 8) {
      showError(t('passwordMin'), ['password']);
      return;
    }

    if (mode === 'register' && password !== confirmPassword) {
      showError(t('passwordMismatch'), ['confirmPassword']);
      return;
    }

    const guestSnapshot = [...useWishlistStore.getState().guestItems];
    const result = mode === 'login'
      ? await login({ email: trimmedEmail, password })
      : await register({
          fullName: trimmedName,
          email: trimmedEmail,
          password,
          phone: trimmedPhone || undefined,
          locale,
        });

    if (!result.success) {
      const message = mode === 'login' ? t('loginFailed') : t('registerFailed');
      showError(message, mode === 'login' ? ['email', 'password'] : []);
      return;
    }

    await useWishlistStore.getState().syncGuestWishlist(guestSnapshot);
    await useWishlistStore.getState().loadWishlist();

    toast.success(mode === 'login' ? t('loginSuccess') : t('registerSuccess'));
    router.replace(returnTo);
  }

  const isLogin = mode === 'login';

  return (
    <div className="container-grocery py-10 md:py-16">
      <div className="mx-auto max-w-md">
        <div
          className="rounded-[28px] border p-6 md:p-8 shadow-sm"
          style={{
            borderColor: 'var(--color-border)',
            background:
              'linear-gradient(180deg, color-mix(in srgb, var(--color-card) 92%, white) 0%, var(--color-card) 100%)',
          }}
        >
          <div className="mb-6">
            <p
              className="text-xs font-semibold uppercase tracking-[0.24em] mb-2"
              style={{ color: 'var(--color-primary)' }}
            >
              {isLogin ? t('eyebrowLogin') : t('eyebrowRegister')}
            </p>
            <h1 className="heading-display text-2xl md:text-3xl" style={{ color: 'var(--color-foreground)' }}>
              {isLogin ? t('loginTitle') : t('registerTitle')}
            </h1>
            <p className="text-sm mt-2" style={{ color: 'var(--color-muted-foreground)' }}>
              {isLogin ? t('loginSubtitle') : t('registerSubtitle')}
            </p>
          </div>

          <SocialSignIn mode={mode} returnTo={returnTo} />

          <p className="mb-5 text-center text-xs leading-relaxed" style={{ color: 'var(--color-muted-foreground)' }}>
            {t('legalNoticePrefix')}{' '}
            <Link
              href="/terms"
              className="font-semibold underline underline-offset-4"
              style={{ color: 'var(--color-foreground)' }}
            >
              {t('legalNoticeTerms')}
            </Link>{' '}
            {t('legalNoticeConnector')}{' '}
            <Link
              href="/privacy"
              className="font-semibold underline underline-offset-4"
              style={{ color: 'var(--color-foreground)' }}
            >
              {t('legalNoticePrivacy')}
            </Link>
            .
          </p>

          <form method="post" className="space-y-4" onSubmit={handleSubmit} aria-busy={isSubmitting}>
            {!isLogin && (
              <label className="block">
                <span className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-foreground)' }}>
                  {t('fullName')} <span style={{ color: 'var(--color-destructive)' }} aria-hidden="true">*</span>
                </span>
                <div
                  className="flex items-center gap-3 rounded-2xl border px-4 h-12"
                  style={{
                    borderColor: hasFieldError('fullName') ? 'var(--color-destructive)' : 'var(--color-border)',
                    backgroundColor: 'var(--color-background)',
                  }}
                >
                  <UserRound className="w-4 h-4 shrink-0" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
                  <input
                    id="auth-full-name"
                    ref={fullNameRef}
                    name="fullName"
                    type="text"
                    value={fullName}
                    onChange={(event) => {
                      setFullName(event.target.value);
                      clearFieldError('fullName');
                    }}
                    autoComplete="name"
                    aria-required="true"
                    aria-invalid={hasFieldError('fullName') || undefined}
                    aria-describedby={describedBy('fullName')}
                    className="w-full bg-transparent outline-none text-sm"
                    style={{ color: 'var(--color-foreground)' }}
                    placeholder={t('fullNamePlaceholder')}
                    maxLength={100}
                  />
                </div>
              </label>
            )}

            <label className="block">
              <span className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-foreground)' }}>
                {t('email')} <span style={{ color: 'var(--color-destructive)' }} aria-hidden="true">*</span>
              </span>
              <div
                className="flex items-center gap-3 rounded-2xl border px-4 h-12"
                style={{
                  borderColor: hasFieldError('email') ? 'var(--color-destructive)' : 'var(--color-border)',
                  backgroundColor: 'var(--color-background)',
                }}
              >
                <Mail className="w-4 h-4 shrink-0" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
                <input
                  id="auth-email"
                  ref={emailRef}
                  name="email"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    clearFieldError('email');
                  }}
                  autoComplete="email"
                  aria-required="true"
                  aria-invalid={hasFieldError('email') || undefined}
                  aria-describedby={describedBy('email')}
                  className="w-full bg-transparent outline-none text-sm"
                  style={{ color: 'var(--color-foreground)' }}
                  placeholder={t('emailPlaceholder')}
                  maxLength={254}
                />
              </div>
            </label>

            {!isLogin && (
              <label className="block">
                <span className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-foreground)' }}>
                  {t('phone')}{' '}
                  <span className="font-normal" style={{ color: 'var(--color-muted-foreground)' }}>
                    ({t('optional')})
                  </span>
                </span>
                <div
                  className="flex items-center gap-3 rounded-2xl border px-4 h-12"
                  style={{
                    borderColor: hasFieldError('phone') ? 'var(--color-destructive)' : 'var(--color-border)',
                    backgroundColor: 'var(--color-background)',
                  }}
                >
                  <Phone className="w-4 h-4 shrink-0" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
                  <input
                    id="auth-phone"
                    ref={phoneRef}
                    name="phone"
                    type="tel"
                    value={phone}
                    onChange={(event) => {
                      setPhone(event.target.value);
                      clearFieldError('phone');
                    }}
                    autoComplete="tel"
                    inputMode="tel"
                    aria-invalid={hasFieldError('phone') || undefined}
                    aria-describedby={describedBy('phone')}
                    className="w-full bg-transparent outline-none text-sm"
                    style={{ color: 'var(--color-foreground)' }}
                    placeholder={t('phonePlaceholder')}
                    maxLength={20}
                  />
                </div>
              </label>
            )}

            <label className="block">
              <span className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-foreground)' }}>
                {t('password')} <span style={{ color: 'var(--color-destructive)' }} aria-hidden="true">*</span>
              </span>
              <div
                className="flex items-center gap-3 rounded-2xl border px-4 h-12"
                style={{
                  borderColor: hasFieldError('password') ? 'var(--color-destructive)' : 'var(--color-border)',
                  backgroundColor: 'var(--color-background)',
                }}
              >
                <Lock className="w-4 h-4 shrink-0" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
                <input
                  id={isLogin ? 'auth-login-password' : 'auth-register-password'}
                  ref={passwordRef}
                  name="password"
                  type="password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    clearFieldError('password');
                  }}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  aria-required="true"
                  aria-invalid={hasFieldError('password') || undefined}
                  aria-describedby={describedBy('password', 'auth-password-hint')}
                  className="w-full bg-transparent outline-none text-sm"
                  style={{ color: 'var(--color-foreground)' }}
                  placeholder={t('passwordPlaceholder')}
                  maxLength={72}
                />
              </div>
            </label>

            {isLogin && (
              <div className="flex justify-end">
                <Link
                  href={`/forgot-password?returnTo=${encodeURIComponent(returnTo)}`}
                  className="text-sm font-semibold transition-opacity hover:opacity-80"
                  style={{ color: 'var(--color-primary)' }}
                >
                  {t('forgotPasswordLink')}
                </Link>
              </div>
            )}

            {!isLogin && (
              <label className="block">
                <span className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-foreground)' }}>
                  {t('confirmPassword')} <span style={{ color: 'var(--color-destructive)' }} aria-hidden="true">*</span>
                </span>
                <div
                  className="flex items-center gap-3 rounded-2xl border px-4 h-12"
                  style={{
                    borderColor: hasFieldError('confirmPassword') ? 'var(--color-destructive)' : 'var(--color-border)',
                    backgroundColor: 'var(--color-background)',
                  }}
                >
                  <Lock className="w-4 h-4 shrink-0" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
                  <input
                    id="auth-confirm-password"
                    ref={confirmPasswordRef}
                    name="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => {
                      setConfirmPassword(event.target.value);
                      clearFieldError('confirmPassword');
                    }}
                    autoComplete="new-password"
                    aria-required="true"
                    aria-invalid={hasFieldError('confirmPassword') || undefined}
                    aria-describedby={describedBy('confirmPassword')}
                    className="w-full bg-transparent outline-none text-sm"
                    style={{ color: 'var(--color-foreground)' }}
                    placeholder={t('confirmPasswordPlaceholder')}
                    maxLength={72}
                  />
                </div>
              </label>
            )}

            {error && (
              <p
                id="auth-form-error"
                ref={errorRef}
                className="rounded-xl border px-3 py-2 text-sm font-medium outline-none"
                style={{
                  borderColor: 'color-mix(in srgb, var(--color-destructive) 35%, var(--color-border))',
                  backgroundColor: 'color-mix(in srgb, var(--color-destructive) 7%, var(--color-card))',
                  color: 'var(--color-destructive)',
                }}
                role="alert"
                tabIndex={-1}
              >
                {error.message}
              </p>
            )}

            <p id="auth-password-hint" className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
              {t('passwordHint')}
            </p>

            <button
              type="submit"
              disabled={isSubmitting}
              className="checkout-btn w-full h-12 rounded-2xl font-semibold text-white flex items-center justify-center gap-2 transition-all duration-fast disabled:opacity-60 active:scale-[0.98]"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              <span>{isSubmitting ? t('submitting') : isLogin ? t('loginButton') : t('registerButton')}</span>
              {!isSubmitting && <ArrowRight className="w-4 h-4" aria-hidden="true" />}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t text-sm" style={{ borderColor: 'var(--color-border)' }}>
            <span style={{ color: 'var(--color-muted-foreground)' }}>
              {isLogin ? t('switchToRegisterPrompt') : t('switchToLoginPrompt')}
            </span>{' '}
            <Link
              href={`${isLogin ? '/register' : '/login'}?returnTo=${encodeURIComponent(returnTo)}`}
              className="font-semibold transition-opacity hover:opacity-80"
              style={{ color: 'var(--color-primary)' }}
            >
              {isLogin ? t('switchToRegisterAction') : t('switchToLoginAction')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
