import { NextRequest, NextResponse } from 'next/server';

import { resolveChannel } from '@/lib/channel';

const GRAPHQL_URL =
  process.env.NEXT_PUBLIC_GRAPHQL_URL || 'https://zira-ai.com/graphql/storefront';

function createUpstreamHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-channel': resolveChannel(process.env.NEXT_PUBLIC_SALON_SLUG),
  };

  const auth = request.headers.get('authorization');
  if (auth) {
    headers.Authorization = auth;
  }

  return headers;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headers = createUpstreamHeaders(request);

    const response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers,
      body,
    });

    const data = await response.text();
    return new NextResponse(data, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    console.error('[GraphQL Proxy] Upstream POST failed');
    return NextResponse.json(
      { errors: [{ message: 'Proxy error' }] },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Forward query parameters for GET-based GraphQL requests (urql cache)
    const url = new URL(GRAPHQL_URL);
    const searchParams = request.nextUrl.searchParams;
    searchParams.forEach((value, key) => url.searchParams.set(key, value));

    const headers = createUpstreamHeaders(request);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
    });

    const data = await response.text();
    return new NextResponse(data, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    console.error('[GraphQL Proxy] Upstream GET failed');
    return NextResponse.json(
      { errors: [{ message: 'Proxy error' }] },
      { status: 502 }
    );
  }
}
