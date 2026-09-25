import { redirect } from '@/i18n/navigation';

// Polish alias required by the Przelewy24 store checklist; the canonical page is /contact.
export default async function KontaktRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: '/contact', locale });
}
