import { NextRequest, NextResponse } from 'next/server';

import { requireSameOrigin } from './origin';
import {
  getSessionCookieName,
  sessionMatchesConfiguredAdmin,
  SessionConfigurationError,
  verifySessionToken,
} from './session-token';

function jsonError(status: number, error: string): NextResponse {
  return NextResponse.json(
    { success: false, error },
    { status, headers: { 'Cache-Control': 'no-store' } }
  );
}

/**
 * Authorize an admin API request with the signed, HttpOnly session cookie.
 * Unsafe methods additionally require an exact same-origin request.
 */
export async function requireAdminSession(
  request: NextRequest
): Promise<NextResponse | null> {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const token = request.cookies.get(getSessionCookieName())?.value;
  if (!token) return jsonError(401, 'Unauthorized');

  try {
    const session = await verifySessionToken(token);
    if (!session || !sessionMatchesConfiguredAdmin(session)) {
      return jsonError(401, 'Unauthorized');
    }
    return null;
  } catch (error) {
    if (error instanceof SessionConfigurationError) {
      console.error('[auth] Admin session signing is not configured securely');
      return jsonError(503, 'Authentication service unavailable');
    }
    console.error('[auth] Session verification failed');
    return jsonError(503, 'Authentication service unavailable');
  }
}
