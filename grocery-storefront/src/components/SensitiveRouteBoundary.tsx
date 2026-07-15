'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { shouldReloadForTrackingPrivacy } from '@/lib/tracking-policy';

export function SensitiveRouteBoundary({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const previousPathRef = useRef(pathname);
  const leftTrackableRoute = shouldReloadForTrackingPrivacy(previousPathRef.current, pathname);

  useEffect(() => {
    if (leftTrackableRoute) {
      window.location.replace(window.location.href);
      return;
    }

    previousPathRef.current = pathname;
  }, [leftTrackableRoute, pathname]);

  if (leftTrackableRoute) return null;
  return children;
}
