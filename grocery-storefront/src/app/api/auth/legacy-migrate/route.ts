import { NextRequest, NextResponse } from 'next/server';

import {
  clearCustomerCookies,
  clearLegacyCookies,
  setCustomerCookies,
  setNoStoreHeaders,
} from '@/lib/auth/server-cookies';
import { validateJsonMutationRequest } from '@/lib/auth/request-security';
import {
  isDefinitiveRefreshFailure,
  isRefreshAlreadyRotated,
} from '@/lib/auth/refresh-policy';
import { renewCustomerSessionSingleFlight } from '@/lib/auth/server-refresh';
import { loadCustomerSession } from '@/lib/auth/server-service';

export async function POST(request: NextRequest) {
  const rejection = validateJsonMutationRequest(request);
  if (rejection) {
    return setNoStoreHeaders(NextResponse.json({ success: false }, { status: 403 }));
  }

  try {
    const body = await request.json() as { accessToken?: unknown; refreshToken?: unknown };
    const accessToken = typeof body.accessToken === 'string' ? body.accessToken : null;
    const refreshToken = typeof body.refreshToken === 'string' ? body.refreshToken : null;

    if (refreshToken) {
      const result = await renewCustomerSessionSingleFlight(refreshToken);
      const payload = result.payload;
      if (payload?.success && payload.accessToken) {
        const response = NextResponse.json({ success: true });
        setCustomerCookies(
          response,
          payload.accessToken,
          payload.refreshToken ?? refreshToken,
          payload.expiresIn,
        );
        clearLegacyCookies(response);
        return setNoStoreHeaders(response);
      }
      if (isRefreshAlreadyRotated(payload)) {
        return setNoStoreHeaders(NextResponse.json(
          { success: false, code: 'REFRESH_ALREADY_ROTATED' },
          { status: 409 },
        ));
      }
      if (!isDefinitiveRefreshFailure(payload)) {
        return setNoStoreHeaders(NextResponse.json({ success: false }, { status: 502 }));
      }
    } else if (accessToken) {
      const result = await loadCustomerSession(accessToken);
      if (result.customer) {
        const response = NextResponse.json({ success: true });
        setCustomerCookies(response, accessToken, null);
        clearLegacyCookies(response);
        return setNoStoreHeaders(response);
      }
      if (result.status >= 500) {
        return setNoStoreHeaders(NextResponse.json({ success: false }, { status: 502 }));
      }
    }

    const response = NextResponse.json({ success: false }, { status: 401 });
    clearCustomerCookies(response);
    return setNoStoreHeaders(response);
  } catch {
    return setNoStoreHeaders(NextResponse.json({ success: false }, { status: 502 }));
  }
}
