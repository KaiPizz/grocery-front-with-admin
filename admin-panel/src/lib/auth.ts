import { NextRequest, NextResponse } from 'next/server';

import { getAdminAuthState, type AdminAuthState } from './admin-auth-state';
import { requireSameOrigin } from './origin';
import {
  type AdminSession,
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
export type AdminAuthenticationResult =
  | {
      authenticated: true;
      session: AdminSession;
      token: string;
      authState: AdminAuthState;
    }
  | { authenticated: false; response: NextResponse };

export async function authenticateAdminSession(
  request: NextRequest
): Promise<AdminAuthenticationResult> {
  const originError = requireSameOrigin(request);
  if (originError) return { authenticated: false, response: originError };

  const token = request.cookies.get(getSessionCookieName())?.value;
  if (!token) {
    return { authenticated: false, response: jsonError(401, 'Unauthorized') };
  }

  try {
    const authState = await getAdminAuthState();
    const session = await verifySessionToken(token, { authState });
    if (!session || !sessionMatchesConfiguredAdmin(session)) {
      return { authenticated: false, response: jsonError(401, 'Unauthorized') };
    }
    return { authenticated: true, session, token, authState };
  } catch (error) {
    if (error instanceof SessionConfigurationError) {
      console.error('[auth] Admin session signing is not configured securely');
      return {
        authenticated: false,
        response: jsonError(503, 'Authentication service unavailable'),
      };
    }
    console.error('[auth] Session verification failed');
    return {
      authenticated: false,
      response: jsonError(503, 'Authentication service unavailable'),
    };
  }
}

export async function requireAdminSession(
  request: NextRequest
): Promise<NextResponse | null> {
  const result = await authenticateAdminSession(request);
  return result.authenticated ? null : result.response;
}
