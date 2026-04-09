import { NextRequest, NextResponse } from 'next/server';

const GRAPHQL_URL =
  process.env.NEXT_PUBLIC_GRAPHQL_URL || 'https://zira-ai.com/graphql/storefront';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Forward auth token if present
    const auth = request.headers.get('authorization');
    if (auth) headers['Authorization'] = auth;

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
  } catch (error) {
    console.error('[GraphQL Proxy] Error:', error);
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

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const auth = request.headers.get('authorization');
    if (auth) headers['Authorization'] = auth;

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
    });

    const data = await response.text();
    return new NextResponse(data, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[GraphQL Proxy] GET Error:', error);
    return NextResponse.json(
      { errors: [{ message: 'Proxy error' }] },
      { status: 502 }
    );
  }
}
