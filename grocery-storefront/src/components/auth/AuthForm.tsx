'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { UserRound, Mail, Phone, Lock, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Link, useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useWishlistStore } from '@/stores/wishlist-store';

interface AuthFormProps {
  mode: 'login' | 'register';
}

export function AuthForm({ mode }: AuthFormProps) {
  const t = useTranslations('auth');
  const router = useRouter();
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialized && session.status === 'authenticated') {
      router.replace('/wishlist');
    }
  }, [initialized, router, session.status]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (mode === 'register' && !trimmedName) {
      setError(t('fullNameRequired'));
      return;
    }

    if (!trimmedEmail) {
      setError(t('emailRequired'));
      return;
    }

    if (!password) {
      setError(t('passwordRequired'));
      return;
    }

    if (password.length < 8) {
      setError(t('passwordMin'));
      return;
    }

    if (mode === 'register' && password !== confirmPassword) {
      setError(t('passwordMismatch'));
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
        });

    if (!result.success) {
      const message = mode === 'login' ? t('loginFailed') : t('registerFailed');
      setError(message);
      return;
    }

    await useWishlistStore.getState().syncGuestWishlist(guestSnapshot);
    await useWishlistStore.getState().loadWishlist();

    toast.success(mode === 'login' ? t('loginSuccess') : t('registerSuccess'));
    router.replace('/wishlist');
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

          <form className="space-y-4" onSubmit={handleSubmit}>
            {!isLogin && (
              <label className="block">
                <span className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-foreground)' }}>
                  {t('fullName')} <span style={{ color: 'var(--color-destructive)' }} aria-hidden="true">*</span>
                </span>
                <div
                  className="flex items-center gap-3 rounded-2xl border px-4 h-12"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)' }}
                >
                  <UserRound className="w-4 h-4 shrink-0" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
                  <input
                    id="auth-full-name"
                    name="fullName"
                    type="text"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    autoComplete="name"
                    className="w-full bg-transparent outline-none text-sm"
                    style={{ color: 'var(--color-foreground)' }}
                    placeholder={t('fullNamePlaceholder')}
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
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)' }}
              >
                <Mail className="w-4 h-4 shrink-0" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
                <input
                  id="auth-email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  className="w-full bg-transparent outline-none text-sm"
                  style={{ color: 'var(--color-foreground)' }}
                  placeholder={t('emailPlaceholder')}
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
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)' }}
                >
                  <Phone className="w-4 h-4 shrink-0" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
                  <input
                    id="auth-phone"
                    name="phone"
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    autoComplete="tel"
                    inputMode="tel"
                    className="w-full bg-transparent outline-none text-sm"
                    style={{ color: 'var(--color-foreground)' }}
                    placeholder={t('phonePlaceholder')}
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
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)' }}
              >
                <Lock className="w-4 h-4 shrink-0" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
                <input
                  id={isLogin ? 'auth-login-password' : 'auth-register-password'}
                  name="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  className="w-full bg-transparent outline-none text-sm"
                  style={{ color: 'var(--color-foreground)' }}
                  placeholder={t('passwordPlaceholder')}
                />
              </div>
            </label>

            {!isLogin && (
              <label className="block">
                <span className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-foreground)' }}>
                  {t('confirmPassword')} <span style={{ color: 'var(--color-destructive)' }} aria-hidden="true">*</span>
                </span>
                <div
                  className="flex items-center gap-3 rounded-2xl border px-4 h-12"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)' }}
                >
                  <Lock className="w-4 h-4 shrink-0" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
                  <input
                    id="auth-confirm-password"
                    name="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    className="w-full bg-transparent outline-none text-sm"
                    style={{ color: 'var(--color-foreground)' }}
                    placeholder={t('confirmPasswordPlaceholder')}
                  />
                </div>
              </label>
            )}

            <p className="text-xs" style={{ color: error ? 'var(--color-destructive)' : 'var(--color-muted-foreground)' }}>
              {error ?? t('passwordHint')}
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
              href={isLogin ? '/register' : '/login'}
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
