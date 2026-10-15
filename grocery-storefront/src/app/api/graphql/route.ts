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

function needsAccessRenewal(accessToken: string | null): boolean {
  if (!accessToken) return true;
  try {
    const payload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64url').toString('utf8')) as { exp?: number };
    // This schedules renewal only; upstream still validates the signed token.
    return typeof payload.exp !== 'number' || payload.exp <= Date.now() / 1000;
  } catch {
    return true;
  }
}

async function refreshSession(refreshToken: string) {
  const renewal = await renewCustomerSessionSingleFlight(refreshToken);
  if (renewal.payload?.success && renewal.payload.accessToken) {
    return { payload: renewal.payload, failure: null };
  }
  const rejected = isDefinitiveRefreshFailure(renewal.payload);
  const rotated = isRefreshAlreadyRotated(renewal.payload);
  const response = NextResponse.json({ errors: [{
    message: rejected ? 'Customer session has expired.' : rotated
      ? 'Session renewal is already in progress.' : 'Authentication service is temporarily unavailable.',
    extensions: { code: rejected ? 'CUSTOMER_SESSION_EXPIRED' : rotated ? 'REFRESH_ALREADY_ROTATED' : 'UPSTREAM_UNAVAILABLE' },
  }] }, { status: rejected ? 401 : rotated ? 409 : 502 });
  if (rejected) clearCustomerCookies(response);
  return { payload: null, failure: setNoStoreHeaders(response) };
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

    // Guest-capable mutations do not return an auth error when access is absent.
    // Renew before forwarding so checkout runs exactly once with its customer.
    if (tokens.refreshToken && needsAccessRenewal(tokens.accessToken)) {
      const renewal = await refreshSession(tokens.refreshToken);
      if (renewal.failure) return renewal.failure;
      renewed = renewal.payload;
    }
    let upstream = await fetchUpstream(body, renewed?.accessToken ?? tokens.accessToken);
    if (!renewed && tokens.refreshToken && isUnauthenticatedResponse(upstream.response.status, upstream.data)) {
      const renewal = await refreshSession(tokens.refreshToken);
      if (renewal.failure) return renewal.failure;
      renewed = renewal.payload;
      upstream = await fetchUpstream(body, renewed?.accessToken ?? null);
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
