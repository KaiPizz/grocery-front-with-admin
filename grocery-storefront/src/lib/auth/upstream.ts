import 'server-only';

import { resolveChannel } from '@/lib/channel';

const GRAPHQL_URL =
  process.env.NEXT_PUBLIC_GRAPHQL_URL || 'https://zira-ai.com/graphql/storefront';

interface GraphqlErrorPayload {
  message?: string | null;
  extensions?: {
    code?: string | null;
    originalError?: {
      message?: string | string[] | null;
      statusCode?: number | null;
    } | null;
  } | null;
}

export interface UpstreamGraphqlPayload<TData> {
  data?: TData | null;
  errors?: GraphqlErrorPayload[] | null;
}

export interface UpstreamGraphqlResult<TData> {
  payload: UpstreamGraphqlPayload<TData>;
  status: number;
}

export async function authGraphqlRequest<TData>(
  query: string,
  variables?: Record<string, unknown>,
  accessToken?: string | null,
): Promise<UpstreamGraphqlResult<TData>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-channel': resolveChannel(process.env.NEXT_PUBLIC_SALON_SLUG),
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers,
    cache: 'no-store',
    body: JSON.stringify({ query, variables }),
  });

  let payload: UpstreamGraphqlPayload<TData> = {};
  try {
    payload = await response.json() as UpstreamGraphqlPayload<TData>;
  } catch {
    payload = { errors: [{ message: 'Authentication service returned an invalid response.' }] };
  }

  return { payload, status: response.status };
}

export function firstGraphqlError(payload: UpstreamGraphqlPayload<unknown>): string | null {
  for (const error of payload.errors ?? []) {
    const original = error.extensions?.originalError?.message;
    if (Array.isArray(original) && original.length > 0) return String(original[0]);
    if (typeof original === 'string' && original.trim()) return original;
    if (error.message?.trim()) return error.message;
  }

  return null;
}

export function firstGraphqlErrorCode(payload: UpstreamGraphqlPayload<unknown>): string | null {
  for (const error of payload.errors ?? []) {
    const code = error.extensions?.code;
    if (typeof code === 'string' && code.trim()) return code.trim();
  }

  return null;
}

export function firstGraphqlErrorStatus(payload: UpstreamGraphqlPayload<unknown>): number | null {
  for (const error of payload.errors ?? []) {
    const status = error.extensions?.originalError?.statusCode;
    if (typeof status === 'number' && Number.isInteger(status)) return status;
  }

  return null;
}
