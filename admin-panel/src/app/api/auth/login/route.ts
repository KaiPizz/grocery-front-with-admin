import { NextRequest, NextResponse } from 'next/server';

import {
  clearLoginRateLimit,
  getClientIp,
  reserveLoginAttempt,
} from '@/lib/login-rate-limit';
import { requireSameOrigin } from '@/lib/origin';
import {
  constantTimeStringEqual,
  PasswordConfigurationError,
  verifyConfiguredAdminPassword,
} from '@/lib/password';
import { setSessionCookie } from '@/lib/session';

const MAX_USERNAME_LENGTH = 128;
const MAX_PASSWORD_LENGTH = 1024;

function response(
  status: number,
  error?: string,
  headers: Record<string, string> = {}
): NextResponse {
  return NextResponse.json(
    error ? { success: false, error } : { success: true },
    { status, headers: { 'Cache-Control': 'no-store', ...headers } }
  );
}

function rateLimited(retryAfterSeconds: number): NextResponse {
  return response(429, 'Too many login attempts. Try again later.', {
    'Retry-After': String(retryAfterSeconds),
  });
}

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return response(400, 'Invalid request');
  }

  if (!body || typeof body !== 'object') return response(400, 'Invalid request');
  const { username, password } = body as { username?: unknown; password?: unknown };
  if (
    typeof username !== 'string' ||
    typeof password !== 'string' ||
    username.length < 1 ||
    username.length > MAX_USERNAME_LENGTH ||
    password.length < 1 ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    return response(401, 'Invalid credentials');
  }

  const clientIp = getClientIp(request);
  const reservation = reserveLoginAttempt(clientIp, username);
  if (reservation.limited) return rateLimited(reservation.retryAfterSeconds);

  const configuredUsername = process.env.ADMIN_USERNAME;
  if (
    !configuredUsername ||
    configuredUsername.length > MAX_USERNAME_LENGTH ||
    configuredUsername.trim() !== configuredUsername
  ) {
    console.error('[auth] Admin credentials are not configured securely');
    return response(503, 'Authentication service unavailable');
  }

  let passwordMatches: boolean;
  try {
    passwordMatches = await verifyConfiguredAdminPassword(password);
  } catch (error) {
    if (error instanceof PasswordConfigurationError) {
      console.error('[auth] Admin credentials are not configured securely');
    } else {
      console.error('[auth] Password verification failed');
    }
    return response(503, 'Authentication service unavailable');
  }

  const usernameMatches = constantTimeStringEqual(username, configuredUsername);
  if (!usernameMatches || !passwordMatches) {
    return response(401, 'Invalid credentials');
  }

  clearLoginRateLimit(clientIp, username);

  try {
    await setSessionCookie(configuredUsername);
  } catch {
    console.error('[auth] Session creation failed');
    return response(503, 'Authentication service unavailable');
  }

  return response(200);
}
