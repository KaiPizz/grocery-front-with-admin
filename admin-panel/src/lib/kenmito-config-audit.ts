import type { BannerBlock, StorefrontConfig } from '../types/config';

export interface KenmitoConfigAuditIssue {
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

export function auditKenmitoConfig(config: StorefrontConfig): KenmitoConfigAuditIssue[] {
  const issues: KenmitoConfigAuditIssue[] = [];
  const strings = collectStrings(config);

  if (strings.some((value) => value.toLowerCase().includes('localhost'))) {
    issues.push({
      id: 'kenmito.localhost-media',
      message: 'Kenmito config must not contain localhost media or links.',
    });
  }

  if (strings.some((value) => value.toLowerCase().includes('alo123'))) {
    issues.push({
      id: 'kenmito.placeholder-copy',
      message: 'Kenmito config still contains placeholder copy.',
    });
  }

  if (strings.some((value) => /asia deli|chesaigon|grocery store/i.test(value))) {
    issues.push({
      id: 'kenmito.stale-brand-copy',
      message: 'Kenmito config still contains stale non-Kenmito brand copy.',
    });
  }

  if (!config.seo.canonical.trim()) {
    issues.push({
      id: 'kenmito.canonical-missing',
      message: 'Kenmito config needs a production canonical URL.',
    });
  }

  if (!config.general.phone.trim() || !config.general.email.trim() || !config.general.address.trim()) {
    issues.push({
      id: 'kenmito.owner-contact-missing',
      message: 'Kenmito config needs owner phone, email, and address.',
    });
  }

  if (config.homepage.blocks.some(hasMissingEnabledBlockMedia)) {
    issues.push({
      id: 'kenmito.enabled-image-block-missing-media',
      message: 'Enabled Kenmito image blocks need production media or must be disabled.',
    });
  }

  return issues;
}
