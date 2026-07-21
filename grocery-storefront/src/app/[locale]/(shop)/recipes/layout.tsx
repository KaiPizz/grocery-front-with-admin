import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { getConfiguredPublicRouteMetadata } from '@/lib/seo-metadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return getConfiguredPublicRouteMetadata(locale, 'recipes', '/recipes');
}

export default function RecipesLayout({ children }: { children: ReactNode }) {
  return children;
}
