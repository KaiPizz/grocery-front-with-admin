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
import { resendCustomerVerification } from '@/lib/auth/server-service';

type ResendResult = Awaited<ReturnType<typeof resendCustomerVerification>>;
type RenewalPayload = Awaited<
  ReturnType<typeof renewCustomerSessionSingleFlight>
>['payload'];
type CustomerTokens = ReturnType<typeof readCustomerTokens>;

function attachSessionCookies(
  response: NextResponse,
  tokens: CustomerTokens,
  renewed: RenewalPayload,
): void {
  let canRetireLegacyCookies = false;

  if (renewed?.accessToken) {
    setCustomerCookies(
      response,
      renewed.accessToken,
      renewed.refreshToken ?? tokens.refreshToken,
      renewed.expiresIn,
    );
    canRetireLegacyCookies = true;
  } else if (
    tokens.accessToken &&
    (tokens.usedLegacyAccess || tokens.usedLegacyRefresh)
  ) {
    setCustomerCookies(response, tokens.accessToken, tokens.refreshToken);
    canRetireLegacyCookies = true;
  } else if (tokens.accessToken && !tokens.usedLegacyAccess) {
    canRetireLegacyCookies = true;
  }

  if (
    canRetireLegacyCookies &&
    (tokens.hasLegacyAccess || tokens.hasLegacyRefresh)
  ) {
    clearLegacyCookies(response);
  }
}

function json(
  body: { success: boolean; message: string },
  status: number,
): NextResponse {
  return setNoStoreHeaders(NextResponse.json(body, { status }));
}

export async function POST(request: NextRequest) {
  const rejection = validateJsonMutationRequest(request);
  if (rejection) {
    return json({ success: false, message: rejection }, 403);
  }

  let locale: 'pl' | 'en';
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (
      !body ||
      Array.isArray(body) ||
      Object.keys(body).some((key) => key !== 'locale') ||
      (body.locale !== 'pl' && body.locale !== 'en')
    ) {
      return json(
        { success: false, message: 'Invalid verification request.' },
        400,
      );
    }
    locale = body.locale;
  } catch {
    return json(
      { success: false, message: 'Invalid verification request.' },
      400,
    );
  }

  const tokens = readCustomerTokens(request);
  let renewed: RenewalPayload = null;

  try {
    let result: ResendResult | null = null;
    if (tokens.accessToken) {
      result = await resendCustomerVerification(tokens.accessToken, locale);
    }

    if (
      (!result ||
        (!result.payload && isDefinitiveAuthenticationFailure(result))) &&
      tokens.refreshToken
    ) {
      const renewal = await renewCustomerSessionSingleFlight(
        tokens.refreshToken,
      );
      if (!renewal.payload?.success || !renewal.payload.accessToken) {
        const alreadyRotated = isRefreshAlreadyRotated(renewal.payload);
        const definitiveFailure = isDefinitiveRefreshFailure(renewal.payload);
        const unavailable =
          renewal.status >= 500 || (!alreadyRotated && !definitiveFailure);
        const response = json(
          {
            success: false,
            message: alreadyRotated
              ? 'Session renewal is already in progress.'
              : unavailable
                ? 'Verification service is temporarily unavailable.'
                : 'Your session has expired.',
          },
          alreadyRotated ? 409 : unavailable ? 502 : 401,
        );
        if (definitiveFailure) clearCustomerCookies(response);
        return response;
      }

      renewed = renewal.payload;
      result = await resendCustomerVerification(
        renewal.payload.accessToken,
        locale,
      );
    }

    if (!result) {
      const response = json(
        {
          success: false,
          message: 'Your session has expired.',
        },
        401,
      );
      clearCustomerCookies(response);
      return response;
    }

    if (!result.payload?.success) {
      const authenticationRejected = isDefinitiveAuthenticationFailure(result);
      const rateLimited = result.status === 429 || result.errorStatus === 429;
      const response = json(
        {
          success: false,
          message: rateLimited
            ? 'Please wait before requesting another verification email.'
            : authenticationRejected
              ? 'Your session has expired.'
              : 'Verification service is temporarily unavailable.',
        },
        rateLimited ? 429 : authenticationRejected ? 401 : 502,
      );

      if (authenticationRejected) clearCustomerCookies(response);
      else attachSessionCookies(response, tokens, renewed);
      return response;
    }

    const response = json(
      {
        success: true,
        message: 'Verification email requested.',
      },
      200,
    );
    attachSessionCookies(response, tokens, renewed);
    return response;
  } catch {
    const response = json(
      {
        success: false,
        message: 'Verification service is temporarily unavailable.',
      },
      502,
    );
    attachSessionCookies(response, tokens, renewed);
    return response;
  }
}
