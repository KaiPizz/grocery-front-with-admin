import { NextRequest, NextResponse } from 'next/server';

import { validateJsonMutationRequest } from '@/lib/auth/request-security';
import { setNoStoreHeaders } from '@/lib/auth/server-cookies';
import {
  clearProviderStepUpCookie,
  readProviderStepUpProof,
} from '@/lib/auth/provider-step-up';
import { runRevokingCustomerAction } from '@/lib/auth/server-revoking-action';
import { unlinkCustomerLoginProvider } from '@/lib/auth/server-service';

type SocialLoginProvider = 'google' | 'facebook';

function isSocialLoginProvider(value: unknown): value is SocialLoginProvider {
  return value === 'google' || value === 'facebook';
}

function invalidRequestResponse(message: string, status: number): NextResponse {
  const response = NextResponse.json(
    { success: false, message },
    { status },
  );
  clearProviderStepUpCookie(response);
  return setNoStoreHeaders(response);
}

export async function POST(request: NextRequest) {
  const rejection = validateJsonMutationRequest(request);
  if (rejection) return invalidRequestResponse(rejection, 403);

  try {
    const body = await request.json() as unknown;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return invalidRequestResponse('Invalid provider disconnection request.', 400);
    }
    const input = body as Record<string, unknown>;
    const keys = Object.keys(input).sort();
    const provider = input.provider;
    const stepUpProof = readProviderStepUpProof(request);
    if (
      keys.length !== 1
      || keys[0] !== 'provider'
      || !isSocialLoginProvider(provider)
      || !stepUpProof
    ) {
      return invalidRequestResponse(
        stepUpProof
          ? 'Invalid provider disconnection request.'
          : 'Password confirmation has expired.',
        stepUpProof ? 400 : 428,
      );
    }

    const response = await runRevokingCustomerAction(
      request,
      (accessToken) => unlinkCustomerLoginProvider(
        accessToken,
        provider,
        stepUpProof,
      ),
      {
        failed: 'Provider disconnection failed.',
        conflict: 'This sign-in method cannot be disconnected.',
        rateLimited: 'Please wait before trying to disconnect this provider again.',
        unavailable: 'Provider disconnection is temporarily unavailable.',
      },
    );
    clearProviderStepUpCookie(response);
    return response;
  } catch {
    return invalidRequestResponse('Provider disconnection is temporarily unavailable.', 502);
  }
}
