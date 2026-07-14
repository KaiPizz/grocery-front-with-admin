import { NextRequest, NextResponse } from 'next/server';

import { requireAdminTenant } from '@/lib/admin-tenant';
import { requireAdminSession } from '@/lib/auth';
import {
  ConfigVersionConflictError,
  PublishValidationError,
  publishConfig,
} from '@/lib/config-repository';
import { AdminStorageConfigurationError } from '@/lib/admin-storage';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

function getExpectedVersion(request: NextRequest): number | null {
  const header = request.headers.get('if-match');
  if (!header || !/^\d+$/.test(header)) return null;
  const version = Number(header);
  return Number.isSafeInteger(version) ? version : null;
}

/** Session-protected draft publication. */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  const authError = await requireAdminSession(request);
  if (authError) return authError;
  const tenantError = requireAdminTenant(slug);
  if (tenantError) return tenantError;

  const expectedVersion = getExpectedVersion(request);
  if (expectedVersion === null) {
    return NextResponse.json(
      { success: false, error: 'Reload the draft before publishing' },
      { status: 428, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  let stored;
  try {
    stored = await publishConfig(slug, expectedVersion);
  } catch (error) {
    if (error instanceof PublishValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          details: { blockingIssues: error.blockingIssues },
        },
        { status: 422, headers: { 'Cache-Control': 'no-store' } }
      );
    }
    if (error instanceof ConfigVersionConflictError) {
      return NextResponse.json(
        {
          success: false,
          error: 'The draft changed in another session. Reload before publishing.',
          details: { currentVersion: error.actualVersion },
        },
        { status: 409, headers: { 'Cache-Control': 'no-store' } }
      );
    }
    if (error instanceof AdminStorageConfigurationError) {
      return NextResponse.json(
        { success: false, error: 'Config storage is unavailable' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } }
      );
    }
    throw error;
  }

  return NextResponse.json({
    success: true,
    data: {
      slug: stored.slug,
      config: stored.published,
      version: stored.version,
      updatedAt: stored.updatedAt,
    },
    message: 'Config published successfully. Storefront will pick up changes within cache TTL.',
  }, { headers: { 'Cache-Control': 'no-store' } });
}
