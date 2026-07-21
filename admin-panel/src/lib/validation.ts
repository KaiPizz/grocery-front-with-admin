import { z } from 'zod';

// --- Primitives ---

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6,8}$/, 'Must be a valid hex color');
const unsafeUrlCharacterPattern = /[\u0000-\u001f\u007f\\]/;

function isSafeInternalPath(value: string): boolean {
  if (unsafeUrlCharacterPattern.test(value)) return false;

  if (value.startsWith('/')) {
    // A leading double slash (including a slash followed by a backslash) is
    // interpreted as a protocol-relative URL by browsers.
    return value.length === 1 || (value[1] !== '/' && value[1] !== '\\');
  }

  return value.startsWith('#') || value.startsWith('?');
}

function isSafeHttpUrl(value: string): boolean {
  if (unsafeUrlCharacterPattern.test(value) || !/^https?:\/\//i.test(value)) {
    return false;
  }

  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && Boolean(url.hostname);
  } catch {
    return false;
  }
}

function isSafeContactUrl(value: string): boolean {
  return /^mailto:[^\s@]+@[^\s@]+$/i.test(value)
    || /^tel:\+?[0-9(). -]{3,30}$/i.test(value);
}

function isSafeNavigationUrl(value: string): boolean {
  return isSafeInternalPath(value) || isSafeHttpUrl(value) || isSafeContactUrl(value);
}

const optionalUrl = z.string().trim().max(2000).refine(
  (value) => value === '' || isSafeInternalPath(value) || isSafeHttpUrl(value),
  'Must be an internal path or http(s) URL'
).nullable();

const optionalNavigationUrl = z.string().trim().max(500).refine(
  (value) => value === '' || isSafeNavigationUrl(value),
  'Must be an internal path, fragment, query, http(s), mailto, or tel URL'
);

const requiredNavigationUrl = z.string().trim().min(1).max(500).refine(
  isSafeNavigationUrl,
  'Must be an internal path, fragment, query, http(s), mailto, or tel URL'
);

const optionalExternalUrl = z.string().trim().max(500).refine(
  (value) => value === '' || isSafeHttpUrl(value),
  'Must be an http(s) URL'
);

const optionalCanonicalUrl = z.string().trim().max(500).refine(
  (value) => value === '' || isSafeHttpUrl(value),
  'Must be an absolute http(s) URL'
);

function normalizedTrackingId(pattern: RegExp, message: string, uppercase = false) {
  let schema = z.string().trim().max(100);
  if (uppercase) schema = schema.toUpperCase();

  return schema.refine((value) => value === '' || pattern.test(value), message);
}

const facebookPixelId = normalizedTrackingId(
  /^[1-9]\d{4,19}$/,
  'Must be a numeric Facebook Pixel ID'
);
const googleMeasurementId = normalizedTrackingId(
  /^G-[A-Z0-9]{4,20}$/,
  'Must be a GA4 Measurement ID such as G-XXXXXXXXXX',
  true
);
const googleTagManagerId = normalizedTrackingId(
  /^GTM-[A-Z0-9]{4,20}$/,
  'Must be a Google Tag Manager container ID such as GTM-XXXXXXX',
  true
);
const hotjarSiteId = normalizedTrackingId(
  /^[1-9]\d{0,19}$/,
  'Must be a numeric Hotjar Site ID'
);

// --- Branding ---

const colorsSchema = z.object({
  primary: hexColor,
  primaryHover: hexColor,
  checkoutBtnColor: hexColor.optional(),
  checkoutBtnHoverColor: hexColor.optional(),
  background: hexColor,
  foreground: hexColor,
  accent: hexColor,
  accentForeground: hexColor,
  muted: hexColor,
  mutedForeground: hexColor,
  border: hexColor,
  card: hexColor,
  cardForeground: hexColor,
  destructive: hexColor,
  ring: hexColor,
});

const brandingSchema = z.object({
  logoUrl: optionalUrl,
  faviconUrl: optionalUrl,
  storeName: z.string().min(1).max(200),
  colors: colorsSchema,
});

// --- Homepage ---

