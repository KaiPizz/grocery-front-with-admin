import { NextRequest, NextResponse } from 'next/server';

import {
  consumeFacebookOAuthState,
  FACEBOOK_OAUTH_STATE_COOKIE_NAME,
  normalizeFacebookAppId,
  normalizeFacebookGraphVersion,
} from '@/lib/auth/facebook-oauth';
import {
  hasCustomerAuthBffSecret,
  normalizeCustomerAuthGraphqlUrl,
} from '@/lib/auth/google-oauth';
import { validateJsonMutationRequest } from '@/lib/auth/request-security';
import {
  clearLegacyCookies,
  setCustomerCookies,
  setNoStoreHeaders,
} from '@/lib/auth/server-cookies';
import { facebookLoginCustomer } from '@/lib/auth/server-service';

const MAX_FACEBOOK_ACCESS_TOKEN_LENGTH = 4096;

function normalizeLocale(value: unknown): 'pl' | 'en' {
  return value === 'en' ? 'en' : 'pl';
}

function consumeFacebookStateCookie(response: NextResponse): void {
  response.cookies.set(FACEBOOK_OAUTH_STATE_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth/facebook',
    maxAge: 0,
    expires: new Date(0),
  });
}

function respond(
  body: { success: boolean; message: string; customer: unknown; errors: never[] },
  status: number,
): NextResponse {
  const response = NextResponse.json(body, { status });
  consumeFacebookStateCookie(response);
  return setNoStoreHeaders(response);
}

export async function POST(request: NextRequest) {
  const rejection = validateJsonMutationRequest(request);
  if (rejection) {
    return respond({ success: false, message: rejection, customer: null, errors: [] }, 403);
  }

  if (
    !normalizeFacebookAppId(process.env.CUSTOMER_FACEBOOK_APP_ID)
    || !normalizeFacebookGraphVersion(process.env.CUSTOMER_FACEBOOK_GRAPH_VERSION)
    || !hasCustomerAuthBffSecret(process.env.CUSTOMER_AUTH_BFF_SECRET)
    || !normalizeCustomerAuthGraphqlUrl(process.env.CUSTOMER_AUTH_GRAPHQL_URL)
  ) {
    return respond({ success: false, message: 'Facebook sign-in is unavailable.', customer: null, errors: [] }, 404);
  }

  try {
    const body = await request.json() as {
      accessToken?: unknown;
      locale?: unknown;
      state?: unknown;
    };
    const accessToken = typeof body.accessToken === 'string' ? body.accessToken.trim() : '';
    const locale = normalizeLocale(body.locale);
    const submittedState = typeof body.state === 'string' ? body.state : '';
    const cookieState = request.cookies.get(FACEBOOK_OAUTH_STATE_COOKIE_NAME)?.value ?? '';

    // This same-origin, one-time challenge is the login-CSRF binding for the
    // Facebook JS SDK flow because Facebook access tokens contain no nonce.
    if (!consumeFacebookOAuthState(cookieState, submittedState)) {
      return respond({ success: false, message: 'Facebook sign-in expired.', customer: null, errors: [] }, 400);
    }

    if (!accessToken || accessToken.length > MAX_FACEBOOK_ACCESS_TOKEN_LENGTH) {
      return respond({ success: false, message: 'Facebook sign-in failed.', customer: null, errors: [] }, 400);
    }

    const result = await facebookLoginCustomer({ token: accessToken }, locale);
    const payload = result.payload;
    if (!payload?.success || !payload.accessToken || !payload.customer) {
      return respond(
        { success: false, message: 'Facebook sign-in failed.', customer: null, errors: [] },
        result.status >= 500 ? 502 : 401,
      );
    }

    const response = NextResponse.json({
      success: true,
      message: 'Facebook sign-in succeeded.',
      customer: payload.customer,
      errors: [],
    });
    consumeFacebookStateCookie(response);
    setCustomerCookies(response, payload.accessToken, payload.refreshToken, payload.expiresIn);
    clearLegacyCookies(response);
    return setNoStoreHeaders(response);
  } catch {
    return respond({ success: false, message: 'Facebook sign-in failed.', customer: null, errors: [] }, 400);
  }
}
