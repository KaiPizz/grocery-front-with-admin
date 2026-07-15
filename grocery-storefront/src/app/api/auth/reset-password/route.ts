import { NextRequest, NextResponse } from 'next/server';

import { clearCustomerCookies, setNoStoreHeaders } from '@/lib/auth/server-cookies';
import { validateJsonMutationRequest } from '@/lib/auth/request-security';
import { resetCustomerPassword } from '@/lib/auth/server-service';

export async function POST(request: NextRequest) {
  const rejection = validateJsonMutationRequest(request);
  if (rejection) {
    return setNoStoreHeaders(NextResponse.json(
      { success: false, message: rejection, errors: [] },
      { status: 403 },
    ));
  }

  try {
    const body = await request.json() as { token?: unknown; newPassword?: unknown };
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';

    if (!token || newPassword.length < 8 || newPassword.length > 72) {
      return setNoStoreHeaders(NextResponse.json(
        { success: false, message: 'Invalid password reset request.', errors: [] },
        { status: 400 },
      ));
    }

    const result = await resetCustomerPassword(token, newPassword);
    const payload = result.payload;

    if (!payload?.success) {
      const unavailable = result.status >= 500 || !payload;
      return setNoStoreHeaders(NextResponse.json({
        success: false,
        message: payload?.message ?? result.error ?? 'Password reset failed.',
        errors: payload?.errors ?? [],
      }, { status: unavailable ? 502 : 400 }));
    }

    const response = NextResponse.json({
      success: true,
      message: payload.message,
      errors: [],
    });
    // The backend revokes every customer session after a successful reset.
    clearCustomerCookies(response);
    return setNoStoreHeaders(response);
  } catch {
    return setNoStoreHeaders(NextResponse.json(
      { success: false, message: 'Password reset failed.', errors: [] },
      { status: 502 },
    ));
  }
}
