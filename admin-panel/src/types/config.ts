// ============================================================
// StorefrontConfig — the single schema that drives everything.
// Admin panel writes it, config API stores it, storefront reads it.
// ============================================================

export interface BrandingConfig {
  logoUrl: string | null;
  faviconUrl: string | null;
  storeName: string;
  colors: {
    primary: string;
    primaryHover: string;
    checkoutBtnColor?: string;
    checkoutBtnHoverColor?: string;
    background: string;
    foreground: string;
    accent: string;
    accentForeground: string;
    muted: string;
    mutedForeground: string;
    border: string;
    card: string;
    cardForeground: string;
    destructive: string;
    ring: string;
  };
}

export interface HeroBannerConfig {
  enabled: boolean;
  headline: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  backgroundImageUrl: string | null;
}

export interface PromoBannerItem {
  id: string;
  headline: string;
  subtext: string;
  ctaText: string;
  ctaLink: string;
  gradient: string;
  imageUrl: string | null;
  enabled: boolean;
  order: number;
}

// ── Banner Blocks (V2 — strict 6-type system) ────────────────────────────────

export interface HeroSlide {
  id: string;
  imageUrl: string | null;
  mobileImageUrl: string | null;
  title: string;
  ctaText: string;
  ctaLink: string;
  enabled: boolean;
}

export interface HeroBannerBlock {
  id: string;
  type: 'hero';
  enabled: boolean;
  order: number;
  autoPlay: boolean;
  autoPlayInterval: number;
  slides: HeroSlide[];
}

export interface HorizontalBannerBlock {
  id: string;
  type: 'horizontal';
  enabled: boolean;
  order: number;
  imageUrl: string | null;
  mobileImageUrl: string | null;
  title: string;
  ctaText: string;
  ctaLink: string;
}

export interface GridItem {
  id: string;
  imageUrl: string | null;
  title: string;
  href: string;
  enabled: boolean;
}

export interface GridBannerBlock {
  id: string;
  type: 'grid';
  enabled: boolean;
  order: number;
  columns: 3;
  items: GridItem[];
}

export interface RoundGridBannerBlock {
  id: string;
  type: 'round_grid';
  enabled: boolean;
  order: number;
  columns: 3;
  items: GridItem[];
}

export interface SidebarBannerBlock {
  id: string;
  type: 'sidebar';
  enabled: boolean;
  order: number;
  imageUrl: string | null;
  title: string;
  ctaText: string;
  ctaLink: string;
}

export interface SmallStickyBannerBlock {
  id: string;
  type: 'small_sticky';
  enabled: boolean;
  order: number;
  desktopImageUrl: string | null;
  mobileImageUrl: string | null;
  title: string;
  ctaText: string;
  ctaLink: string;
  position: 'top' | 'bottom';
  dismissible: boolean;
}

export type BannerBlock =
  | HeroBannerBlock
  | HorizontalBannerBlock
  | GridBannerBlock
  | RoundGridBannerBlock
  | SidebarBannerBlock
  | SmallStickyBannerBlock;

// ── Homepage ─────────────────────────────────────────────────────────────────

export type HomepageSectionId = 'deals' | 'freshPicks' | 'recipes' | 'shopByZone';

export interface HomepageSectionItem {
  id: HomepageSectionId;
  enabled: boolean;
  order: number;
}

export interface HomepageConfig {
  hero: HeroBannerConfig;
  promoBanners: PromoBannerItem[];
  blocks: BannerBlock[];
  sections: HomepageSectionItem[];
}

export interface NavItem {
  label: string;
  href: string;
  enabled: boolean;
  order: number;
}

export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
}

export interface HeaderCta {
  text: string;
  link: string;
  enabled: boolean;
}

export interface HeaderConfig {
  navItems: NavItem[];
  showSearch: boolean;
  showWishlist: boolean;
  showLanguageSwitcher: boolean;
  showThemeToggle: boolean;
  cta?: HeaderCta;
}

export interface FooterConfig {
  tagline: string;
  columns: FooterColumn[];
  copyrightText: string;
}

export type PricePosition = 'below-image' | 'overlay' | 'inline';
export type BannerPosition = 'above-products' | 'below-hero';

export interface PriceDisplayConfig {
  position: PricePosition;
  showDiscountBadge: boolean;
  showOriginalPrice: boolean;
}

export interface LayoutConfig {
  header: HeaderConfig;
  footer: FooterConfig;
  priceDisplay?: PriceDisplayConfig;
  bannerPosition: BannerPosition;
}

export interface TrackingServiceConfig {
  enabled: boolean;
}

export interface FacebookPixelConfig extends TrackingServiceConfig {
  pixelId: string;
}

export interface GoogleAnalyticsConfig extends TrackingServiceConfig {
  measurementId: string;
}

export interface GoogleTagManagerConfig extends TrackingServiceConfig {
  containerId: string;
}

export interface HotjarConfig extends TrackingServiceConfig {
  siteId: string;
}

export interface TrackingConfig {
  facebookPixel: FacebookPixelConfig;
  googleAnalytics: GoogleAnalyticsConfig;
  googleTagManager: GoogleTagManagerConfig;
  hotjar: HotjarConfig;
}

export interface SeoConfig {
  defaultTitle: string;
  defaultDescription: string;
  ogImageUrl: string | null;
  canonical: string;
}

export interface SocialLink {
  platform: string;
  url: string;
}

export interface GeneralConfig {
  phone: string;
  email: string;
  address: string;
  socialLinks: SocialLink[];
  policyLinks: {
    privacy: string;
    terms: string;
    about: string;
  };
  freeShippingThreshold: number;
  sameDayShippingCutoff: string;
  lowStockThreshold: number;
}

export type CommercialSurfaceKind = 'category' | 'collection' | 'outlet' | 'external';

export interface CommercialQuickLink {
  id: string;
  label: string;
  href: string;
  kind: CommercialSurfaceKind;
  description: string | null;
  imageUrl: string | null;
  enabled: boolean;
  order: number;
}

export interface CommercialCollectionTile {
  id: string;
  title: string;
  href: string;
  description: string | null;
  imageUrl: string | null;
  enabled: boolean;
  order: number;
}

export interface CommercialCollection {
  slug: string;
  title: string;
  subtitle: string | null;
  heroImageUrl: string | null;
  enabled: boolean;
  order: number;
  tiles: CommercialCollectionTile[];
}

export interface CommercialOutletConfig {
  enabled: boolean;
  label: string;
  collectionSlug: string | null;
}

export interface CommercialConfig {
  enabled: boolean;
  quickLinks: CommercialQuickLink[];
  collections: CommercialCollection[];
  outlet: CommercialOutletConfig;
}

// --- Top-level config ---

export interface StorefrontConfig {
  branding: BrandingConfig;
  homepage: HomepageConfig;
  layout: LayoutConfig;
  tracking: TrackingConfig;
  seo: SeoConfig;
  general: GeneralConfig;
  commercial: CommercialConfig;
}

// --- API response wrapper ---

export interface ConfigEnvelope {
  slug: string;
  config: StorefrontConfig;
  version: number;
  updatedAt: string;
}
