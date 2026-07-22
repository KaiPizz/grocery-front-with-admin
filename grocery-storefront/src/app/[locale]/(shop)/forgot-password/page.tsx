import type { Metadata } from 'next';

import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { privateRouteMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = {
  ...privateRouteMetadata,
  referrer: 'no-referrer',
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
