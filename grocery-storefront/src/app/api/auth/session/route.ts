import { NextRequest, NextResponse } from 'next/server';

import {
  clearLegacyCookies,
  readCustomerTokens,
  setCustomerCookies,
  setNoStoreHeaders,
} from '@/lib/auth/server-cookies';
import { isDefinitiveAuthenticationFailure } from '@/lib/auth/authentication-policy';
import { loadCustomerSession } from '@/lib/auth/server-service';

export async function GET(request: NextRequest) {
  const tokens = readCustomerTokens(request);
  if (!tokens.accessToken) {
    if (!tokens.refreshToken) {
      return setNoStoreHeaders(NextResponse.json({
        authenticated: false,
        customer: null,
        code: 'NO_SESSION_COOKIE',
      }));
    }

    return setNoStoreHeaders(NextResponse.json(
      { authenticated: false, customer: null, code: 'NO_ACCESS_COOKIE' },
      { status: 401 },
    ));
  }

  try {
    const result = await loadCustomerSession(tokens.accessToken);
    if (!result.customer) {
      const authenticationRejected = isDefinitiveAuthenticationFailure(result);
      return setNoStoreHeaders(NextResponse.json(
        { authenticated: false, customer: null },
        { status: authenticationRejected ? 401 : 502 },
      ));
    }

    const response = NextResponse.json({ authenticated: true, customer: result.customer });
    if (tokens.usedLegacyAccess || tokens.usedLegacyRefresh) {
      setCustomerCookies(response, tokens.accessToken, tokens.refreshToken);
    }
    if (tokens.hasLegacyAccess || tokens.hasLegacyRefresh) {
      clearLegacyCookies(response);
    }
    return setNoStoreHeaders(response);
  } catch {
    return setNoStoreHeaders(NextResponse.json(
      { authenticated: false, customer: null },
      { status: 502 },
    ));
  }
}
