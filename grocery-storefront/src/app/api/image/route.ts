import { NextRequest, NextResponse } from 'next/server';
import { normalizeImageUrl } from '@/lib/utils';

const PLACEHOLDER_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" role="img" aria-label="Image unavailable">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f0fdf4" />
      <stop offset="100%" stop-color="#dcfce7" />
    </linearGradient>
  </defs>
  <rect width="600" height="600" fill="url(#bg)" />
  <circle cx="300" cy="220" r="84" fill="#16a34a" opacity="0.12" />
  <path d="M196 380c35-67 88-100 158-100s123 33 158 100" fill="none" stroke="#16a34a" stroke-linecap="round" stroke-width="28" opacity="0.3" />
  <rect x="138" y="136" width="324" height="324" rx="36" fill="none" stroke="#16a34a" stroke-width="20" opacity="0.18" />
  <text x="300" y="510" text-anchor="middle" fill="#166534" font-family="Arial, sans-serif" font-size="32" font-weight="700">Grocery</text>
</svg>
`.trim();

function placeholderResponse() {
  return new NextResponse(PLACEHOLDER_SVG, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'X-Image-Fallback': 'true',
    },
  });
}

export async function GET(request: NextRequest) {
  const requestedUrl = request.nextUrl.searchParams.get('url');
  const imageUrl = normalizeImageUrl(requestedUrl);

  if (!imageUrl || (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://'))) {
    return placeholderResponse();
  }

  try {
    const response = await fetch(imageUrl, {
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok || !response.body) {
      return placeholderResponse();
    }

    return new NextResponse(response.body, {
      status: 200,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch {
    return placeholderResponse();
  }
}
