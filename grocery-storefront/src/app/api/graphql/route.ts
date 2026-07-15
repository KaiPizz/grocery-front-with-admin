import { NextRequest, NextResponse } from 'next/server';

import {
  clearCustomerCookies,
  clearLegacyCookies,
  readCustomerTokens,
  setCustomerCookies,
  setNoStoreHeaders,
} from '@/lib/auth/server-cookies';
import { isGraphqlAuthenticationFailure } from '@/lib/auth/authentication-policy';
import { validateJsonMutationRequest } from '@/lib/auth/request-security';
import { containsBlockedAuthField } from '@/lib/auth/proxy-policy';
import {
  isDefinitiveRefreshFailure,
  isRefreshAlreadyRotated,
} from '@/lib/auth/refresh-policy';
import { renewCustomerSessionSingleFlight } from '@/lib/auth/server-refresh';
import { resolveChannel } from '@/lib/channel';

const GRAPHQL_URL =
  process.env.NEXT_PUBLIC_GRAPHQL_URL || 'https://zira-ai.com/graphql/storefront';

function createUpstreamHeaders(accessToken: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-channel': resolveChannel(process.env.NEXT_PUBLIC_SALON_SLUG),
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
}

async function fetchUpstream(body: string, accessToken: string | null) {
  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: createUpstreamHeaders(accessToken),
    cache: 'no-store',
    body,
  });
  return { response, data: await response.text() };
}

function isUnauthenticatedResponse(status: number, data: string): boolean {
  try {
    const parsed = JSON.parse(data) as {
      errors?: Array<{
        message?: string;
        extensions?: {
          code?: string;
          originalError?: { message?: string | string[]; statusCode?: number };
        };
      }>;
    };
    return isGraphqlAuthenticationFailure(status, parsed.errors);
  } catch {
    return status === 401 || status === 403;
  }
}

export async function POST(request: NextRequest) {
  const rejection = validateJsonMutationRequest(request);
  if (rejection) {
    return setNoStoreHeaders(NextResponse.json(
      { errors: [{ message: rejection }] },
      { status: 403 },
    ));
  }

  const tokens = readCustomerTokens(request);
  let renewed: Awaited<ReturnType<typeof renewCustomerSessionSingleFlight>>['payload'] = null;

  try {
    const body = await request.text();
    const parsed = JSON.parse(body) as { query?: unknown };
    if (typeof parsed.query !== 'string' || !parsed.query.trim()) {
      return setNoStoreHeaders(NextResponse.json(
        { errors: [{ message: 'A GraphQL query is required.' }] },
        { status: 400 },
      ));
    }
    let blockedAuthOperation = false;
    try {
      blockedAuthOperation = containsBlockedAuthField(parsed.query);
    } catch {
      return setNoStoreHeaders(NextResponse.json(
        { errors: [{ message: 'The GraphQL query is invalid.' }] },
        { status: 400 },
      ));
    }
    if (blockedAuthOperation) {
      return setNoStoreHeaders(NextResponse.json(
        { errors: [{ message: 'Authentication operations must use the session API.' }] },
        { status: 403 },
      ));
    }

    let upstream = await fetchUpstream(body, tokens.accessToken);
    let renewalRejected = false;
    let renewalUnavailable = false;
    let renewalAlreadyRotated = false;

    if (
      isUnauthenticatedResponse(upstream.response.status, upstream.data)
      && tokens.refreshToken
    ) {
      const renewal = await renewCustomerSessionSingleFlight(tokens.refreshToken);
      if (renewal.payload?.success && renewal.payload.accessToken) {
        renewed = renewal.payload;
        upstream = await fetchUpstream(body, renewal.payload.accessToken);
      } else if (isRefreshAlreadyRotated(renewal.payload)) {
        renewalAlreadyRotated = true;
      } else if (isDefinitiveRefreshFailure(renewal.payload)) {
        renewalRejected = true;
      } else {
        renewalUnavailable = true;
      }
    }

    if (renewalUnavailable) {
      return setNoStoreHeaders(NextResponse.json(
        { errors: [{ message: 'Authentication service is temporarily unavailable.', extensions: { code: 'UPSTREAM_UNAVAILABLE' } }] },
        { status: 502 },
      ));
    }

    if (renewalAlreadyRotated) {
      return setNoStoreHeaders(NextResponse.json(
        { errors: [{ message: 'Session renewal is already in progress.', extensions: { code: 'REFRESH_ALREADY_ROTATED' } }] },
        { status: 409 },
      ));
    }

    const response = new NextResponse(upstream.data, {
      status: upstream.response.status,
      headers: { 'Content-Type': 'application/json' },
    });

    if (renewed?.accessToken) {
      setCustomerCookies(
        response,
        renewed.accessToken,
        renewed.refreshToken ?? tokens.refreshToken,
        renewed.expiresIn,
      );
      clearLegacyCookies(response);
    } else if (renewalRejected) {
      clearCustomerCookies(response);
    }

    return setNoStoreHeaders(response);
  } catch {
    console.error('[GraphQL Proxy] Upstream POST failed');
    const response = NextResponse.json(
      { errors: [{ message: 'Proxy error' }] },
      { status: 502 }
    );
    // A successful refresh rotates the token. Preserve that pair even if the retried request fails.
    if (renewed?.accessToken) {
      setCustomerCookies(
        response,
        renewed.accessToken,
        renewed.refreshToken ?? tokens.refreshToken,
        renewed.expiresIn,
      );
      clearLegacyCookies(response);
    }
    return setNoStoreHeaders(response);
  }
}
