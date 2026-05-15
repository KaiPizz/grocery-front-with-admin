import { DEFAULT_CONFIG } from './defaults';

import type { BannerBlock, StorefrontConfig } from '../types/config';

export type ReadinessSeverity = 'blocking' | 'recommended' | 'optional';
export type SetupSectionId = 'branding' | 'homepage' | 'layout' | 'general' | 'seo' | 'tracking';
export type SetupSectionState = 'blocking' | 'recommended' | 'optional' | 'complete';

export interface ReadinessIssue {
  id: string;
  sectionId: SetupSectionId;
  severity: ReadinessSeverity;
}

export interface SetupSection {
  id: SetupSectionId;
  href: string;
  state: SetupSectionState;
  issues: ReadinessIssue[];
}

export interface AdminReadiness {
  canPublish: boolean;
  blockingIssues: ReadinessIssue[];
  recommendedIssues: ReadinessIssue[];
  optionalIssues: ReadinessIssue[];
  sections: SetupSection[];
  firstBlockingSection: SetupSection | null;
}

const SETUP_SECTION_DEFS: Array<Pick<SetupSection, 'id' | 'href'>> = [
  { id: 'branding', href: '/admin/branding' },
  { id: 'homepage', href: '/admin/homepage' },
  { id: 'layout', href: '/admin/layout-config' },
  { id: 'general', href: '/admin/general' },
  { id: 'seo', href: '/admin/seo' },
  { id: 'tracking', href: '/admin/tracking' },
];

const PUBLISH_BLOCKER_MESSAGES: Record<string, string> = {
  'homepage.hero-slide-image-missing': 'Cannot publish: a hero slide is missing its desktop image.',
  'homepage.horizontal-image-missing': 'Cannot publish: a horizontal banner is missing its desktop image.',
  'homepage.grid-item-image-missing': 'Cannot publish: a grid tile is missing its image.',
  'homepage.round-grid-item-image-missing': 'Cannot publish: a round-grid tile is missing its image.',
  'homepage.sidebar-image-missing': 'Cannot publish: a sidebar banner is missing its image.',
  'homepage.sticky-desktop-image-missing': 'Cannot publish: a sticky banner is missing its desktop image.',
  'homepage.sticky-mobile-image-missing': 'Cannot publish: a sticky banner is missing its mobile image.',
  'tracking.facebook-pixel-id-missing': 'Cannot publish: Facebook Pixel is enabled but has no Pixel ID.',
  'tracking.google-analytics-id-missing': 'Cannot publish: Google Analytics is enabled but has no Measurement ID.',
  'tracking.google-tag-manager-id-missing': 'Cannot publish: Google Tag Manager is enabled but has no Container ID.',
  'tracking.hotjar-id-missing': 'Cannot publish: Hotjar is enabled but has no Site ID.',
};

function makeIssue(id: string, sectionId: SetupSectionId, severity: ReadinessSeverity): ReadinessIssue {
  return { id, sectionId, severity };
}

function collectBannerBlockIssues(blocks: BannerBlock[]): ReadinessIssue[] {
  const issues: ReadinessIssue[] = [];

  for (const block of blocks) {
    if (!block.enabled) continue;

    switch (block.type) {
      case 'hero':
        for (const slide of block.slides) {
          if (slide.enabled && !slide.imageUrl) {
            issues.push(makeIssue('homepage.hero-slide-image-missing', 'homepage', 'blocking'));
          }
        }
        break;
      case 'horizontal':
        if (!block.imageUrl) {
          issues.push(makeIssue('homepage.horizontal-image-missing', 'homepage', 'blocking'));
        }
        break;
      case 'grid':
        for (const item of block.items) {
          if (item.enabled && !item.imageUrl) {
            issues.push(makeIssue('homepage.grid-item-image-missing', 'homepage', 'blocking'));
          }
        }
        break;
      case 'round_grid':
        for (const item of block.items) {
          if (item.enabled && !item.imageUrl) {
            issues.push(makeIssue('homepage.round-grid-item-image-missing', 'homepage', 'blocking'));
          }
        }
        break;
      case 'sidebar':
        if (!block.imageUrl) {
          issues.push(makeIssue('homepage.sidebar-image-missing', 'homepage', 'blocking'));
        }
        break;
      case 'small_sticky':
        if (!block.desktopImageUrl) {
          issues.push(makeIssue('homepage.sticky-desktop-image-missing', 'homepage', 'blocking'));
        }
        if (!block.mobileImageUrl) {
          issues.push(makeIssue('homepage.sticky-mobile-image-missing', 'homepage', 'blocking'));
        }
        break;
    }
  }

  return issues;
}