const heroBannerSchema = z.object({
  enabled: z.boolean(),
  headline: z.string().max(500),
  subtitle: z.string().max(1000),
  ctaText: z.string().max(100),
  ctaLink: optionalNavigationUrl,
  backgroundImageUrl: optionalUrl,
});

const promoBannerItemSchema = z.object({
  id: z.string().min(1),
  headline: z.string().max(500),
  subtext: z.string().max(1000),
  ctaText: z.string().max(100),
  ctaLink: optionalNavigationUrl,
  gradient: z.string().max(500),
  imageUrl: optionalUrl,
  enabled: z.boolean(),
  order: z.number().int().min(0),
});

const homepageSectionSchema = z.object({
  id: z.enum(['deals', 'freshPicks', 'recipes', 'shopByZone']),
  enabled: z.boolean(),
  order: z.number().int().min(0),
});

// --- Banner Blocks V2 ---

const heroSlideSchema = z.object({
  id: z.string().min(1),
  imageUrl: optionalUrl,
  mobileImageUrl: optionalUrl.optional().default(null),
  title: z.string().max(200),
  ctaText: z.string().max(100),
  ctaLink: optionalNavigationUrl,
  enabled: z.boolean(),
});

const heroBannerBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal('hero'),
  enabled: z.boolean(),
  order: z.number().int().min(0),
  autoPlay: z.boolean(),
  autoPlayInterval: z.number().int().min(1000).max(30000),
  slides: z.array(heroSlideSchema).min(1).max(6),
});

const horizontalBannerBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal('horizontal'),
  enabled: z.boolean(),
  order: z.number().int().min(0),
  imageUrl: optionalUrl,
  mobileImageUrl: optionalUrl.optional().default(null),
  title: z.string().max(200),
  ctaText: z.string().max(100),
  ctaLink: optionalNavigationUrl,
});

const gridItemSchema = z.object({
  id: z.string().min(1),
  imageUrl: optionalUrl,
  title: z.string().max(100),
  href: optionalNavigationUrl,
  enabled: z.boolean(),
});

const gridBannerBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal('grid'),
  enabled: z.boolean(),
  order: z.number().int().min(0),
  columns: z.preprocess((v) => (typeof v === 'number' ? 3 : v), z.literal(3)),
  imageFit: z.enum(['contain', 'cover']).optional(),
  items: z.array(gridItemSchema).max(3),
});

const roundGridBannerBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal('round_grid'),
  enabled: z.boolean(),
  order: z.number().int().min(0),
  columns: z.preprocess((v) => (typeof v === 'number' ? 3 : v), z.literal(3)),
  items: z.array(gridItemSchema).max(3),
});

const sidebarBannerBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal('sidebar'),
  enabled: z.boolean(),
  order: z.number().int().min(0),
  imageUrl: optionalUrl,
  title: z.string().max(200),
  ctaText: z.string().max(100),
  ctaLink: optionalNavigationUrl,
});

const smallStickyBannerBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal('small_sticky'),
  enabled: z.boolean(),
  order: z.number().int().min(0),
  desktopImageUrl: optionalUrl,
  mobileImageUrl: optionalUrl,
  title: z.string().max(200),
  ctaText: z.string().max(100),
  ctaLink: optionalNavigationUrl,
  position: z.enum(['top', 'bottom']),
  dismissible: z.boolean(),
});

const bannerBlockSchema = z.discriminatedUnion('type', [
  heroBannerBlockSchema,
  horizontalBannerBlockSchema,
  gridBannerBlockSchema,
  roundGridBannerBlockSchema,
  sidebarBannerBlockSchema,
  smallStickyBannerBlockSchema,
]);

const VALID_BLOCK_TYPES = new Set(['hero', 'horizontal', 'grid', 'round_grid', 'sidebar', 'small_sticky']);

const homepageSchema = z.object({
  hero: heroBannerSchema,
  promoBanners: z.array(promoBannerItemSchema),
  blocks: z.preprocess(
    (val) => {
      if (!Array.isArray(val)) return [];
      return val.filter((item: unknown) =>
        typeof item === 'object' && item !== null && 'type' in item &&
        VALID_BLOCK_TYPES.has((item as { type: string }).type)
      );
    },
    z.array(bannerBlockSchema)
  ).default([]),
  sections: z.array(homepageSectionSchema),
});

