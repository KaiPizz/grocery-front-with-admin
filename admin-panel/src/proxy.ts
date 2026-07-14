import { NextRequest, NextResponse } from 'next/server';

import {
  getSessionCookieName,
  sessionMatchesConfiguredAdmin,
  SessionConfigurationError,
  verifySessionToken,
} from './lib/session-token';

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === '/login') {
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'private, no-store, max-age=0');
    return response;
  }

  const cookieName = getSessionCookieName();
  const sessionCookie = request.cookies.get(cookieName)?.value;

  try {
    if (sessionCookie) {
      const session = await verifySessionToken(sessionCookie);
      if (session && sessionMatchesConfiguredAdmin(session)) {
        return NextResponse.next();
      }
    }
  } catch (error) {
    if (error instanceof SessionConfigurationError) {
      console.error('[auth] Admin session signing is not configured securely');
    } else {
      console.error('[auth] Session verification failed');
    }
    return NextResponse.json(
      { success: false, error: 'Authentication service unavailable' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('from', request.nextUrl.pathname);
  const response = NextResponse.redirect(loginUrl);
  response.headers.set('Cache-Control', 'no-store');
  if (sessionCookie) {
    response.cookies.set(cookieName, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
  }
  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/login'],
};
