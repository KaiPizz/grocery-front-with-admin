import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { locales, defaultLocale } from './i18n/config';

const handleI18nRouting = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
  localeDetection: false,
});

const LEGACY_LOCALES = new Set(['de', 'uk', 'vi', 'ru', 'zh', 'tr']);
const CUSTOMER_COOKIE_NAMES = [
  'grocery_customer_access',
  'grocery_customer_refresh',
  'grocery_token',
  'grocery_refresh_token',
] as const;

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const [, maybeLocale, ...segments] = pathname.split('/');

  if (maybeLocale && LEGACY_LOCALES.has(maybeLocale)) {
    const redirectUrl = new URL(request.url);
    redirectUrl.pathname = `/en${segments.length ? `/${segments.join('/')}` : ''}`;
    return NextResponse.redirect(redirectUrl);
  }

  const hasLocalePrefix = locales.includes(maybeLocale as (typeof locales)[number]);
  const routePath = hasLocalePrefix
    ? `/${segments.join('/')}`
    : pathname;
  const isSecretFragmentRoute = routePath === '/reset-password' || routePath === '/verify-email';

  if (isSecretFragmentRoute && request.nextUrl.searchParams.has('token')) {
    const redirectUrl = new URL(request.url);
    const legacyToken = redirectUrl.searchParams.get('token') ?? '';
    redirectUrl.searchParams.delete('token');
    redirectUrl.hash = legacyToken
      ? new URLSearchParams({ token: legacyToken }).toString()
      : '';
    return NextResponse.redirect(redirectUrl);
  }

  const isAccountRoute = routePath === '/account' || routePath.startsWith('/account/');
  const hasCustomerCookie = CUSTOMER_COOKIE_NAMES.some((name) => request.cookies.has(name));

  if (isAccountRoute && !hasCustomerCookie) {
    const redirectUrl = new URL(request.url);
    redirectUrl.pathname = `${hasLocalePrefix ? `/${maybeLocale}` : ''}/login`;
    redirectUrl.search = '';
    redirectUrl.searchParams.set('returnTo', `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(redirectUrl);
  }

  return handleI18nRouting(request);
}

export const config = {
  matcher: [
    '/((?!api|_next|_vercel|.*\\..*).*)'
  ],
};
