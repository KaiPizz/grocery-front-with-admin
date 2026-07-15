import { NextRequest, NextResponse } from 'next/server';

import {
  GOOGLE_OAUTH_NONCE_COOKIE_NAME,
  hasCustomerAuthBffSecret,
  normalizeCustomerAuthGraphqlUrl,
  normalizeGoogleClientId,
} from '@/lib/auth/google-oauth';
import { validateJsonMutationRequest } from '@/lib/auth/request-security';
import {
  clearLegacyCookies,
  setCustomerCookies,
  setNoStoreHeaders,
} from '@/lib/auth/server-cookies';
import { googleLoginCustomer } from '@/lib/auth/server-service';

const MAX_GOOGLE_CREDENTIAL_LENGTH = 4096;

function consumeGoogleNonce(response: NextResponse): void {
  response.cookies.set(GOOGLE_OAUTH_NONCE_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth/google',
    maxAge: 0,
    expires: new Date(0),
  });
}

function respond(
  body: { success: boolean; message: string; customer: unknown; errors: never[] },
  status: number,
): NextResponse {
  const response = NextResponse.json(body, { status });
  consumeGoogleNonce(response);
  return setNoStoreHeaders(response);
}

export async function POST(request: NextRequest) {
  const rejection = validateJsonMutationRequest(request);
  if (rejection) {
    return respond({ success: false, message: rejection, customer: null, errors: [] }, 403);
  }

  if (
    !normalizeGoogleClientId(process.env.CUSTOMER_GOOGLE_CLIENT_ID)
    || !hasCustomerAuthBffSecret(process.env.CUSTOMER_AUTH_BFF_SECRET)
    || !normalizeCustomerAuthGraphqlUrl(process.env.CUSTOMER_AUTH_GRAPHQL_URL)
  ) {
    return respond({ success: false, message: 'Google sign-in is unavailable.', customer: null, errors: [] }, 404);
  }

  const nonce = request.cookies.get(GOOGLE_OAUTH_NONCE_COOKIE_NAME)?.value ?? '';
  if (!/^[A-Za-z0-9_-]{43}$/.test(nonce)) {
    return respond({ success: false, message: 'Google sign-in expired.', customer: null, errors: [] }, 400);
  }

  try {
    const body = await request.json() as { credential?: unknown };
    const credential = typeof body.credential === 'string' ? body.credential.trim() : '';
    if (!credential || credential.length > MAX_GOOGLE_CREDENTIAL_LENGTH) {
      return respond({ success: false, message: 'Google sign-in failed.', customer: null, errors: [] }, 400);
    }

    const result = await googleLoginCustomer({ token: credential, nonce });
    const payload = result.payload;
    if (!payload?.success || !payload.accessToken || !payload.customer) {
      return respond(
        { success: false, message: 'Google sign-in failed.', customer: null, errors: [] },
        result.status >= 500 ? 502 : 401,
      );
    }

    const response = NextResponse.json({
      success: true,
      message: 'Google sign-in succeeded.',
      customer: payload.customer,
      errors: [],
    });
    consumeGoogleNonce(response);
    setCustomerCookies(response, payload.accessToken, payload.refreshToken, payload.expiresIn);
    clearLegacyCookies(response);
    return setNoStoreHeaders(response);
  } catch {
    return respond({ success: false, message: 'Google sign-in failed.', customer: null, errors: [] }, 400);
  }
}
