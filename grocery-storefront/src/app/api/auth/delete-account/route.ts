import { NextRequest, NextResponse } from 'next/server';

import { isDefinitiveAuthenticationFailure } from '@/lib/auth/authentication-policy';
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
import { deleteCustomerAccount } from '@/lib/auth/server-service';

type DeleteResult = Awaited<ReturnType<typeof deleteCustomerAccount>>;
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

function invalidRequestResponse(): NextResponse {
  return setNoStoreHeaders(NextResponse.json(
    { success: false, message: 'Invalid account deletion request.' },
    { status: 400 },
  ));
}

export async function POST(request: NextRequest) {
  const rejection = validateJsonMutationRequest(request);
  if (rejection) {
    return setNoStoreHeaders(NextResponse.json(
      { success: false, message: rejection },
      { status: 403 },
    ));
  }

  const tokens = readCustomerTokens(request);
  let renewed: RenewalPayload = null;

  try {
    const body = await request.json() as unknown;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return invalidRequestResponse();
    }

    const input = body as Record<string, unknown>;
    const keys = Object.keys(input);
    const password = typeof input.password === 'string' ? input.password : '';
    if (
      keys.length !== 1
      || keys[0] !== 'password'
      || !password
      || password.length > 72
      || Buffer.byteLength(password, 'utf8') > 72
    ) {
      return invalidRequestResponse();
    }

    let result: DeleteResult | null = null;

    if (tokens.accessToken) {
      result = await deleteCustomerAccount(tokens.accessToken, password);
    }

    if (
      (!result || (!result.payload && isDefinitiveAuthenticationFailure(result)))
      && tokens.refreshToken
    ) {
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
        }, { status: alreadyRotated ? 409 : unavailable ? 502 : 401 });
        if (definitiveFailure) clearCustomerCookies(response);
        return setNoStoreHeaders(response);
      }

      renewed = renewal.payload;
      result = await deleteCustomerAccount(renewal.payload.accessToken, password);
    }

    if (!result) {
      const response = NextResponse.json(
        { success: false, message: 'Your session has expired.' },
        { status: 401 },
      );
      clearCustomerCookies(response);
      return setNoStoreHeaders(response);
    }

    if (!result.payload?.success) {
      const authFailure = isDefinitiveAuthenticationFailure(result);
      const rateLimited = result.status === 429
        || result.errorStatus === 429
        || result.errorCode?.toUpperCase() === 'TOO_MANY_REQUESTS';
      const unavailable = !rateLimited
        && (result.status >= 500 || (!result.payload && !authFailure));
      const response = NextResponse.json({
        success: false,
        message: rateLimited
          ? 'Please wait before trying to delete the account again.'
          : unavailable
            ? 'Authentication service is temporarily unavailable.'
            : result.payload?.message ?? result.error ?? 'Account deletion failed.',
      }, { status: rateLimited ? 429 : unavailable ? 502 : authFailure ? 401 : 400 });

      if (authFailure && !unavailable) {
        clearCustomerCookies(response);
      } else {
        // A wrong password must not sign the customer out after a successful refresh.
        setRenewedCookies(response, renewed, tokens.refreshToken);
      }
      return setNoStoreHeaders(response);
    }

    const response = NextResponse.json({
      success: true,
      message: result.payload.message,
    });
    // Account deletion revokes every server session. Remove every browser token too.
    clearCustomerCookies(response);
    return setNoStoreHeaders(response);
  } catch {
    const response = NextResponse.json(
      { success: false, message: 'Account deletion failed.' },
      { status: 502 },
    );
    // Preserve a token pair rotated before a transient downstream failure.
    setRenewedCookies(response, renewed, tokens.refreshToken);
    return setNoStoreHeaders(response);
  }
}
