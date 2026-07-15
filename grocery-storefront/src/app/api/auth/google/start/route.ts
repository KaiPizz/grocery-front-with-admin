import { NextRequest, NextResponse } from 'next/server';

import {
  GOOGLE_OAUTH_NONCE_COOKIE_NAME,
  GOOGLE_OAUTH_NONCE_MAX_AGE_SECONDS,
  hasCustomerAuthBffSecret,
  issueGoogleOAuthNonce,
  normalizeCustomerAuthGraphqlUrl,
  normalizeGoogleClientId,
} from '@/lib/auth/google-oauth';
import { validateSameOriginRequest } from '@/lib/auth/request-security';
import { setNoStoreHeaders } from '@/lib/auth/server-cookies';

function setGoogleNonceCookie(response: NextResponse, nonce: string): void {
  response.cookies.set(GOOGLE_OAUTH_NONCE_COOKIE_NAME, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth/google',
    maxAge: GOOGLE_OAUTH_NONCE_MAX_AGE_SECONDS,
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

  const clientId = normalizeGoogleClientId(process.env.CUSTOMER_GOOGLE_CLIENT_ID);
  if (
    !clientId
    || !hasCustomerAuthBffSecret(process.env.CUSTOMER_AUTH_BFF_SECRET)
    || !normalizeCustomerAuthGraphqlUrl(process.env.CUSTOMER_AUTH_GRAPHQL_URL)
  ) {
    return setNoStoreHeaders(NextResponse.json({ enabled: false }));
  }

  const nonce = issueGoogleOAuthNonce('login');
  if (!nonce) {
    return setNoStoreHeaders(NextResponse.json({ enabled: false }, { status: 503 }));
  }
  const response = NextResponse.json({ enabled: true, clientId, nonce });
  setGoogleNonceCookie(response, nonce);
  return setNoStoreHeaders(response);
}
