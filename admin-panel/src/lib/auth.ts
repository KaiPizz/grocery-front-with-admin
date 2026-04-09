import { NextRequest, NextResponse } from 'next/server';

/**
 * Validates the x-api-key header against ADMIN_API_KEY env var.
 * Returns null if authorized, or a 401 NextResponse if not.
 */
export function requireApiKey(request: NextRequest): NextResponse | null {
  const apiKey = process.env.ADMIN_API_KEY;

  if (!apiKey) {
    console.error('[auth] ADMIN_API_KEY is not set in environment');
    return NextResponse.json(
      { success: false, error: 'Server misconfiguration: API key not set' },
      { status: 500 }
    );
  }

  const provided = request.headers.get('x-api-key');

  if (!provided || provided !== apiKey) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: invalid or missing x-api-key' },
      { status: 401 }
    );
  }

  return null;
}
