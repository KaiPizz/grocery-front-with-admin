const CLIENT_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/;

export function getClientSalonSlug(): string {
  const slug = process.env.NEXT_PUBLIC_SALON_SLUG?.trim();
  if (!slug || !CLIENT_SLUG_PATTERN.test(slug)) {
    throw new Error('NEXT_PUBLIC_SALON_SLUG is not configured');
  }
  return slug;
}
