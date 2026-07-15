import { NextRequest, NextResponse } from 'next/server';

import { isDefinitiveAuthenticationFailure } from '@/lib/auth/authentication-policy';
import {
  clearProviderStepUpCookie,
  setProviderStepUpCookie,
} from '@/lib/auth/provider-step-up';
import {
  isDefinitiveRefreshFailure,
  isRefreshAlreadyRotated,
} from '@/lib/auth/refresh-policy';
import { validateJsonMutationRequest } from '@/lib/auth/request-security';
import {
  clearCustomerCookies,
  clearLegacyCookies,
  readCustomerTokens,
  setCustomerCookies,
  setNoStoreHeaders,
} from '@/lib/auth/server-cookies';
import { renewCustomerSessionSingleFlight } from '@/lib/auth/server-refresh';
import { stepUpCustomerCredential } from '@/lib/auth/server-service';

type StepUpResult = Awaited<ReturnType<typeof stepUpCustomerCredential>>;
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

function response(
  body: { success: boolean; message: string },
  status: number,
): NextResponse {
  const result = NextResponse.json(body, { status });
  clearProviderStepUpCookie(result);
  return setNoStoreHeaders(result);
}

function validPassword(value: string): boolean {
  return value.length > 0
    && value.length <= 72
    && Buffer.byteLength(value, 'utf8') <= 72;
}

function isRateLimited(result: StepUpResult): boolean {
  return result.status === 429
    || result.errorStatus === 429
    || result.errorCode?.trim().toUpperCase() === 'TOO_MANY_REQUESTS';
}

function isUnavailable(result: StepUpResult): boolean {
  const code = result.errorCode?.trim().toUpperCase() ?? '';
  return result.status >= 500
    || (result.errorStatus !== null && result.errorStatus >= 500)
    || code === 'INTERNAL_SERVER_ERROR'
    || code === 'SERVICE_UNAVAILABLE';
}

export async function POST(request: NextRequest) {
  const rejection = validateJsonMutationRequest(request);
  if (rejection) return response({ success: false, message: rejection }, 403);

  const tokens = readCustomerTokens(request);
  let renewed: RenewalPayload = null;

  try {
    const body = await request.json() as unknown;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return response({ success: false, message: 'Invalid credential confirmation request.' }, 400);
    }
    const input = body as Record<string, unknown>;
    const keys = Object.keys(input);
    const currentPassword = typeof input.currentPassword === 'string'
      ? input.currentPassword
      : '';
    if (
      keys.length !== 1
      || keys[0] !== 'currentPassword'
      || !validPassword(currentPassword)
    ) {
      return response({ success: false, message: 'Invalid credential confirmation request.' }, 400);
    }

    let result: StepUpResult | null = null;
    if (tokens.accessToken) {
      result = await stepUpCustomerCredential(tokens.accessToken, currentPassword);
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
        const failed = response({
          success: false,
          message: alreadyRotated
            ? 'Session renewal is already in progress.'
            : unavailable
              ? 'Credential confirmation is temporarily unavailable.'
              : 'Your session has expired.',
        }, alreadyRotated ? 409 : unavailable ? 502 : 401);
        if (definitiveFailure) clearCustomerCookies(failed);
        return failed;
      }

      renewed = renewal.payload;
      result = await stepUpCustomerCredential(renewal.payload.accessToken, currentPassword);
    }

    if (!result) {
      const failed = response(
        { success: false, message: 'Your session has expired.' },
        401,
      );
      clearCustomerCookies(failed);
      return failed;
    }

    if (
      !result.payload?.success
      || !result.payload.stepUpProof
      || !result.payload.expiresIn
    ) {
      const authFailure = isDefinitiveAuthenticationFailure(result);
      const rateLimited = isRateLimited(result);
      const unavailable = !rateLimited && !authFailure && isUnavailable(result);
      const failed = response({
        success: false,
        message: rateLimited
          ? 'Please wait before confirming your password again.'
          : unavailable
            ? 'Credential confirmation is temporarily unavailable.'
            : authFailure
              ? 'Your session has expired.'
              : 'Credential confirmation failed.',
      }, rateLimited ? 429 : unavailable ? 502 : authFailure ? 401 : 400);

      if (authFailure && !unavailable) {
        clearCustomerCookies(failed);
      } else {
        setRenewedCookies(failed, renewed, tokens.refreshToken);
      }
      return failed;
    }

    const success = NextResponse.json({
      success: true,
      message: result.payload.message,
    });
    if (!setProviderStepUpCookie(
      success,
      result.payload.stepUpProof,
      result.payload.expiresIn,
    )) {
      const failed = response(
        { success: false, message: 'Credential confirmation is temporarily unavailable.' },
        502,
      );
      setRenewedCookies(failed, renewed, tokens.refreshToken);
      return failed;
    }
    setRenewedCookies(success, renewed, tokens.refreshToken);
    return setNoStoreHeaders(success);
  } catch {
    const failed = response(
      { success: false, message: 'Credential confirmation is temporarily unavailable.' },
      502,
    );
    setRenewedCookies(failed, renewed, tokens.refreshToken);
    return failed;
  }
}
