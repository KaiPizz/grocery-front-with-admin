import { NextRequest, NextResponse } from 'next/server';

import {
  consumeFacebookOAuthState,
  FACEBOOK_LINK_STATE_COOKIE_NAME,
  normalizeFacebookAppId,
  normalizeFacebookGraphVersion,
} from '@/lib/auth/facebook-oauth';
import {
  hasCustomerAuthBffSecret,
  normalizeCustomerAuthGraphqlUrl,
} from '@/lib/auth/google-oauth';
import { validateJsonMutationRequest } from '@/lib/auth/request-security';
import { setNoStoreHeaders } from '@/lib/auth/server-cookies';
import {
  clearProviderStepUpCookie,
  readProviderStepUpProof,
} from '@/lib/auth/provider-step-up';
import { runRevokingCustomerAction } from '@/lib/auth/server-revoking-action';
import { linkFacebookCustomer } from '@/lib/auth/server-service';

const MAX_FACEBOOK_ACCESS_TOKEN_LENGTH = 4096;

function consumeLinkState(response: NextResponse): NextResponse {
  response.cookies.set(FACEBOOK_LINK_STATE_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth/facebook/link',
    maxAge: 0,
    expires: new Date(0),
  });
  clearProviderStepUpCookie(response);
  return response;
}

function respond(message: string, status: number): NextResponse {
  return consumeLinkState(setNoStoreHeaders(NextResponse.json(
    { success: false, message },
    { status },
  )));
}

export async function POST(request: NextRequest) {
  const rejection = validateJsonMutationRequest(request);
  if (rejection) return respond(rejection, 403);

  if (
    !normalizeFacebookAppId(process.env.CUSTOMER_FACEBOOK_APP_ID)
    || !normalizeFacebookGraphVersion(process.env.CUSTOMER_FACEBOOK_GRAPH_VERSION)
    || !hasCustomerAuthBffSecret(process.env.CUSTOMER_AUTH_BFF_SECRET)
    || !normalizeCustomerAuthGraphqlUrl(process.env.CUSTOMER_AUTH_GRAPHQL_URL)
  ) {
    return respond('Facebook account connection is unavailable.', 404);
  }

  try {
    const body = await request.json() as unknown;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return respond('Invalid Facebook account connection request.', 400);
    }
    const input = body as Record<string, unknown>;
    const keys = Object.keys(input).sort();
    const accessToken = typeof input.accessToken === 'string' ? input.accessToken.trim() : '';
    const submittedState = typeof input.state === 'string' ? input.state : '';
    const cookieState = request.cookies.get(FACEBOOK_LINK_STATE_COOKIE_NAME)?.value ?? '';
    const stepUpProof = readProviderStepUpProof(request);
    const stateIsValid = consumeFacebookOAuthState('link', cookieState, submittedState);
    if (
      keys.length !== 2
      || keys[0] !== 'accessToken'
      || keys[1] !== 'state'
      || !stepUpProof
      || !stateIsValid
      || !accessToken
      || accessToken.length > MAX_FACEBOOK_ACCESS_TOKEN_LENGTH
    ) {
      return respond(
        stepUpProof
          ? 'Invalid Facebook account connection request.'
          : 'Password confirmation has expired.',
        stepUpProof ? 400 : 428,
      );
    }

    const response = await runRevokingCustomerAction(
      request,
      (customerAccessToken) => linkFacebookCustomer(
        customerAccessToken,
        accessToken,
        stepUpProof,
      ),
      {
        failed: 'Facebook account connection failed.',
        conflict: 'This Facebook account cannot be connected.',
        rateLimited: 'Please wait before trying to connect Facebook again.',
        unavailable: 'Facebook account connection is temporarily unavailable.',
      },
    );
    return consumeLinkState(response);
  } catch {
    return respond('Facebook account connection is temporarily unavailable.', 502);
  }
}
