'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Loader2 } from 'lucide-react';

import { usePathname, useRouter } from '@/i18n/navigation';
import { safeReturnPath } from '@/lib/auth/safe-return-path';
import { useAuthStore } from '@/stores/auth-store';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const initialized = useAuthStore((state) => state.initialized);
  const status = useAuthStore((state) => state.session.status);
  const initialize = useAuthStore((state) => state.initialize);
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (!initialized || status !== 'guest') return;

    const query = searchParams.toString();
    const hash = window.location.hash;
    const requestedPath = `${pathname}${query ? `?${query}` : ''}${hash}`;
    const returnTo = safeReturnPath(requestedPath, '/account');
    router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  }, [initialized, pathname, router, searchParams, status]);

  if (!initialized || status === 'loading') {
    return (
      <div className="container-grocery flex justify-center py-16" role="status" aria-live="polite">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
        <span className="sr-only">Loading</span>
      </div>
    );
  }

  if (status === 'unavailable') {
    return (
      <div className="container-grocery py-16 text-center" role="alert">
        <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          {locale === 'pl'
            ? 'Nie udało się teraz sprawdzić sesji. Twoje logowanie nie zostało usunięte.'
            : 'We could not verify your session right now. Your sign-in has not been cleared.'}
        </p>
        <button
          type="button"
          onClick={() => void initialize()}
          className="mt-4 rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          {locale === 'pl' ? 'Spróbuj ponownie' : 'Try again'}
        </button>
      </div>
    );
  }

  if (status !== 'authenticated') return null;
  return children;
}
