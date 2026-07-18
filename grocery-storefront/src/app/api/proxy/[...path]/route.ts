import { NextRequest, NextResponse } from 'next/server';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://zira-ai.com/api/v1';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const configuredSlug = process.env.NEXT_PUBLIC_SALON_SLUG?.trim();
  const allowed = Boolean(configuredSlug)
    && path.length === 3
    && path[0] === 'public'
    && path[1] === 'salon'
    && path[2] === configuredSlug;

  if (!allowed || !configuredSlug) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const baseUrl = API_URL.replace(/\/$/, '');
    const url = `${baseUrl}/public/salon/${encodeURIComponent(configuredSlug)}`;

    const response = await fetch(url, { method: 'GET', cache: 'no-store' });
    const data = await response.text();

    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json',
        'Cache-Control': 'no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    console.error('[API Proxy] Allowed salon lookup failed');
    return NextResponse.json({ error: 'Proxy error' }, { status: 502 });
  }
}
