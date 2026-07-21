import { NextRequest, NextResponse } from 'next/server';
import {
  getAllowedRasterContentType,
  hasExpectedRasterSignature,
  IMAGE_PROXY_TIMEOUT_MS,
  isAllowedImageProxyUrl,
  MAX_PROXIED_IMAGE_BYTES,
} from '@/lib/image-proxy-security';
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

function placeholderResponse(fallbackMode: string | null) {
  if (fallbackMode === 'error') {
    return new NextResponse(null, {
      status: 404,
      headers: {
        'Cache-Control': 'no-store',
        'X-Image-Fallback': 'true',
      },
    });
  }

  return new NextResponse(PLACEHOLDER_SVG, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'X-Content-Type-Options': 'nosniff',
      'X-Image-Fallback': 'true',
    },
  });
}

export async function GET(request: NextRequest) {
  const requestedUrl = request.nextUrl.searchParams.get('url');
  const fallbackMode = request.nextUrl.searchParams.get('fallback');
  const imageUrl = normalizeImageUrl(requestedUrl);

  if (!imageUrl || !isAllowedImageProxyUrl(imageUrl)) {
    return placeholderResponse(fallbackMode);
  }

  try {
    const response = await fetch(imageUrl, {
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
      redirect: 'manual',
      signal: AbortSignal.timeout(IMAGE_PROXY_TIMEOUT_MS),
      next: { revalidate: 3600 },
    });

    if (!response.ok || !response.body) {
      return placeholderResponse(fallbackMode);
    }

    const contentType = getAllowedRasterContentType(response.headers.get('content-type'));
    const declaredSize = Number(response.headers.get('content-length'));
    if (
      !contentType
      || (Number.isFinite(declaredSize) && declaredSize > MAX_PROXIED_IMAGE_BYTES)
    ) {
      await response.body.cancel();
      return placeholderResponse(fallbackMode);
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      totalBytes += value.byteLength;
      if (totalBytes > MAX_PROXIED_IMAGE_BYTES) {
        await reader.cancel();
        return placeholderResponse(fallbackMode);
      }
      chunks.push(value);
    }

    const imageBytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      imageBytes.set(chunk, offset);
      offset += chunk.byteLength;
    }

    if (!hasExpectedRasterSignature(imageBytes, contentType)) {
      return placeholderResponse(fallbackMode);
    }

    return new NextResponse(imageBytes, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(totalBytes),
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        'Content-Security-Policy': "default-src 'none'; sandbox",
        'Cross-Origin-Resource-Policy': 'same-origin',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return placeholderResponse(fallbackMode);
  }
}
