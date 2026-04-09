export function resolveChannel(salonSlug?: string | null): string {
  return process.env.NEXT_PUBLIC_CHANNEL
    || salonSlug
    || process.env.NEXT_PUBLIC_SALON_SLUG
    || 'default';
}
