import type { StorefrontConfig } from '@/types/config';

/**
 * Default config that mirrors the current grocery-storefront hard-coded values.
 * Colors match globals.css :root variables.
 * Nav/footer/banners match Header.tsx, Footer.tsx, PromoBanner.tsx.
 */
export const DEFAULT_CONFIG: StorefrontConfig = {
  branding: {
    logoUrl: null,
    faviconUrl: null,
    storeName: 'Grocery',
    colors: {
      primary: '#16a34a',
      primaryHover: '#15803d',
      checkoutBtnColor: '#16a34a',
      checkoutBtnHoverColor: '#75c547',
      background: '#fafaf9',
      foreground: '#1c1917',
      accent: '#f0fdf4',
      accentForeground: '#14532d',
      muted: '#f5f5f4',
      mutedForeground: '#78716c',
      border: '#e7e5e4',
      card: '#ffffff',
      cardForeground: '#1c1917',
      destructive: '#dc2626',
      ring: '#16a34a',
    },
  },

  homepage: {
    hero: {
      enabled: true,
      headline: 'Fresh Groceries, Delivered',
      subtitle: 'Shop quality produce, pantry staples, and frozen favourites — all with full nutritional transparency.',
      ctaText: 'Shop Products',
      ctaLink: '/products',
      backgroundImageUrl: null,
    },
    promoBanners: [
      {
        id: 'banner-1',
        headline: 'Farm Fresh Picks',
        subtext: 'Hand-selected chilled produce updated daily',
        ctaText: 'Shop Chilled',
        ctaLink: '/products?zone=CHILLED',
        gradient: 'linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 70%, #000))',
        imageUrl: null,
        enabled: true,
        order: 0,
      },
      {
        id: 'banner-2',
        headline: 'Weekly Deals',
        subtext: 'Save big on your favourite everyday essentials',
        ctaText: 'See Deals',
        ctaLink: '/products?sort=price_asc',
        gradient: 'linear-gradient(135deg, var(--color-frozen), color-mix(in srgb, var(--color-frozen) 70%, #000))',
        imageUrl: null,
        enabled: true,
        order: 1,
      },
      {
        id: 'banner-3',
        headline: 'Stock Your Freezer',
        subtext: 'Premium frozen meals and ingredients at great prices',
        ctaText: 'Shop Frozen',
        ctaLink: '/products?zone=FROZEN',
        gradient: 'linear-gradient(135deg, var(--color-ambient), color-mix(in srgb, var(--color-ambient) 70%, #000))',
        imageUrl: null,
        enabled: true,
        order: 2,
      },
    ],
    blocks: [
      {
        id: 'block-hero-1',
        type: 'hero' as const,
        enabled: true,
        order: 0,
        autoPlay: true,
        autoPlayInterval: 4000,
        slides: [
          {
            id: 'hero-slide-1',
            imageUrl: null,
            mobileImageUrl: null,
            title: 'Farm Fresh Picks',
            ctaText: 'Shop Now',
            ctaLink: '/products',
            enabled: true,
          },
        ],
      },
    ],
    sections: [
      { id: 'shopByZone', enabled: true, order: 0 },
      { id: 'deals', enabled: true, order: 1 },
      { id: 'freshPicks', enabled: true, order: 2 },
      { id: 'recipes', enabled: true, order: 3 },
    ],
  },

  layout: {
    header: {
      navItems: [
        { label: 'Home', href: '/', enabled: true, order: 0 },
        { label: 'Categories', href: '/categories', enabled: true, order: 1 },
        { label: 'Products', href: '/products', enabled: true, order: 2 },
        { label: 'Recipes', href: '/recipes', enabled: true, order: 3 },
      ],
      showSearch: true,
      showWishlist: true,
      showLanguageSwitcher: true,
      cta: { text: '', link: '', enabled: false },
    },
    footer: {
      tagline: 'Fresh groceries with full nutritional transparency, delivered to your door.',
      columns: [
        {
          title: 'Shop',
          links: [
            { label: 'Categories', href: '/categories' },
            { label: 'Products', href: '/products' },
            { label: 'Recipes', href: '/recipes' },
          ],
        },
        {
          title: 'Info',
          links: [
            { label: 'About', href: '#' },
            { label: 'Contact', href: '#' },
            { label: 'Delivery', href: '#' },
          ],
        },
        {
          title: 'Legal',
          links: [
            { label: 'Privacy', href: '/privacy' },
            { label: 'Terms', href: '/terms' },
          ],
        },
      ],
      copyrightText: '© {year} Asia Deli. Powered by Zira AI.',
    },
    priceDisplay: {
      position: 'below-image',
      showDiscountBadge: true,
      showOriginalPrice: true,
    },
    bannerPosition: 'below-hero',
  },

  tracking: {
    facebookPixel: { enabled: false, pixelId: '' },
    googleAnalytics: { enabled: false, measurementId: '' },
    googleTagManager: { enabled: false, containerId: '' },
    hotjar: { enabled: false, siteId: '' },
  },

  seo: {
    defaultTitle: 'Grocery Store',
    defaultDescription: 'Fresh groceries with full nutritional transparency',
    ogImageUrl: null,
    canonical: '',
  },

  general: {
    phone: '',
    email: '',
    address: '',
    socialLinks: [],
    policyLinks: {
      privacy: '/privacy',
      terms: '/terms',
      about: '#',
    },
    freeShippingThreshold: 150,
    sameDayShippingCutoff: '12:00',
    lowStockThreshold: 10,
  },

  commercial: {
    enabled: false,
    quickLinks: [],
    collections: [],
    outlet: {
      enabled: false,
      label: 'Outlet',
      collectionSlug: null,
    },
  },
};
