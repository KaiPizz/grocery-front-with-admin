import { NextRequest, NextResponse } from 'next/server';

import { clearLegacyCookies, setCustomerCookies, setNoStoreHeaders } from '@/lib/auth/server-cookies';
import { validateJsonMutationRequest } from '@/lib/auth/request-security';
import { loginCustomer } from '@/lib/auth/server-service';

export async function POST(request: NextRequest) {
  const rejection = validateJsonMutationRequest(request);
  if (rejection) {
    return setNoStoreHeaders(NextResponse.json({ success: false, message: rejection, errors: [] }, { status: 403 }));
  }

  try {
    const body = await request.json() as { email?: unknown; password?: unknown };
    const input = {
      email: typeof body.email === 'string' ? body.email.trim() : '',
      password: typeof body.password === 'string' ? body.password : '',
    };
    const result = await loginCustomer(input);
    const payload = result.payload;

    if (!payload?.success || !payload.accessToken || !payload.customer) {
      return setNoStoreHeaders(NextResponse.json({
        success: false,
        message: payload?.message ?? result.error ?? 'Login failed',
        customer: null,
        errors: payload?.errors ?? [],
      }, { status: result.status >= 500 ? 502 : 401 }));
    }

    const response = NextResponse.json({
      success: true,
      message: payload.message,
      customer: payload.customer,
      errors: [],
    });
    setCustomerCookies(response, payload.accessToken, payload.refreshToken, payload.expiresIn);
    clearLegacyCookies(response);
    return setNoStoreHeaders(response);
  } catch {
    return setNoStoreHeaders(NextResponse.json(
      { success: false, message: 'Login failed', customer: null, errors: [] },
      { status: 400 },
    ));
  }
}
