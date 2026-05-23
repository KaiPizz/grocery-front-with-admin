import { notFound } from 'next/navigation';

import { CommercialLanding } from '@/components/commercial/CommercialLanding';
import { getOutletCollection } from '@/lib/commercial-config';
import { fetchServerConfig } from '@/lib/storefront-config';

export default async function OutletPage() {
  const siteConfig = await fetchServerConfig();
  const collection = getOutletCollection(siteConfig);

  if (!collection) {
    notFound();
  }

  return (
    <CommercialLanding
      collection={collection}
      title={siteConfig?.commercial.outlet.label || 'Outlet'}
    />
  );
}
