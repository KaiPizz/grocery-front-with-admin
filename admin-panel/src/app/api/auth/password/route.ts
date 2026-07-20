import { NextRequest, NextResponse } from 'next/server';

import {
  AdminAuthStateConflictError,
  replaceAdminPasswordHash,
} from '@/lib/admin-auth-state';
import { authenticateAdminSession } from '@/lib/auth';
import { getClientIp } from '@/lib/login-rate-limit';
import {
  clearPasswordChangeRateLimit,
  reservePasswordChangeAttempt,
} from '@/lib/password-change-rate-limit';
import {
  constantTimeStringEqual,
  createPasswordHash,
  PasswordConfigurationError,
  verifyPassword,
} from '@/lib/password';
import { clearSessionCookie } from '@/lib/session';

const MIN_PASSWORD_LENGTH = 16;
const MAX_PASSWORD_LENGTH = 1024;
const MAX_REQUEST_BYTES = 8 * 1024;

interface PasswordChangeBody {
  currentPassword: string;
  newPassword: string;
  confirmation: string;
}

function response(
  status: number,
  code?: string,
  headers: Record<string, string> = {}
): NextResponse {
  return NextResponse.json(
    code ? { success: false, code } : { success: true },
    { status, headers: { 'Cache-Control': 'no-store', ...headers } }
  );
}

async function readBody(request: NextRequest): Promise<PasswordChangeBody | null> {
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.startsWith('application/json')) return null;

  const declaredLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) return null;

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return null;
  }
  if (Buffer.byteLength(raw, 'utf8') > MAX_REQUEST_BYTES) return null;

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const body = value as Record<string, unknown>;
  const keys = Object.keys(body).sort();
  const expectedKeys = ['confirmation', 'currentPassword', 'newPassword'];
  if (
    keys.length !== expectedKeys.length ||
    keys.some((key, index) => key !== expectedKeys[index]) ||
    typeof body.currentPassword !== 'string' ||
    typeof body.newPassword !== 'string' ||
    typeof body.confirmation !== 'string' ||
    body.currentPassword.length < 1 ||
    body.currentPassword.length > MAX_PASSWORD_LENGTH ||
    body.newPassword.length > MAX_PASSWORD_LENGTH ||
    body.confirmation.length > MAX_PASSWORD_LENGTH
  ) {
    return null;
  }

  return body as unknown as PasswordChangeBody;
}

export async function POST(request: NextRequest) {
  const authentication = await authenticateAdminSession(request);
  if (!authentication.authenticated) return authentication.response;

  const body = await readBody(request);
  if (!body) return response(400, 'INVALID_REQUEST');
  if (body.newPassword.length < MIN_PASSWORD_LENGTH) {
    return response(422, 'PASSWORD_TOO_SHORT');
  }
  if (body.newPassword !== body.confirmation) {
    return response(422, 'PASSWORD_MISMATCH');
  }
  if (constantTimeStringEqual(body.currentPassword, body.newPassword)) {
    return response(422, 'PASSWORD_UNCHANGED');
  }

  const clientIp = getClientIp(request);
  const reservation = reservePasswordChangeAttempt(
    clientIp,
    authentication.session.nonce
  );
  if (reservation.limited) {
    return response(429, 'TOO_MANY_ATTEMPTS', {
      'Retry-After': String(reservation.retryAfterSeconds),
    });
  }

  try {
    const currentPasswordMatches = await verifyPassword(
      body.currentPassword,
      authentication.authState.passwordHash
    );
    if (!currentPasswordMatches) return response(401, 'CURRENT_PASSWORD_INVALID');

    const passwordHash = await createPasswordHash(body.newPassword);
    await replaceAdminPasswordHash(authentication.authState, passwordHash);
    clearPasswordChangeRateLimit(clientIp, authentication.session.nonce);
    await clearSessionCookie();
    return response(200);
  } catch (error) {
    if (error instanceof AdminAuthStateConflictError) {
      return response(409, 'SESSION_CHANGED');
    }
    if (error instanceof PasswordConfigurationError) {
      console.error('[auth] Admin password state is not configured securely');
    } else {
      console.error('[auth] Admin password change failed');
    }
    return response(503, 'SERVICE_UNAVAILABLE');
  }
}