// --- Layout ---

const navItemSchema = z.object({
  label: z.string().min(1).max(100),
  href: requiredNavigationUrl,
  enabled: z.boolean(),
  order: z.number().int().min(0),
});

const footerLinkSchema = z.object({
  label: z.string().min(1).max(100),
  href: optionalNavigationUrl,
});

const footerColumnSchema = z.object({
  title: z.string().min(1).max(100),
  links: z.array(footerLinkSchema),
});

const headerCtaSchema = z.object({
  text: z.string().max(100),
  link: optionalNavigationUrl,
  enabled: z.boolean(),
});

const headerSchema = z.object({
  navItems: z.array(navItemSchema),
  showSearch: z.boolean(),
  showWishlist: z.boolean(),
  showLanguageSwitcher: z.boolean(),
  cta: headerCtaSchema.optional(),
});

const footerSchema = z.object({
  tagline: z.string().max(500),
  columns: z.array(footerColumnSchema),
  copyrightText: z.string().max(300),
});

const priceDisplaySchema = z.object({
  position: z.enum(['below-image', 'overlay', 'inline']),
  showDiscountBadge: z.boolean(),
  showOriginalPrice: z.boolean(),
});

const layoutSchema = z.object({
  header: headerSchema,
  footer: footerSchema,
  priceDisplay: priceDisplaySchema.optional(),
  pricePosition: z.enum(['below-image', 'overlay', 'inline']).optional(),
  bannerPosition: z.enum(['above-products', 'below-hero']),
});

// --- Tracking ---

const facebookPixelSchema = z.object({
  enabled: z.boolean(),
  pixelId: facebookPixelId,
});

const googleAnalyticsSchema = z.object({
  enabled: z.boolean(),
  measurementId: googleMeasurementId,
});

const googleTagManagerSchema = z.object({
  enabled: z.boolean(),
  containerId: googleTagManagerId,
});

const hotjarSchema = z.object({
  enabled: z.boolean(),
  siteId: hotjarSiteId,
});

const trackingSchema = z.object({
  facebookPixel: facebookPixelSchema,
  googleAnalytics: googleAnalyticsSchema,
  googleTagManager: googleTagManagerSchema,
  hotjar: hotjarSchema,
});

// --- SEO ---

const seoSchema = z.object({
  defaultTitle: z.string().max(200),
  defaultDescription: z.string().max(500),
  ogImageUrl: optionalUrl,
  canonical: optionalCanonicalUrl,
});

// --- General ---

const socialLinkSchema = z.object({
  platform: z.string().min(1).max(50),
  url: optionalExternalUrl,
});

const fulfillmentSchema = z.object({
  mode: z.enum(['delivery', 'pickup']),
  paymentPromise: z.enum(['backend', 'bank_transfer']),
  stockDisplayMode: z.enum(['exact_when_low', 'availability_only']),
  pickupInstructions: z.string().max(1000).nullable(),
  bankTransferInstructions: z.string().max(1000).nullable(),
});

const generalSchema = z.object({
  phone: z.string().max(50),
  email: z.string().max(200),
  address: z.string().max(500),
  socialLinks: z.array(socialLinkSchema),
  policyLinks: z.object({
    privacy: optionalNavigationUrl,
    terms: optionalNavigationUrl,
    about: optionalNavigationUrl,
  }),
  freeShippingThreshold: z.number().min(0).max(100000),
  sameDayShippingCutoff: z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/, 'Must be HH:MM'),
  lowStockThreshold: z.number().int().min(0).max(10000),
  fulfillment: fulfillmentSchema.default({
    mode: 'delivery',
    paymentPromise: 'backend',
    stockDisplayMode: 'exact_when_low',
    pickupInstructions: null,
    bankTransferInstructions: null,
  }),
});

// --- Commercial ---

const commercialSurfaceKindSchema = z.enum(['category', 'collection', 'outlet', 'external']);
const collectionSlugSchema = z.string().regex(
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  'Must use lowercase letters, numbers, and hyphens'
);

