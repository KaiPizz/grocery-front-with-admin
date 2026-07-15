import 'server-only';

import { NextRequest, NextResponse } from 'next/server';

import { isDefinitiveAuthenticationFailure } from './authentication-policy';
import {
  clearCustomerCookies,
  clearLegacyCookies,
  readCustomerTokens,
  setCustomerCookies,
  setNoStoreHeaders,
} from './server-cookies';
import {
  isDefinitiveRefreshFailure,
  isRefreshAlreadyRotated,
} from './refresh-policy';
import { renewCustomerSessionSingleFlight } from './server-refresh';
import type { CustomerProviderActionPayload } from './server-service';

interface CustomerProviderActionResult {
  payload: CustomerProviderActionPayload | null;
  error: string | null;
  errorCode: string | null;
  errorStatus: number | null;
  status: number;
}

interface RevokingActionMessages {
  failed: string;
  conflict: string;
  rateLimited: string;
  unavailable: string;
}

type RenewalPayload = Awaited<ReturnType<typeof renewCustomerSessionSingleFlight>>['payload'];

const PROVIDER_CONFLICT_CODES = new Set([
  'CONFLICT',
  'LAST_LOGIN_METHOD',
  'LOGIN_PROVIDER_ALREADY_LINKED',
  'OAUTH_ACCOUNT_ALREADY_LINKED',
  'PROVIDER_ALREADY_LINKED',
]);

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

function errorCode(result: CustomerProviderActionResult): string {
  return result.errorCode?.trim().toUpperCase() ?? '';
}

function isRateLimited(result: CustomerProviderActionResult): boolean {
  return result.status === 429
    || result.errorStatus === 429
    || errorCode(result) === 'TOO_MANY_REQUESTS';
}

function isConflict(result: CustomerProviderActionResult): boolean {
  return result.status === 409
    || result.errorStatus === 409
    || PROVIDER_CONFLICT_CODES.has(errorCode(result));
}

/**
 * Runs a password-confirmed account mutation that revokes every customer
 * session when it succeeds. Provider credentials and bearer tokens never
 * leave this server boundary.
 */
export async function runRevokingCustomerAction(
  request: NextRequest,
  action: (accessToken: string) => Promise<CustomerProviderActionResult>,
  messages: RevokingActionMessages,
): Promise<NextResponse> {
  const tokens = readCustomerTokens(request);
  let renewed: RenewalPayload = null;

  try {
    let result: CustomerProviderActionResult | null = null;
    if (tokens.accessToken) {
      result = await action(tokens.accessToken);
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
              ? messages.unavailable
              : 'Your session has expired.',
        }, { status: alreadyRotated ? 409 : unavailable ? 502 : 401 });
        if (definitiveFailure) clearCustomerCookies(response);
        return setNoStoreHeaders(response);
      }

      renewed = renewal.payload;
      result = await action(renewal.payload.accessToken);
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
      const rateLimited = isRateLimited(result);
      const conflict = !rateLimited && isConflict(result);
      const unavailable = !rateLimited
        && !conflict
        && (result.status >= 500 || (!result.payload && !authFailure));
      const response = NextResponse.json({
        success: false,
        message: rateLimited
          ? messages.rateLimited
          : conflict
            ? messages.conflict
            : unavailable
              ? messages.unavailable
              : messages.failed,
      }, {
        status: rateLimited
          ? 429
          : conflict
            ? 409
            : unavailable
              ? 502
              : authFailure
                ? 401
                : 400,
      });

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
    });
    // Linking or unlinking a provider revokes every backend session.
    clearCustomerCookies(response);
    return setNoStoreHeaders(response);
  } catch {
    const response = NextResponse.json(
      { success: false, message: messages.unavailable },
      { status: 502 },
    );
    // Do not strand the customer if refresh rotation won before the action failed.
    setRenewedCookies(response, renewed, tokens.refreshToken);
    return setNoStoreHeaders(response);
  }
}
