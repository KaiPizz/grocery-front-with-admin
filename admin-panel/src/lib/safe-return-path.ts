const DEFAULT_ADMIN_RETURN_PATH = '/admin';
const SAFE_ADMIN_PATH = /^\/admin(?:\/[A-Za-z0-9_-]+)*\/?$/;

function decodeRepeatedly(value: string): string | null {
  let decoded = value;

  try {
    for (let pass = 0; pass < 2; pass += 1) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
  } catch {
    return null;
  }

  return decoded;
}
/**
 * Restrict post-login navigation to the admin application itself.
 *
 * The query/hash are preserved for legitimate deep links, but the pathname
 * must remain `/admin` or a simple descendant of `/admin` after URL parsing
 * and repeated decoding. Unsafe input always falls back to the dashboard.
 */
export function getSafeAdminReturnPath(value: string | null | undefined): string {
  const candidate = value?.trim();
  if (!candidate) return DEFAULT_ADMIN_RETURN_PATH;

  const decodedCandidate = decodeRepeatedly(candidate);
  if (
    !decodedCandidate ||
    decodedCandidate.includes('\\') ||
    decodedCandidate.includes('//') ||
    /[\u0000-\u001F\u007F]/.test(decodedCandidate)
  ) {
    return DEFAULT_ADMIN_RETURN_PATH;
  }

  try {
    const base = new URL('https://admin.invalid');
    const parsed = new URL(candidate, base);
    const decodedPathname = decodeRepeatedly(parsed.pathname);

    if (
      parsed.origin !== base.origin ||
      !decodedPathname ||
      !SAFE_ADMIN_PATH.test(decodedPathname)
    ) {
      return DEFAULT_ADMIN_RETURN_PATH;
    }

    return `${decodedPathname}${parsed.search}${parsed.hash}`;
  } catch {
    return DEFAULT_ADMIN_RETURN_PATH;
  }
}
