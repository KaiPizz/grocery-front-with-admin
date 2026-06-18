import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/lib/auth';
import { PublishValidationError, publishConfig } from '@/lib/config-repository';

interface RouteParams {
  params: { slug: string };
}

/**
 * POST /api/config/:slug/publish
 * Admin-only: copies draft → published, making it live for the storefront.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { slug } = params;

  const authError = requireApiKey(request);
  if (authError) return authError;

  if (!slug || slug.length > 200) {
    return NextResponse.json(
      { success: false, error: 'Invalid slug' },
      { status: 400 }
    );
  }

  let stored;
  try {
    stored = await publishConfig(slug);
  } catch (err) {
    if (err instanceof PublishValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: err.message,
          details: {
            blockingIssues: err.blockingIssues,
          },
        },
        { status: 422 }
      );
    }

    throw err;
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
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
