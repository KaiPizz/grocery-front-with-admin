import { NextRequest, NextResponse } from 'next/server';

import { requireSameOrigin } from '@/lib/origin';
import { clearSessionCookie } from '@/lib/session';

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  await clearSessionCookie();
  return NextResponse.json(
    { success: true },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
