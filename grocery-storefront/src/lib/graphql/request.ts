'use client';

import { getAuthToken } from '@/lib/auth';

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
  options?: { token?: string | null }
): Promise<GraphQLResponse<T>> {
  const token = options?.token ?? getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch('/api/graphql', {
    method: 'POST',
    headers,
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
