import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { getConfiguredPublicRouteMetadata } from '@/lib/seo-metadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return getConfiguredPublicRouteMetadata(locale, 'privacy', '/privacy');
}

export default function PrivacyLayout({ children }: { children: ReactNode }) {
  return children;
}
