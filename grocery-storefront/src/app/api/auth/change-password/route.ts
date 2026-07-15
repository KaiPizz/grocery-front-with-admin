import { NextRequest, NextResponse } from 'next/server';

import {
  clearCustomerCookies,
  clearLegacyCookies,
  readCustomerTokens,
  setCustomerCookies,
  setNoStoreHeaders,
} from '@/lib/auth/server-cookies';
import { isDefinitiveAuthenticationFailure } from '@/lib/auth/authentication-policy';
import { validateJsonMutationRequest } from '@/lib/auth/request-security';
import {
  isDefinitiveRefreshFailure,
  isRefreshAlreadyRotated,
} from '@/lib/auth/refresh-policy';
import { renewCustomerSessionSingleFlight } from '@/lib/auth/server-refresh';
import { changeCustomerPassword } from '@/lib/auth/server-service';

type ChangeResult = Awaited<ReturnType<typeof changeCustomerPassword>>;
type RenewalPayload = Awaited<ReturnType<typeof renewCustomerSessionSingleFlight>>['payload'];

function setRenewedCookies(
  response: NextResponse,
  renewed: RenewalPayload,
  fallbackRefreshToken: string | null,
): void {
  if (!renewed?.accessToken) return;
  setCustomerCookies(
    response,
    renewed.accessToken,
    renewed.refreshToken ?? fallbackRefreshToken,
    renewed.expiresIn,
  );
  clearLegacyCookies(response);
}

export async function POST(request: NextRequest) {
  const rejection = validateJsonMutationRequest(request);
  if (rejection) {
    return setNoStoreHeaders(NextResponse.json(
      { success: false, message: rejection, errors: [] },
      { status: 403 },
    ));
  }

  const tokens = readCustomerTokens(request);
  let renewed: RenewalPayload = null;

  try {
    const body = await request.json() as { currentPassword?: unknown; newPassword?: unknown };
    const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';

    if (!currentPassword || newPassword.length < 8 || newPassword.length > 72) {
      return setNoStoreHeaders(NextResponse.json(
        { success: false, message: 'Invalid password change request.', errors: [] },
        { status: 400 },
      ));
    }

    let result: ChangeResult | null = null;

    if (tokens.accessToken) {
      result = await changeCustomerPassword(tokens.accessToken, currentPassword, newPassword);
    }

    if ((!result || (!result.payload && isDefinitiveAuthenticationFailure(result))) && tokens.refreshToken) {
      const renewal = await renewCustomerSessionSingleFlight(tokens.refreshToken);
      if (!renewal.payload?.success || !renewal.payload.accessToken) {
        const alreadyRotated = isRefreshAlreadyRotated(renewal.payload);
        const definitiveFailure = isDefinitiveRefreshFailure(renewal.payload);
        const unavailable = renewal.status >= 500 || (!alreadyRotated && !definitiveFailure);
        const response = NextResponse.json({
          success: false,
          message: alreadyRotated
            ? 'Session renewal is already in progress.'
            : unavailable
            ? 'Authentication service is temporarily unavailable.'
            : 'Your session has expired.',
          errors: [],
        }, { status: alreadyRotated ? 409 : unavailable ? 502 : 401 });
        if (definitiveFailure) clearCustomerCookies(response);
        return setNoStoreHeaders(response);
      }

      renewed = renewal.payload;
      result = await changeCustomerPassword(
        renewal.payload.accessToken,
        currentPassword,
        newPassword,
      );
    }

    if (!result) {
      const response = NextResponse.json(
        { success: false, message: 'Your session has expired.', errors: [] },
        { status: 401 },
      );
      clearCustomerCookies(response);
      return setNoStoreHeaders(response);
    }

    if (!result.payload?.success) {
      const authFailure = isDefinitiveAuthenticationFailure(result);
      const unavailable = result.status >= 500 || (!result.payload && !authFailure);
      const response = NextResponse.json({
        success: false,
        message: unavailable
          ? 'Authentication service is temporarily unavailable.'
          : result.payload?.message ?? result.error ?? 'Password change failed.',
        errors: result.payload?.errors ?? [],
      }, { status: unavailable ? 502 : authFailure ? 401 : 400 });

      if (authFailure && !unavailable) {
        clearCustomerCookies(response);
      } else {
        setRenewedCookies(response, renewed, tokens.refreshToken);
      }
      return setNoStoreHeaders(response);
    }

    const response = NextResponse.json({
      success: true,
      message: result.payload.message,
      errors: [],
    });
    // Changing a password revokes all sessions, including the one used here.
    clearCustomerCookies(response);
    return setNoStoreHeaders(response);
  } catch {
    const response = NextResponse.json(
      { success: false, message: 'Password change failed.', errors: [] },
      { status: 502 },
    );
    // Do not lose a token pair that was rotated before the downstream call failed.
    setRenewedCookies(response, renewed, tokens.refreshToken);
    return setNoStoreHeaders(response);
  }
}
