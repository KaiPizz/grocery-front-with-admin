import { NextRequest, NextResponse } from 'next/server';

import {
  FACEBOOK_OAUTH_STATE_COOKIE_NAME,
  FACEBOOK_OAUTH_STATE_MAX_AGE_SECONDS,
  issueFacebookOAuthState,
  normalizeFacebookAppId,
  normalizeFacebookGraphVersion,
} from '@/lib/auth/facebook-oauth';
import {
  hasCustomerAuthBffSecret,
  normalizeCustomerAuthGraphqlUrl,
} from '@/lib/auth/google-oauth';
import { validateSameOriginRequest } from '@/lib/auth/request-security';
import { setNoStoreHeaders } from '@/lib/auth/server-cookies';

function setFacebookStateCookie(response: NextResponse, state: string): void {
  response.cookies.set(FACEBOOK_OAUTH_STATE_COOKIE_NAME, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth/facebook',
    maxAge: FACEBOOK_OAUTH_STATE_MAX_AGE_SECONDS,
  });
}

export async function GET(request: NextRequest) {
  const rejection = validateSameOriginRequest(request);
  if (rejection) {
    return setNoStoreHeaders(NextResponse.json(
      { enabled: false },
      { status: 403 },
    ));
  }

  const appId = normalizeFacebookAppId(process.env.CUSTOMER_FACEBOOK_APP_ID);
  const apiVersion = normalizeFacebookGraphVersion(
    process.env.CUSTOMER_FACEBOOK_GRAPH_VERSION,
  );
  if (
    !appId
    || !apiVersion
    || !hasCustomerAuthBffSecret(process.env.CUSTOMER_AUTH_BFF_SECRET)
    || !normalizeCustomerAuthGraphqlUrl(process.env.CUSTOMER_AUTH_GRAPHQL_URL)
  ) {
    return setNoStoreHeaders(NextResponse.json({ enabled: false }));
  }

  const state = issueFacebookOAuthState('login');
  if (!state) {
    return setNoStoreHeaders(NextResponse.json({ enabled: false }, { status: 503 }));
  }
  const response = NextResponse.json({
    enabled: true,
    appId,
    apiVersion,
    state,
  });
  setFacebookStateCookie(response, state);
  return setNoStoreHeaders(response);
}
