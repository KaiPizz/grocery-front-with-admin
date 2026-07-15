const TRACKABLE_PUBLIC_ROUTE_PREFIXES = [
  '/products',
  '/categories',
  '/collections',
  '/recipes',
  '/outlet',
] as const;

export function isTrackingAllowedRoute(routePath: string): boolean {
  const normalizedRoutePath = normalizeTrackingRoutePath(routePath);
  if (normalizedRoutePath === '/') return true;
  return TRACKABLE_PUBLIC_ROUTE_PREFIXES.some(
    (prefix) => normalizedRoutePath === prefix || normalizedRoutePath.startsWith(`${prefix}/`),
  );
}

export function normalizeTrackingRoutePath(pathname: string): string {
  return pathname.replace(/^\/(?:pl|en)(?=\/|$)/, '') || '/';
}

export function shouldReloadForTrackingPrivacy(previousPath: string, nextPath: string): boolean {
  return isTrackingAllowedRoute(previousPath) && !isTrackingAllowedRoute(nextPath);
}
