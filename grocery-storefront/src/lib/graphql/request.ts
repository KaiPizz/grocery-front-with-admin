'use client';

import { emitSessionExpired } from '@/lib/auth';
import { isGraphqlAuthenticationFailure } from '@/lib/auth/authentication-policy';

interface GraphQLErrorPayload {
  message: string;
  path?: string[];
  extensions?: {
    code?: string;
    originalError?: {
      message?: string | string[];
      error?: string;
      statusCode?: number;
    };
  };
}

interface GraphQLResponse<T> {
  data: T | null;
  errors: GraphQLErrorPayload[];
  status: number;
}

export async function graphqlRequest<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<GraphQLResponse<T>> {
  const firstResponse = await sendGraphqlRequest<T>(query, variables);
  if (!isUnauthenticated(firstResponse)) return firstResponse;

  const refreshResult = await refreshCustomerSession();
  if (refreshResult === 'renewed') {
    return sendGraphqlRequest<T>(query, variables);
  }

  if (refreshResult === 'invalid') {
    emitSessionExpired();
  }
  return firstResponse;
}

async function sendGraphqlRequest<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<GraphQLResponse<T>> {
  const response = await fetch('/api/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    cache: 'no-store',
    body: JSON.stringify({ query, variables }),
  });

  let payload: { data?: T; errors?: GraphQLErrorPayload[] } | null = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  return {
    data: payload?.data ?? null,
    errors: payload?.errors ?? [],
    status: response.status,
  };
}

function isUnauthenticated(response: GraphQLResponse<unknown>): boolean {
  return isGraphqlAuthenticationFailure(response.status, response.errors);
}

type RefreshResult = 'renewed' | 'missing' | 'invalid' | 'transient';

let refreshPromise: Promise<RefreshResult> | null = null;

async function refreshCustomerSession(): Promise<RefreshResult> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
        body: '{}',
      });
      const payload = await response.json() as { success?: boolean; code?: string };
      if (!response.ok) {
        if (response.status === 401 && payload.code === 'NO_REFRESH_COOKIE') return 'missing';
        return response.status === 401 ? 'invalid' : 'transient';
      }

      return payload.success === true ? 'renewed' : 'invalid';
    } catch {
      return 'transient';
    }
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

export function getGraphqlErrorMessage(errors: GraphQLErrorPayload[]): string | null {
  const messages: string[] = [];

  for (const error of errors) {
    const originalMessage = error.extensions?.originalError?.message;

    if (Array.isArray(originalMessage) && originalMessage.length > 0) {
      messages.push(...originalMessage.map(String));
      continue;
    }

    if (typeof originalMessage === 'string' && originalMessage.trim()) {
      messages.push(originalMessage);
      continue;
    }

    if (error.message?.trim()) {
      messages.push(error.message);
    }
  }

  return messages.length > 0 ? messages.join(' · ') : null;
}
