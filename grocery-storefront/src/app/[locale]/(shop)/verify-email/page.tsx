import type { Metadata } from 'next';

import { VerifyEmailPanel } from '@/components/auth/VerifyEmailPanel';
import { privateRouteMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = {
  ...privateRouteMetadata,
  referrer: 'no-referrer',
};

export default function VerifyEmailPage() {
  return <VerifyEmailPanel />;
}
