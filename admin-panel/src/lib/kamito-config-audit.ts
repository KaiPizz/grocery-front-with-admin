import type { BannerBlock, StorefrontConfig } from '../types/config';

export interface KamitoConfigAuditIssue {
  id: string;
  message: string;
}

function collectStrings(value: unknown, strings: string[] = []): string[] {
  if (typeof value === 'string') {
    strings.push(value);
    return strings;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectStrings(item, strings));
    return strings;
  }

  if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => collectStrings(item, strings));
  }

  return strings;
}

function hasMissingEnabledBlockMedia(block: BannerBlock): boolean {
  if (!block.enabled) return false;

  if (block.type === 'hero') {
    return block.slides.some((slide) => slide.enabled && !slide.imageUrl);
  }

  if (block.type === 'horizontal' || block.type === 'sidebar') {
    return !block.imageUrl;
  }

  if (block.type === 'small_sticky') {
    return !block.desktopImageUrl || !block.mobileImageUrl;
  }

  return block.items.some((item) => item.enabled && !item.imageUrl);
}

export function auditKamitoConfig(config: StorefrontConfig): KamitoConfigAuditIssue[] {
  const issues: KamitoConfigAuditIssue[] = [];
  const strings = collectStrings(config);

  if (strings.some((value) => value.toLowerCase().includes('localhost'))) {
    issues.push({
      id: 'kamito.localhost-media',
      message: 'Kamito config must not contain localhost media or links.',
    });
  }

  if (strings.some((value) => value.toLowerCase().includes('alo123'))) {
    issues.push({
      id: 'kamito.placeholder-copy',
      message: 'Kamito config still contains placeholder copy.',
    });
  }

  if (strings.some((value) => /asia deli|chesaigon|grocery store/i.test(value))) {
    issues.push({
      id: 'kamito.stale-brand-copy',
      message: 'Kamito config still contains stale non-Kamito brand copy.',
    });
  }

  if (!config.seo.canonical.trim()) {
    issues.push({
      id: 'kamito.canonical-missing',
      message: 'Kamito config needs a production canonical URL.',
    });
  }

  if (!config.general.phone.trim() || !config.general.email.trim() || !config.general.address.trim()) {
    issues.push({
      id: 'kamito.owner-contact-missing',
      message: 'Kamito config needs owner phone, email, and address.',
    });
  }

  if (config.homepage.blocks.some(hasMissingEnabledBlockMedia)) {
    issues.push({
      id: 'kamito.enabled-image-block-missing-media',
      message: 'Enabled Kamito image blocks need production media or must be disabled.',
    });
  }

  return issues;
}
