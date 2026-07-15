import type { NextRequest } from 'next/server';

const MAX_JSON_BODY_BYTES = 1024 * 1024;

function firstForwardedValue(value: string | null): string | null {
  return value?.split(',')[0]?.trim() || null;
}

function expectedRequestOrigin(request: NextRequest): string {
  const protocol = firstForwardedValue(request.headers.get('x-forwarded-proto'))
    ?? request.nextUrl.protocol.replace(':', '');
  // Host is browser-forbidden and our edge proxy overwrites it. Never let a
  // client-supplied X-Forwarded-Host participate in a CSRF trust decision.
  const host = request.headers.get('host')
    ?? request.nextUrl.host;
  return `${protocol}://${host}`;
}

export function validateJsonMutationRequest(request: NextRequest): string | null {
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.startsWith('application/json')) {
    return 'Content-Type must be application/json.';
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_JSON_BODY_BYTES) {
    return 'Request body is too large.';
  }

  if (request.headers.get('sec-fetch-site') === 'cross-site') {
    return 'Cross-site request rejected.';
  }

  const origin = request.headers.get('origin');
  if (origin) {
    try {
      if (new URL(origin).origin !== expectedRequestOrigin(request)) {
        return 'Request origin rejected.';
      }
    } catch {
      return 'Request origin rejected.';
    }
  }

  return null;
}
