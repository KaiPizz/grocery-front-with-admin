import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'admin-session';

async function hmacSha256(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function verifyToken(token: string): Promise<boolean> {
  const secret = process.env.ADMIN_SESSION_SECRET || 'fallback-dev-secret';
  const colonIndex = token.indexOf(':');
  if (colonIndex === -1) return false;
  const username = token.substring(0, colonIndex);
  const expectedHash = await hmacSha256(secret, username);
  const expected = `${username}:${expectedHash}`;
  return token === expected;
}

export async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get(COOKIE_NAME)?.value;

  if (!sessionCookie || !(await verifyToken(sessionCookie))) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
