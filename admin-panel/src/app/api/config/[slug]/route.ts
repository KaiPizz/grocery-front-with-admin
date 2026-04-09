import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/lib/auth';
import {
  getPublishedConfig,
  getDraftConfig,
  saveDraftConfig,
  patchDraftConfig,
  publishConfig,
} from '@/lib/config-repository';
import { storefrontConfigSchema, partialStorefrontConfigSchema } from '@/lib/validation';

interface RouteParams {
  params: { slug: string };
}

/**
 * GET /api/config/:slug
 * Public: returns published config (default).
 * With ?draft=true header + api key: returns draft config (for admin editing).
 * With ?publish=true + api key: publishes draft → published.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { slug } = params;

  if (!slug || slug.length > 200) {
    return NextResponse.json(
      { success: false, error: 'Invalid slug' },
      { status: 400 }
    );
  }

  const isDraft = request.nextUrl.searchParams.get('draft') === 'true';

  if (isDraft) {
    const authError = requireApiKey(request);
    if (authError) return authError;

    const envelope = await getDraftConfig(slug);
    return NextResponse.json({ success: true, data: envelope });
  }

  const envelope = await getPublishedConfig(slug);
  return NextResponse.json(
    { success: true, data: envelope },
    {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
      },
    }
  );
}

/**
 * PUT /api/config/:slug
 * Admin-only: full config replacement (saves to draft).
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { slug } = params;

  const authError = requireApiKey(request);
  if (authError) return authError;

  if (!slug || slug.length > 200) {
    return NextResponse.json(
      { success: false, error: 'Invalid slug' },
      { status: 400 }
    );
  }

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

  const stored = await saveDraftConfig(slug, result.data);

  return NextResponse.json({
    success: true,
    data: {
      slug: stored.slug,
      config: stored.draft,
      version: stored.version,
      updatedAt: stored.updatedAt,
    },
    message: 'Draft saved. Use POST /api/config/:slug/publish to make it live.',
  });
}

/**
 * PATCH /api/config/:slug
 * Admin-only: partial config update (merges into draft).
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { slug } = params;

  const authError = requireApiKey(request);
  if (authError) return authError;

  if (!slug || slug.length > 200) {
    return NextResponse.json(
      { success: false, error: 'Invalid slug' },
      { status: 400 }
    );
  }

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

  const stored = await patchDraftConfig(slug, result.data as never);

  return NextResponse.json({
    success: true,
    data: {
      slug: stored.slug,
      config: stored.draft,
      version: stored.version,
      updatedAt: stored.updatedAt,
    },
    message: 'Draft updated.',
  });
}

/**
 * Handle OPTIONS for CORS preflight.
 */
export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
