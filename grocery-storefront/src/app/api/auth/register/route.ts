import { NextRequest, NextResponse } from 'next/server';

import { clearLegacyCookies, setCustomerCookies, setNoStoreHeaders } from '@/lib/auth/server-cookies';
import { validateJsonMutationRequest } from '@/lib/auth/request-security';
import { registerCustomer } from '@/lib/auth/server-service';

export async function POST(request: NextRequest) {
  const rejection = validateJsonMutationRequest(request);
  if (rejection) {
    return setNoStoreHeaders(NextResponse.json({ success: false, message: rejection, errors: [] }, { status: 403 }));
  }

  try {
    const body = await request.json() as Record<string, unknown>;
    const input: Record<string, unknown> = {
      fullName: typeof body.fullName === 'string' ? body.fullName.trim() : '',
      email: typeof body.email === 'string' ? body.email.trim() : '',
      password: typeof body.password === 'string' ? body.password : '',
      locale: body.locale === 'en' ? 'en' : 'pl',
    };
    if (typeof body.phone === 'string' && body.phone.trim()) {
      input.phone = body.phone.trim();
    }

    const result = await registerCustomer(input);
    const payload = result.payload;

    if (!payload?.success || !payload.accessToken || !payload.customer) {
      return setNoStoreHeaders(NextResponse.json({
        success: false,
        message: payload?.message ?? result.error ?? 'Registration failed',
        customer: null,
        errors: payload?.errors ?? [],
      }, { status: result.status >= 500 ? 502 : 400 }));
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
      { success: false, message: 'Registration failed', customer: null, errors: [] },
      { status: 400 },
    ));
  }
}