function collectTrackingIssues(config: StorefrontConfig): ReadinessIssue[] {
  const issues: ReadinessIssue[] = [];
  const { tracking } = config;

  if (tracking.facebookPixel.enabled && !tracking.facebookPixel.pixelId.trim()) {
    issues.push(makeIssue('tracking.facebook-pixel-id-missing', 'tracking', 'blocking'));
  }
  if (tracking.googleAnalytics.enabled && !tracking.googleAnalytics.measurementId.trim()) {
    issues.push(makeIssue('tracking.google-analytics-id-missing', 'tracking', 'blocking'));
  }
  if (tracking.googleTagManager.enabled && !tracking.googleTagManager.containerId.trim()) {
    issues.push(makeIssue('tracking.google-tag-manager-id-missing', 'tracking', 'blocking'));
  }
  if (tracking.hotjar.enabled && !tracking.hotjar.siteId.trim()) {
    issues.push(makeIssue('tracking.hotjar-id-missing', 'tracking', 'blocking'));
  }

  const trackingDisabled = !tracking.facebookPixel.enabled
    && !tracking.googleAnalytics.enabled
    && !tracking.googleTagManager.enabled
    && !tracking.hotjar.enabled;

  if (trackingDisabled) {
    issues.push(makeIssue('tracking.disabled', 'tracking', 'optional'));
  }

  return issues;
}

function collectRecommendedIssues(config: StorefrontConfig): ReadinessIssue[] {
  const issues: ReadinessIssue[] = [];

  if (!config.branding.logoUrl) {
    issues.push(makeIssue('branding.logo-missing', 'branding', 'recommended'));
  }

  const storeName = config.branding.storeName.trim();
  if (!storeName || storeName === DEFAULT_CONFIG.branding.storeName) {
    issues.push(makeIssue('branding.store-name-default', 'branding', 'recommended'));
  }

  const contactIncomplete = !config.general.phone.trim()
    || !config.general.email.trim()
    || !config.general.address.trim();
  if (contactIncomplete) {
    issues.push(makeIssue('general.contact-incomplete', 'general', 'recommended'));
  }

  const usingDefaultSeoTitle = config.seo.defaultTitle.trim() === DEFAULT_CONFIG.seo.defaultTitle;
  const usingDefaultSeoDescription = config.seo.defaultDescription.trim() === DEFAULT_CONFIG.seo.defaultDescription;
  const missingCanonical = !config.seo.canonical.trim();
  if (usingDefaultSeoTitle || usingDefaultSeoDescription || missingCanonical) {
    issues.push(makeIssue('seo.defaults-incomplete', 'seo', 'recommended'));
  }

  return issues;
}

function getSectionState(issues: ReadinessIssue[]): SetupSectionState {
  if (issues.some((issue) => issue.severity === 'blocking')) return 'blocking';
  if (issues.some((issue) => issue.severity === 'recommended')) return 'recommended';
  if (issues.some((issue) => issue.severity === 'optional')) return 'optional';
  return 'complete';
}

export function getAdminReadiness(config: StorefrontConfig): AdminReadiness {
  const issues = [
    ...collectBannerBlockIssues(config.homepage.blocks),
    ...collectTrackingIssues(config),
    ...collectRecommendedIssues(config),
  ];
  const blockingIssues = issues.filter((issue) => issue.severity === 'blocking');
  const recommendedIssues = issues.filter((issue) => issue.severity === 'recommended');
  const optionalIssues = issues.filter((issue) => issue.severity === 'optional');
  const sections = SETUP_SECTION_DEFS.map((section) => {
    const sectionIssues = issues.filter((issue) => issue.sectionId === section.id);
    return {
      ...section,
      state: getSectionState(sectionIssues),
      issues: sectionIssues,
    };
  });

  return {
    canPublish: blockingIssues.length === 0,
    blockingIssues,
    recommendedIssues,
    optionalIssues,
    sections,
    firstBlockingSection: sections.find((section) => section.state === 'blocking') ?? null,
  };
}

export function getPublishBlockerMessage(issue: ReadinessIssue | undefined): string {
  if (!issue) {
    return 'Cannot publish until required setup issues are fixed.';
  }

  return PUBLISH_BLOCKER_MESSAGES[issue.id] ?? 'Cannot publish until required setup issues are fixed.';
}
