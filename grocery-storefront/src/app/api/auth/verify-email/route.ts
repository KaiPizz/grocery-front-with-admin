import { NextRequest, NextResponse } from 'next/server';

import { clearCustomerCookies, setNoStoreHeaders } from '@/lib/auth/server-cookies';
import { validateJsonMutationRequest } from '@/lib/auth/request-security';
import { verifyCustomerEmail } from '@/lib/auth/server-service';

export async function POST(request: NextRequest) {
  const rejection = validateJsonMutationRequest(request);
  if (rejection) {
    return setNoStoreHeaders(NextResponse.json(
      { success: false, message: rejection },
      { status: 403 },
    ));
  }

  try {
    const body = await request.json() as { token?: unknown };
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    if (!token || token.length > 512) {
      return setNoStoreHeaders(NextResponse.json(
        { success: false, message: 'Invalid verification request.' },
        { status: 400 },
      ));
    }

    const result = await verifyCustomerEmail(token);
    if (!result.payload?.success) {
      return setNoStoreHeaders(NextResponse.json(
        { success: false, message: 'Email verification failed.' },
        { status: result.status >= 500 || !result.payload ? 502 : 400 },
      ));
    }

    const response = NextResponse.json({
      success: true,
      message: null,
      requiresPasswordReset: result.payload.requiresPasswordReset === true,
    });
    // Verification can revoke sessions when untrusted social credentials are
    // detached. Never retain stale customer or step-up cookies in that case.
    clearCustomerCookies(response);
    return setNoStoreHeaders(response);
  } catch {
    return setNoStoreHeaders(NextResponse.json(
      { success: false, message: 'Email verification failed.' },
      { status: 502 },
    ));
  }
}
