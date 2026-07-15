import { NextRequest, NextResponse } from 'next/server';

import {
  clearCustomerCookies,
  clearLegacyCookies,
  readCustomerTokens,
  setCustomerCookies,
  setNoStoreHeaders,
} from '@/lib/auth/server-cookies';
import { validateJsonMutationRequest } from '@/lib/auth/request-security';
import {
  isDefinitiveRefreshFailure,
  isRefreshAlreadyRotated,
} from '@/lib/auth/refresh-policy';
import { renewCustomerSessionSingleFlight } from '@/lib/auth/server-refresh';

export async function POST(request: NextRequest) {
  const rejection = validateJsonMutationRequest(request);
  if (rejection) {
    return setNoStoreHeaders(NextResponse.json({ success: false, message: rejection }, { status: 403 }));
  }

  const tokens = readCustomerTokens(request);
  if (!tokens.refreshToken) {
    const response = NextResponse.json(
      { success: false, code: 'NO_REFRESH_COOKIE', message: 'Session cannot be renewed.' },
      { status: 401 },
    );
    clearCustomerCookies(response);
    return setNoStoreHeaders(response);
  }

  try {
    const result = await renewCustomerSessionSingleFlight(tokens.refreshToken);
    const payload = result.payload;
    if (!payload?.success || !payload.accessToken) {
      const alreadyRotated = isRefreshAlreadyRotated(payload);
      const definitiveFailure = isDefinitiveRefreshFailure(payload);
      const unavailable = result.status >= 500 || (!alreadyRotated && !definitiveFailure);
      const response = NextResponse.json(
        {
          success: false,
          code: unavailable
            ? 'UPSTREAM_UNAVAILABLE'
            : alreadyRotated
              ? 'REFRESH_ALREADY_ROTATED'
              : payload?.errorCode ?? 'INVALID_REFRESH_TOKEN',
          message: payload?.message ?? result.error ?? 'Session cannot be renewed.',
        },
        { status: unavailable ? 502 : alreadyRotated ? 409 : 401 },
      );
      if (definitiveFailure) {
        clearCustomerCookies(response);
      }
      return setNoStoreHeaders(response);
    }

    const response = NextResponse.json({ success: true, message: payload.message });
    setCustomerCookies(
      response,
      payload.accessToken,
      payload.refreshToken ?? tokens.refreshToken,
      payload.expiresIn,
    );
    clearLegacyCookies(response);
    return setNoStoreHeaders(response);
  } catch {
    const response = NextResponse.json(
      { success: false, code: 'UPSTREAM_UNAVAILABLE', message: 'Session cannot be renewed.' },
      { status: 502 },
    );
    return setNoStoreHeaders(response);
  }
}
