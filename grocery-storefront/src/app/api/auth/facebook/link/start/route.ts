import { NextRequest, NextResponse } from 'next/server';

import {
  FACEBOOK_LINK_STATE_COOKIE_NAME,
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
import { readCustomerTokens, setNoStoreHeaders } from '@/lib/auth/server-cookies';
import { readProviderStepUpProof } from '@/lib/auth/provider-step-up';

function setLinkStateCookie(response: NextResponse, state: string): void {
  response.cookies.set(FACEBOOK_LINK_STATE_COOKIE_NAME, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth/facebook/link',
    maxAge: FACEBOOK_OAUTH_STATE_MAX_AGE_SECONDS,
  });
}

export async function GET(request: NextRequest) {
  const rejection = validateSameOriginRequest(request);
  if (rejection) {
    return setNoStoreHeaders(NextResponse.json({ enabled: false }, { status: 403 }));
  }

  const tokens = readCustomerTokens(request);
  if (!tokens.accessToken && !tokens.refreshToken) {
    return setNoStoreHeaders(NextResponse.json({ enabled: false }, { status: 401 }));
  }
  if (!readProviderStepUpProof(request)) {
    return setNoStoreHeaders(NextResponse.json({ enabled: false }, { status: 428 }));
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

  const state = issueFacebookOAuthState('link');
  if (!state) {
    return setNoStoreHeaders(NextResponse.json({ enabled: false }, { status: 503 }));
  }
  const response = NextResponse.json({ enabled: true, appId, apiVersion, state });
  setLinkStateCookie(response, state);
  return setNoStoreHeaders(response);
}
