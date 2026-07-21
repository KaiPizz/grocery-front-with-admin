import { notFound } from 'next/navigation';
import { getLocale } from 'next-intl/server';

import { CommercialLanding } from '@/components/commercial/CommercialLanding';
import { findCommercialCollection } from '@/lib/commercial-config';
import { localizeConfiguredStorefront } from '@/lib/configured-content-localization';
import { fetchServerConfig } from '@/lib/storefront-config';

interface CollectionPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const [{ slug }, locale, rawConfig] = await Promise.all([
    params,
    getLocale(),
    fetchServerConfig(),
  ]);
  const siteConfig = localizeConfiguredStorefront(rawConfig, locale);
  const collection = findCommercialCollection(siteConfig, slug);

  if (!collection) {
    notFound();
  }

  return <CommercialLanding collection={collection} />;
}
