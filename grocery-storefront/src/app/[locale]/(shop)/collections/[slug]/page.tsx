import { notFound } from 'next/navigation';

import { CommercialLanding } from '@/components/commercial/CommercialLanding';
import { findCommercialCollection } from '@/lib/commercial-config';
import { fetchServerConfig } from '@/lib/storefront-config';

interface CollectionPageProps {
  params: {
    slug: string;
  };
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const siteConfig = await fetchServerConfig();
  const collection = findCommercialCollection(siteConfig, params.slug);

  if (!collection) {
    notFound();
  }

  return <CommercialLanding collection={collection} />;
}
