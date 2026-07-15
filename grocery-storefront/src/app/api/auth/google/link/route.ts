import { NextRequest, NextResponse } from 'next/server';

import {
  consumeGoogleLinkNonce,
  GOOGLE_LINK_NONCE_COOKIE_NAME,
  hasCustomerAuthBffSecret,
  normalizeCustomerAuthGraphqlUrl,
  normalizeGoogleClientId,
} from '@/lib/auth/google-oauth';
import { validateJsonMutationRequest } from '@/lib/auth/request-security';
import { setNoStoreHeaders } from '@/lib/auth/server-cookies';
import {
  clearProviderStepUpCookie,
  readProviderStepUpProof,
} from '@/lib/auth/provider-step-up';
import { runRevokingCustomerAction } from '@/lib/auth/server-revoking-action';
import { linkGoogleCustomer } from '@/lib/auth/server-service';

const MAX_GOOGLE_CREDENTIAL_LENGTH = 4096;

function consumeLinkNonce(response: NextResponse): NextResponse {
  response.cookies.set(GOOGLE_LINK_NONCE_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth/google/link',
    maxAge: 0,
    expires: new Date(0),
  });
  clearProviderStepUpCookie(response);
  return response;
}

function respond(message: string, status: number): NextResponse {
  return consumeLinkNonce(setNoStoreHeaders(NextResponse.json(
    { success: false, message },
    { status },
  )));
}

export async function POST(request: NextRequest) {
  const rejection = validateJsonMutationRequest(request);
  if (rejection) return respond(rejection, 403);

  if (
    !normalizeGoogleClientId(process.env.CUSTOMER_GOOGLE_CLIENT_ID)
    || !hasCustomerAuthBffSecret(process.env.CUSTOMER_AUTH_BFF_SECRET)
    || !normalizeCustomerAuthGraphqlUrl(process.env.CUSTOMER_AUTH_GRAPHQL_URL)
  ) {
    return respond('Google account connection is unavailable.', 404);
  }

  try {
    const body = await request.json() as unknown;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return respond('Invalid Google account connection request.', 400);
    }
    const input = body as Record<string, unknown>;
    const keys = Object.keys(input).sort();
    const credential = typeof input.credential === 'string' ? input.credential.trim() : '';
    const submittedNonce = typeof input.nonce === 'string' ? input.nonce : '';
    const cookieNonce = request.cookies.get(GOOGLE_LINK_NONCE_COOKIE_NAME)?.value ?? '';
    const stepUpProof = readProviderStepUpProof(request);
    const nonceIsValid = consumeGoogleLinkNonce(cookieNonce, submittedNonce);
    if (
      keys.length !== 2
      || keys[0] !== 'credential'
      || keys[1] !== 'nonce'
      || !stepUpProof
      || !nonceIsValid
      || !credential
      || credential.length > MAX_GOOGLE_CREDENTIAL_LENGTH
    ) {
      return respond(
        stepUpProof
          ? 'Invalid Google account connection request.'
          : 'Password confirmation has expired.',
        stepUpProof ? 400 : 428,
      );
    }

    const response = await runRevokingCustomerAction(
      request,
      (accessToken) => linkGoogleCustomer(
        accessToken,
        credential,
        cookieNonce,
        stepUpProof,
      ),
      {
        failed: 'Google account connection failed.',
        conflict: 'This Google account cannot be connected.',
        rateLimited: 'Please wait before trying to connect Google again.',
        unavailable: 'Google account connection is temporarily unavailable.',
      },
    );
    return consumeLinkNonce(response);
  } catch {
    return respond('Google account connection is temporarily unavailable.', 502);
  }
}
