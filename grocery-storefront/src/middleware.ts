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

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const [, maybeLocale, ...segments] = pathname.split('/');

  if (maybeLocale && LEGACY_LOCALES.has(maybeLocale)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = `/en${segments.length ? `/${segments.join('/')}` : ''}`;
    return NextResponse.redirect(redirectUrl);
  }

  return handleI18nRouting(request);
}

export const config = {
  matcher: [
    '/((?!api|_next|_vercel|.*\\..*).*)'
  ],
};
