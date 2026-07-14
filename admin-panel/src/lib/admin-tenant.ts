import { NextRequest, NextResponse } from 'next/server';

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/;

export class AdminTenantConfigurationError extends Error {
  constructor() {
    super('Admin tenant scope is not configured');
    this.name = 'AdminTenantConfigurationError';
  }
}

export function isValidConfigSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug);
}

export function getAllowedAdminSlugs(): ReadonlySet<string> {
  const configured = process.env.ADMIN_ALLOWED_SLUGS?.trim()
    || process.env.NEXT_PUBLIC_SALON_SLUG?.trim();

  if (!configured) throw new AdminTenantConfigurationError();

  const slugs = configured
    .split(',')
    .map((slug) => slug.trim())
    .filter(Boolean);

  if (slugs.length === 0 || slugs.some((slug) => !isValidConfigSlug(slug))) {
    throw new AdminTenantConfigurationError();
  }

  return new Set(slugs);
}

export function requireAdminTenant(slug: string): NextResponse | null {
  if (!isValidConfigSlug(slug)) {
    return NextResponse.json(
      { success: false, error: 'Invalid slug' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  try {
    if (getAllowedAdminSlugs().has(slug)) return null;
  } catch (error) {
    if (error instanceof AdminTenantConfigurationError) {
      console.error('[admin] Tenant scope is not configured securely');
      return NextResponse.json(
        { success: false, error: 'Admin service unavailable' },
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

/**
 * Published config is public and may be read by explicitly allowlisted
 * storefront origins. Admin and mutation APIs never receive CORS headers.
 */
export function getPublishedCorsHeaders(request: NextRequest): Record<string, string> {
  const requestOrigin = request.headers.get('origin');
  if (!requestOrigin || requestOrigin === 'null') return {};

  const configured = process.env.STOREFRONT_ORIGINS?.trim()
    || process.env.CORS_ORIGIN?.trim();
  if (!configured) return { Vary: 'Origin' };

  if (configured === '*' && process.env.NODE_ENV !== 'production') {
    return {
      'Access-Control-Allow-Origin': '*',
      Vary: 'Origin',
    };
  }

  let normalizedOrigin: string;
  try {
    normalizedOrigin = new URL(requestOrigin).origin;
  } catch {
    return { Vary: 'Origin' };
  }

  const allowed = configured
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .some((origin) => {
      try {
        return new URL(origin).origin === normalizedOrigin;
      } catch {
        return false;
      }
    });

  return allowed
    ? { 'Access-Control-Allow-Origin': normalizedOrigin, Vary: 'Origin' }
    : { Vary: 'Origin' };
}
