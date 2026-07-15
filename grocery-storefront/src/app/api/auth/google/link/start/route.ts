import { NextRequest, NextResponse } from 'next/server';

import {
  createGoogleOAuthNonce,
  GOOGLE_LINK_NONCE_COOKIE_NAME,
  GOOGLE_OAUTH_NONCE_MAX_AGE_SECONDS,
  hasCustomerAuthBffSecret,
  normalizeCustomerAuthGraphqlUrl,
  normalizeGoogleClientId,
} from '@/lib/auth/google-oauth';
import { validateSameOriginRequest } from '@/lib/auth/request-security';
import { readCustomerTokens, setNoStoreHeaders } from '@/lib/auth/server-cookies';

function setLinkNonceCookie(response: NextResponse, nonce: string): void {
  response.cookies.set(GOOGLE_LINK_NONCE_COOKIE_NAME, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth/google/link',
    maxAge: GOOGLE_OAUTH_NONCE_MAX_AGE_SECONDS,
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

  const clientId = normalizeGoogleClientId(process.env.CUSTOMER_GOOGLE_CLIENT_ID);
  if (
    !clientId
    || !hasCustomerAuthBffSecret(process.env.CUSTOMER_AUTH_BFF_SECRET)
    || !normalizeCustomerAuthGraphqlUrl(process.env.CUSTOMER_AUTH_GRAPHQL_URL)
  ) {
    return setNoStoreHeaders(NextResponse.json({ enabled: false }));
  }

  const nonce = createGoogleOAuthNonce();
  const response = NextResponse.json({ enabled: true, clientId, nonce });
  setLinkNonceCookie(response, nonce);
  return setNoStoreHeaders(response);
}
