import { NextRequest, NextResponse } from 'next/server';

import {
  AdminAuthStateConflictError,
  revokeAllAdminSessions,
} from '@/lib/admin-auth-state';
import { authenticateAdminSession } from '@/lib/auth';
import { clearSessionCookie } from '@/lib/session';

export async function POST(request: NextRequest) {
  const authentication = await authenticateAdminSession(request);

  if (!authentication.authenticated) {
    if (authentication.response.status === 401) {
      await clearSessionCookie();
      return NextResponse.json(
        { success: true },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }
    return authentication.response;
  }

  try {
    await revokeAllAdminSessions(authentication.authState);
  } catch (error) {
    // A concurrent password change/logout already revoked this exact session,
    // so logout is complete even though our compare-and-swap lost the race.
    if (error instanceof AdminAuthStateConflictError) {
      await clearSessionCookie();
      return NextResponse.json(
        { success: true },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }
    console.error('[auth] Could not revoke admin sessions during logout');
    return NextResponse.json(
      { success: false, error: 'Authentication service unavailable' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  await clearSessionCookie();
  return NextResponse.json(
    { success: true },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
