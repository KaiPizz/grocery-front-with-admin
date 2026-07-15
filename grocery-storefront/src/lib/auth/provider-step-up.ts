import 'server-only';

import {
  createHmac,
  timingSafeEqual,
} from 'node:crypto';
import type { NextRequest, NextResponse } from 'next/server';

import { normalizeCustomerAuthBffSecret } from './google-oauth';

export const PROVIDER_STEP_UP_COOKIE_NAME = 'grocery_provider_step_up';
export const PROVIDER_STEP_UP_MAX_AGE_SECONDS = 5 * 60;
export const PROVIDER_STEP_UP_MAX_COOKIE_VALUE_BYTES = 3_800;

const STEP_UP_PROOF_PATTERN = /^[A-Za-z0-9._~-]{32,4096}$/;
const STEP_UP_COOKIE_MAC_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function normalizeProviderStepUpProof(value: unknown): string | null {
  return typeof value === 'string' && STEP_UP_PROOF_PATTERN.test(value)
    ? value
    : null;
}

export function readProviderStepUpProof(request: NextRequest): string | null {
  const value = request.cookies.get(PROVIDER_STEP_UP_COOKIE_NAME)?.value ?? '';
  if (Buffer.byteLength(value, 'utf8') > PROVIDER_STEP_UP_MAX_COOKIE_VALUE_BYTES) return null;
  const separator = value.lastIndexOf('~');
  if (separator <= 0) return null;

  const proof = normalizeProviderStepUpProof(value.slice(0, separator));
  const actualMac = value.slice(separator + 1);
  const secret = normalizeCustomerAuthBffSecret(process.env.CUSTOMER_AUTH_BFF_SECRET);
  if (!proof || !secret || !STEP_UP_COOKIE_MAC_PATTERN.test(actualMac)) return null;

  const expectedMac = stepUpCookieMac(proof, secret);
  const actualBuffer = Buffer.from(actualMac, 'ascii');
  const expectedBuffer = Buffer.from(expectedMac, 'ascii');
  return actualBuffer.length === expectedBuffer.length
    && timingSafeEqual(actualBuffer, expectedBuffer)
    ? proof
    : null;
}

export function setProviderStepUpCookie(
  response: NextResponse,
  proof: string,
  expiresIn: number | null | undefined,
): boolean {
  const normalizedProof = normalizeProviderStepUpProof(proof);
  const secret = normalizeCustomerAuthBffSecret(process.env.CUSTOMER_AUTH_BFF_SECRET);
  if (!normalizedProof || !secret) return false;

  const cookieValue = `${normalizedProof}~${stepUpCookieMac(normalizedProof, secret)}`;
  if (Buffer.byteLength(cookieValue, 'utf8') > PROVIDER_STEP_UP_MAX_COOKIE_VALUE_BYTES) {
    return false;
  }

  const maxAge = typeof expiresIn === 'number' && Number.isFinite(expiresIn)
    ? Math.max(1, Math.min(PROVIDER_STEP_UP_MAX_AGE_SECONDS, Math.floor(expiresIn)))
    : PROVIDER_STEP_UP_MAX_AGE_SECONDS;
  response.cookies.set(
    PROVIDER_STEP_UP_COOKIE_NAME,
    cookieValue,
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth',
      maxAge,
    },
  );
  return true;
}

function stepUpCookieMac(proof: string, secret: string): string {
  return createHmac('sha256', secret)
    .update('grocery-provider-step-up-v1\0', 'utf8')
    .update(proof, 'utf8')
    .digest('base64url');
}

export function clearProviderStepUpCookie(response: NextResponse): void {
  response.cookies.set(PROVIDER_STEP_UP_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: 0,
    expires: new Date(0),
  });
}
