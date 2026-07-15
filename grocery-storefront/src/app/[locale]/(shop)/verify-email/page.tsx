import type { Metadata } from 'next';

import { VerifyEmailPanel } from '@/components/auth/VerifyEmailPanel';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function VerifyEmailPage() {
  return <VerifyEmailPanel />;
}
