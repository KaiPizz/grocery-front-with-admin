import { NextRequest, NextResponse } from 'next/server';

import { clearCustomerCookies, readCustomerTokens, setNoStoreHeaders } from '@/lib/auth/server-cookies';
import { validateJsonMutationRequest } from '@/lib/auth/request-security';
import { renewCustomerSessionSingleFlight } from '@/lib/auth/server-refresh';
import { revokeCustomerSession } from '@/lib/auth/server-service';

export async function POST(request: NextRequest) {
  const rejection = validateJsonMutationRequest(request);
  if (rejection) {
    return setNoStoreHeaders(NextResponse.json({ success: false, message: rejection }, { status: 403 }));
  }

  const { accessToken, refreshToken } = readCustomerTokens(request);
  let success = true;
  let message: string | null = null;

  try {
    if (accessToken) {
      const result = await revokeCustomerSession(accessToken);
      success = result.payload?.success ?? false;
      message = result.payload?.message ?? result.error;
    }

    if (refreshToken && (!success || !accessToken)) {
      const renewal = await renewCustomerSessionSingleFlight(refreshToken);
      if (renewal.payload?.success && renewal.payload.accessToken) {
        const revocation = await revokeCustomerSession(renewal.payload.accessToken);
        success = revocation.payload?.success ?? false;
        message = revocation.payload?.message ?? revocation.error;
      } else {
        success = false;
        message = renewal.payload?.message ?? renewal.error ?? 'Session revocation failed.';
      }
    }
  } catch {
    success = false;
    message = 'Logout transport failed.';
  }

  const response = NextResponse.json({ success, message });
  clearCustomerCookies(response);
  return setNoStoreHeaders(response);
}
