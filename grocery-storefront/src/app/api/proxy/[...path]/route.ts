import { NextRequest, NextResponse } from 'next/server';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://zira-ai.com/api/v1';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const pathStr = params.path.join('/');
    const url = new URL(`${API_URL}/${pathStr}`);

    // Forward query parameters
    request.nextUrl.searchParams.forEach((value, key) =>
      url.searchParams.set(key, value)
    );

    const headers: Record<string, string> = {};
    const auth = request.headers.get('authorization');
    if (auth) headers['Authorization'] = auth;

    const response = await fetch(url.toString(), { method: 'GET', headers });
    const data = await response.text();

    return new NextResponse(data, {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('content-type') || 'application/json' },
    });
  } catch (error) {
    console.error('[API Proxy] Error:', error);
    return NextResponse.json({ error: 'Proxy error' }, { status: 502 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const pathStr = params.path.join('/');
    const body = await request.text();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const auth = request.headers.get('authorization');
    if (auth) headers['Authorization'] = auth;

    const response = await fetch(`${API_URL}/${pathStr}`, {
      method: 'POST',
      headers,
      body,
    });

    const data = await response.text();
    return new NextResponse(data, {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('content-type') || 'application/json' },
    });
  } catch (error) {
    console.error('[API Proxy] POST Error:', error);
    return NextResponse.json({ error: 'Proxy error' }, { status: 502 });
  }
}
