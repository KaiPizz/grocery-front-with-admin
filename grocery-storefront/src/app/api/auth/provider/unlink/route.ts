import { NextRequest, NextResponse } from 'next/server';

import { validateJsonMutationRequest } from '@/lib/auth/request-security';
import { setNoStoreHeaders } from '@/lib/auth/server-cookies';
import { runRevokingCustomerAction } from '@/lib/auth/server-revoking-action';
import { unlinkCustomerLoginProvider } from '@/lib/auth/server-service';

type SocialLoginProvider = 'google' | 'facebook';

function isSocialLoginProvider(value: unknown): value is SocialLoginProvider {
  return value === 'google' || value === 'facebook';
}

function validPassword(value: string): boolean {
  return value.length > 0
    && value.length <= 72
    && Buffer.byteLength(value, 'utf8') <= 72;
}

function invalidRequestResponse(message: string, status: number): NextResponse {
  return setNoStoreHeaders(NextResponse.json(
    { success: false, message },
    { status },
  ));
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
    const currentPassword = typeof input.currentPassword === 'string' ? input.currentPassword : '';
    const provider = input.provider;
    if (
      keys.length !== 2
      || keys[0] !== 'currentPassword'
      || keys[1] !== 'provider'
      || !isSocialLoginProvider(provider)
      || !validPassword(currentPassword)
    ) {
      return invalidRequestResponse('Invalid provider disconnection request.', 400);
    }

    return runRevokingCustomerAction(
      request,
      (accessToken) => unlinkCustomerLoginProvider(
        accessToken,
        provider,
        currentPassword,
      ),
      {
        failed: 'Provider disconnection failed.',
        conflict: 'This sign-in method cannot be disconnected.',
        rateLimited: 'Please wait before trying to disconnect this provider again.',
        unavailable: 'Provider disconnection is temporarily unavailable.',
      },
    );
  } catch {
    return invalidRequestResponse('Provider disconnection is temporarily unavailable.', 502);
  }
}
