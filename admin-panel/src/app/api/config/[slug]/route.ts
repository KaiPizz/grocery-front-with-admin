import { NextRequest, NextResponse } from 'next/server';

import {
  getPublishedCorsHeaders,
  isValidConfigSlug,
  requireAdminTenant,
} from '@/lib/admin-tenant';
import { requireAdminSession } from '@/lib/auth';
import {
  ConfigVersionConflictError,
  getDraftConfig,
  getPublishedConfig,
  patchDraftConfig,
  saveDraftConfig,
} from '@/lib/config-repository';
import { AdminStorageConfigurationError } from '@/lib/admin-storage';
import { partialStorefrontConfigSchema, storefrontConfigSchema } from '@/lib/validation';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

function getExpectedVersion(request: NextRequest): number | null {
  const header = request.headers.get('if-match');
  if (!header || !/^\d+$/.test(header)) return null;
  const version = Number(header);
  return Number.isSafeInteger(version) ? version : null;
}

function preconditionRequired(): NextResponse {
  return NextResponse.json(
    { success: false, error: 'Reload the draft before saving' },
    { status: 428, headers: { 'Cache-Control': 'no-store' } }
  );
}

function versionConflict(error: ConfigVersionConflictError): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'The draft changed in another session. Reload before saving.',
      details: { currentVersion: error.actualVersion },
    },
    { status: 409, headers: { 'Cache-Control': 'no-store' } }
  );
}

function storageUnavailable(): NextResponse {
  return NextResponse.json(
    { success: false, error: 'Config storage is unavailable' },
    { status: 503, headers: { 'Cache-Control': 'no-store' } }
  );
}

/** Public published config, or session-protected admin draft config. */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  if (!isValidConfigSlug(slug)) {
    return NextResponse.json(
      { success: false, error: 'Invalid slug' },
      { status: 400 }
    );
  }

  const isDraft = request.nextUrl.searchParams.get('draft') === 'true';
  if (isDraft) {
    const authError = await requireAdminSession(request);
    if (authError) return authError;
    const tenantError = requireAdminTenant(slug);
    if (tenantError) return tenantError;

    try {
      const envelope = await getDraftConfig(slug);
      return NextResponse.json(
        { success: true, data: envelope },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    } catch (error) {
      if (error instanceof AdminStorageConfigurationError) return storageUnavailable();
      throw error;
    }
  }

  try {
    const envelope = await getPublishedConfig(slug);
    return NextResponse.json(
      { success: true, data: envelope },
      {
        headers: {
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
          ...getPublishedCorsHeaders(request),
        },
      }
    );
  } catch (error) {
    if (error instanceof AdminStorageConfigurationError) return storageUnavailable();
    throw error;
  }
}

/** Session-protected full draft replacement. */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  const authError = await requireAdminSession(request);
  if (authError) return authError;
  const tenantError = requireAdminTenant(slug);
  if (tenantError) return tenantError;
  const expectedVersion = getExpectedVersion(request);
  if (expectedVersion === null) return preconditionRequired();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const result = storefrontConfigSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: 'Validation failed', details: result.error.flatten() },
      { status: 422 }
    );
  }

  let stored;
  try {
    stored = await saveDraftConfig(slug, result.data, expectedVersion);
  } catch (error) {
    if (error instanceof ConfigVersionConflictError) return versionConflict(error);
    if (error instanceof AdminStorageConfigurationError) return storageUnavailable();
    throw error;
  }

  return NextResponse.json({
    success: true,
    data: {
      slug: stored.slug,
      config: stored.draft,
      version: stored.version,
      updatedAt: stored.updatedAt,
    },
    message: 'Draft saved. Use POST /api/config/:slug/publish to make it live.',
  }, { headers: { 'Cache-Control': 'no-store' } });
}

/** Session-protected partial draft update. */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  const authError = await requireAdminSession(request);
  if (authError) return authError;
  const tenantError = requireAdminTenant(slug);
  if (tenantError) return tenantError;
  const expectedVersion = getExpectedVersion(request);
  if (expectedVersion === null) return preconditionRequired();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const result = partialStorefrontConfigSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: 'Validation failed', details: result.error.flatten() },
      { status: 422 }
    );
  }

  let stored;
  try {
    stored = await patchDraftConfig(slug, result.data as never, expectedVersion);
  } catch (error) {
    if (error instanceof ConfigVersionConflictError) return versionConflict(error);
    if (error instanceof AdminStorageConfigurationError) return storageUnavailable();
    throw error;
  }

  return NextResponse.json({
    success: true,
    data: {
      slug: stored.slug,
      config: stored.draft,
      version: stored.version,
      updatedAt: stored.updatedAt,
    },
    message: 'Draft updated.',
  }, { headers: { 'Cache-Control': 'no-store' } });
}
