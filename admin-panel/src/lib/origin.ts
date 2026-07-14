import { NextRequest, NextResponse } from 'next/server';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export class OriginConfigurationError extends Error {
  constructor() {
    super('Admin public origin is not configured securely');
    this.name = 'OriginConfigurationError';
  }
}

function getExpectedOrigin(request: NextRequest): string {
  const configured = process.env.ADMIN_PUBLIC_ORIGIN?.trim();

  if (!configured) {
    if (process.env.NODE_ENV === 'production') {
      throw new OriginConfigurationError();
    }
    return request.nextUrl.origin;
  }

  try {
    const url = new URL(configured);
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new OriginConfigurationError();
    }
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
      throw new OriginConfigurationError();
    }
    return url.origin;
  } catch (error) {
    if (error instanceof OriginConfigurationError) throw error;
    throw new OriginConfigurationError();
  }
}

export function isSameOriginRequest(request: NextRequest): boolean {
  if (!UNSAFE_METHODS.has(request.method.toUpperCase())) return true;

  const suppliedOrigin = request.headers.get('origin');
  if (!suppliedOrigin || suppliedOrigin === 'null') return false;

  try {
    return new URL(suppliedOrigin).origin === getExpectedOrigin(request);
  } catch (error) {
    if (error instanceof OriginConfigurationError) throw error;
    return false;
  }
}

export function requireSameOrigin(request: NextRequest): NextResponse | null {
  try {
    if (isSameOriginRequest(request)) return null;
  } catch (error) {
    if (error instanceof OriginConfigurationError) {
      console.error('[auth] Admin public origin is not configured securely');
      return NextResponse.json(
        { success: false, error: 'Authentication service unavailable' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } }
      );
    }
    throw error;
  }

  return NextResponse.json(
    { success: false, error: 'Forbidden' },
    { status: 403, headers: { 'Cache-Control': 'no-store' } }
  );
}
