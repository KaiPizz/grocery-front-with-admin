const ALLOWED_RETURN_PREFIXES = ['/account', '/wishlist', '/checkout', '/cart'] as const;
const LOCALE_PREFIX = /^\/(?:pl|en)(?=\/|$)/;
const CONTROL_OR_BACKSLASH = /[\\\u0000-\u001f\u007f]/;

export function safeReturnPath(
  rawValue: string | null | undefined,
  fallback = '/wishlist',
): string {
  if (!rawValue || rawValue.length > 2048) {
    return fallback;
  }

  try {
    const base = new URL('https://storefront.invalid');
    let probe = rawValue;

    for (let depth = 0; depth < 4; depth += 1) {
      const probePath = probe.split(/[?#]/, 1)[0];
      const hasTraversalSegment = probePath
        .split('/')
        .some((segment) => segment === '.' || segment === '..');
      if (
        CONTROL_OR_BACKSLASH.test(probe)
        || !probe.startsWith('/')
        || probe.startsWith('//')
        || /%(?:2f|5c)/i.test(probePath)
        || hasTraversalSegment
      ) {
        return fallback;
      }

      const probeUrl = new URL(probe, base);
      if (probeUrl.origin !== base.origin) return fallback;
      const normalizedProbePath = probeUrl.pathname.replace(LOCALE_PREFIX, '') || '/';
      const probeAllowed = ALLOWED_RETURN_PREFIXES.some(
        (prefix) => normalizedProbePath === prefix || normalizedProbePath.startsWith(`${prefix}/`),
      );
      if (!probeAllowed) return fallback;

      const decoded = decodeURIComponent(probe);
      if (decoded === probe) break;
      if (depth === 3) return fallback;
      probe = decoded;
    }

    const parsed = new URL(rawValue, base);
    const pathname = parsed.pathname.replace(LOCALE_PREFIX, '') || '/';
    const allowed = ALLOWED_RETURN_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
    if (!allowed) return fallback;

    return `${pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
