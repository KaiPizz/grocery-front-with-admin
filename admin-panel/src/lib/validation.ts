import { z } from 'zod';

// --- Primitives ---

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6,8}$/, 'Must be a valid hex color');
const optionalUrl = z.string().max(2000).nullable();

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
  ctaLink: z.string().max(500),
  backgroundImageUrl: optionalUrl,
});

const promoBannerItemSchema = z.object({
  id: z.string().min(1),
  headline: z.string().max(500),
  subtext: z.string().max(1000),
  ctaText: z.string().max(100),
  ctaLink: z.string().max(500),
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

const requiredImageUrl = z.string().min(1, 'Image is required').max(2000);

const heroSlideSchema = z.object({
  id: z.string().min(1),
  imageUrl: requiredImageUrl,
  mobileImageUrl: optionalUrl.optional().default(null),
  title: z.string().max(200),
  ctaText: z.string().max(100),
  ctaLink: z.string().max(500),
  enabled: z.boolean(),
});

const heroBannerBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal('hero'),
  enabled: z.boolean(),
  order: z.number().int().min(0),
  autoPlay: z.boolean(),
  autoPlayInterval: z.number().int().min(1000).max(30000),
  slides: z.array(heroSlideSchema).min(1).max(5),
});

const horizontalBannerBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal('horizontal'),
  enabled: z.boolean(),
  order: z.number().int().min(0),
  imageUrl: requiredImageUrl,
  mobileImageUrl: optionalUrl.optional().default(null),
  title: z.string().max(200),
  ctaText: z.string().max(100),
  ctaLink: z.string().max(500),
});

const gridItemSchema = z.object({
  id: z.string().min(1),
  imageUrl: requiredImageUrl,
  title: z.string().max(100),
  href: z.string().max(500),
  enabled: z.boolean(),
});

const gridBannerBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal('grid'),
  enabled: z.boolean(),
  order: z.number().int().min(0),
  columns: z.preprocess((v) => (typeof v === 'number' ? 3 : v), z.literal(3)),
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
  imageUrl: requiredImageUrl,
  title: z.string().max(200),
  ctaText: z.string().max(100),
  ctaLink: z.string().max(500),
});

const smallStickyBannerBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal('small_sticky'),
  enabled: z.boolean(),
  order: z.number().int().min(0),
  desktopImageUrl: requiredImageUrl,
  mobileImageUrl: requiredImageUrl,
  title: z.string().max(200),
  ctaText: z.string().max(100),
  ctaLink: z.string().max(500),
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
  href: z.string().min(1).max(500),
  enabled: z.boolean(),
  order: z.number().int().min(0),
});

const footerLinkSchema = z.object({
  label: z.string().min(1).max(100),
  href: z.string().max(500),
});

const footerColumnSchema = z.object({
  title: z.string().min(1).max(100),
  links: z.array(footerLinkSchema),
});

const headerCtaSchema = z.object({
  text: z.string().max(100),
  link: z.string().max(500),
  enabled: z.boolean(),
});

const headerSchema = z.object({
  navItems: z.array(navItemSchema),
  showSearch: z.boolean(),
  showWishlist: z.boolean(),
  showLanguageSwitcher: z.boolean(),
  showThemeToggle: z.boolean(),
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
  pixelId: z.string().max(100),
});

const googleAnalyticsSchema = z.object({
  enabled: z.boolean(),
  measurementId: z.string().max(100),
});

const googleTagManagerSchema = z.object({
  enabled: z.boolean(),
  containerId: z.string().max(100),
});

const hotjarSchema = z.object({
  enabled: z.boolean(),
  siteId: z.string().max(100),
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
  canonical: z.string().max(500),
});

// --- General ---

const socialLinkSchema = z.object({
  platform: z.string().min(1).max(50),
  url: z.string().max(500),
});

const generalSchema = z.object({
  phone: z.string().max(50),
  email: z.string().max(200),
  address: z.string().max(500),
  socialLinks: z.array(socialLinkSchema),
  policyLinks: z.object({
    privacy: z.string().max(500),
    terms: z.string().max(500),
    about: z.string().max(500),
  }),
  freeShippingThreshold: z.number().min(0).max(100000),
  sameDayShippingCutoff: z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/, 'Must be HH:MM'),
  lowStockThreshold: z.number().int().min(0).max(10000),
});

// --- Top-level ---

export const storefrontConfigSchema = z.object({
  branding: brandingSchema,
  homepage: homepageSchema,
  layout: layoutSchema,
  tracking: trackingSchema,
  seo: seoSchema,
  general: generalSchema,
});

export const partialStorefrontConfigSchema = storefrontConfigSchema.deepPartial();

export type ValidatedStorefrontConfig = z.infer<typeof storefrontConfigSchema>;
