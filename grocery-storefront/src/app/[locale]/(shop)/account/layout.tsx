import { AccountRouteGuard } from '@/components/account/account-route-guard';
import { privateRouteMetadata } from '@/lib/seo-metadata';

export const metadata = privateRouteMetadata;

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <AccountRouteGuard>{children}</AccountRouteGuard>;
}
