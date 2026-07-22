import type { Metadata } from 'next';

import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { privateRouteMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = {
  ...privateRouteMetadata,
  referrer: 'no-referrer',
};

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
