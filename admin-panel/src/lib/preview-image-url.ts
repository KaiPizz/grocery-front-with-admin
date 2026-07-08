function getStorefrontOriginFromAdminHost(): string | null {
  if (typeof window === 'undefined') return null;

  const { protocol, host } = window.location;
  if (host.startsWith('asiandeligo-admin.')) {
    return `${protocol}//${host.replace('asiandeligo-admin.', 'asiandeligo.')}`;
  }

  return null;
}

export function resolvePreviewImageUrl(value: string | null | undefined): string | null {
  const url = value?.trim();
  if (!url) return null;

  if (/^(https?:|data:|blob:|\/\/)/i.test(url)) return url;
  if (!url.startsWith('/')) return url;

  if (url.startsWith('/uploads/')) return url;

  const storefrontOrigin =
    process.env.NEXT_PUBLIC_STOREFRONT_ORIGIN?.replace(/\/$/, '') ??
    getStorefrontOriginFromAdminHost();

  return storefrontOrigin ? `${storefrontOrigin}${url}` : url;
}
