function getStorefrontOriginFromAdminHost(): string | null {
  if (typeof window === 'undefined') return null;

  const { protocol, host } = window.location;
  // asiandeligo.eshoper.pro answers 410 since the move to asiadeligo.com, so
  // /brand/* previews must come from the shop's own domain.
  if (host.startsWith('asiandeligo-admin.')) return 'https://asiadeligo.com';
  if (host.startsWith('adg-dev-admin.')) {
    return `${protocol}//${host.replace('adg-dev-admin.', 'adg-dev.')}`;
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