const commercialCategoryHubItemSchema = z.object({
  id: z.string().trim().min(1).max(120),
  categorySlug: collectionSlugSchema,
  imageUrl: optionalUrl,
  enabled: z.boolean(),
  order: z.number().int().min(0),
});

const commercialCategoryHubItemsSchema = z.array(commercialCategoryHubItemSchema).max(50).superRefine((items, ctx) => {
  const ids = new Set<string>();
  const slugs = new Set<string>();

  items.forEach((item, index) => {
    if (ids.has(item.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [index, 'id'],
        message: 'Category hub item IDs must be unique',
      });
    }
    ids.add(item.id);

    if (slugs.has(item.categorySlug)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [index, 'categorySlug'],
        message: 'Category hub slugs must be unique',
      });
    }
    slugs.add(item.categorySlug);
  });
});

const commercialCategoryHubObjectSchema = z.object({
  enabled: z.boolean(),
  items: commercialCategoryHubItemsSchema,
});

const commercialCategoryHubSchema = commercialCategoryHubObjectSchema.default({
  enabled: true,
  items: [],
});

const commercialQuickLinkSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(100),
  href: requiredNavigationUrl,
  kind: commercialSurfaceKindSchema,
  description: z.string().max(300).nullable(),
  imageUrl: optionalUrl,
  enabled: z.boolean(),
  order: z.number().int().min(0),
});

const commercialCollectionTileSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(120),
  href: requiredNavigationUrl,
  description: z.string().max(300).nullable(),
  imageUrl: optionalUrl,
  enabled: z.boolean(),
  order: z.number().int().min(0),
});

const commercialCollectionSchema = z.object({
  slug: collectionSlugSchema,
  title: z.string().min(1).max(160),
  subtitle: z.string().max(500).nullable(),
  heroImageUrl: optionalUrl,
  enabled: z.boolean(),
  order: z.number().int().min(0),
  tiles: z.array(commercialCollectionTileSchema),
});

const commercialOutletSchema = z.object({
  enabled: z.boolean(),
  label: z.string().min(1).max(100),
  collectionSlug: collectionSlugSchema.nullable(),
});

const commercialObjectSchema = z.object({
  enabled: z.boolean(),
  categoryHub: commercialCategoryHubSchema,
  quickLinks: z.array(commercialQuickLinkSchema),
  collections: z.array(commercialCollectionSchema),
  outlet: commercialOutletSchema,
});

const commercialSchema = commercialObjectSchema.superRefine((commercial, ctx) => {
  if (!commercial.outlet.enabled) return;

  if (!commercial.outlet.collectionSlug) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['outlet', 'collectionSlug'],
      message: 'Enabled outlet requires a collection slug',
    });
    return;
  }

  const collectionExists = commercial.collections.some(
    (collection) => collection.slug === commercial.outlet.collectionSlug
  );

  if (!collectionExists) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['outlet', 'collectionSlug'],
      message: 'Outlet collection slug must match a configured collection',
    });
  }
}).default({
  enabled: false,
  categoryHub: {
    enabled: true,
    items: [],
  },
  quickLinks: [],
  collections: [],
  outlet: {
    enabled: false,
    label: 'Outlet',
    collectionSlug: null,
  },
});

// --- Top-level ---

export const storefrontConfigSchema = z.object({
  branding: brandingSchema,
  homepage: homepageSchema,
  layout: layoutSchema,
  tracking: trackingSchema,
  seo: seoSchema,
  general: generalSchema,
  commercial: commercialSchema,
});

const partialCommercialCategoryHubSchema = z.object({
  enabled: z.boolean().optional(),
  items: commercialCategoryHubItemsSchema.optional(),
});

export const partialStorefrontConfigSchema = storefrontConfigSchema.deepPartial().extend({
  commercial: commercialObjectSchema.deepPartial().extend({
    categoryHub: partialCommercialCategoryHubSchema.optional(),
  }).optional(),
});

export type ValidatedStorefrontConfig = z.infer<typeof storefrontConfigSchema>;
