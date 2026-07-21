import type {
  BannerBlock,
  CommercialCollection,
  GridItem,
  PromoBannerItem,
  StorefrontConfig,
} from '@/types/storefront-config';

interface ExactTranslation {
  source: string;
  english: string;
}

const ASIA_DELI_GO_STORE_NAME = 'Asia Deli Go';

const HERO_COPY = {
  headline: {
    source: 'Azjatyckie produkty spożywcze na co dzień',
    english: 'Asian groceries for everyday shopping',
  },
  subtitle: {
    source: 'Kimchi, ryż, sosy, makarony, napoje i przekąski. Zamów online i odbierz osobiście w sklepie.',
    english: 'Kimchi, rice, sauces, noodles, drinks, and snacks. Order online and collect in store.',
  },
  ctaText: {
    source: 'Przeglądaj produkty',
    english: 'Browse products',
  },
} satisfies Record<string, ExactTranslation>;

const PROMO_COPY: Record<string, {
  headline: ExactTranslation;
  subtext: ExactTranslation;
  ctaText: ExactTranslation;
}> = {
  'banner-korean-pantry': {
    headline: { source: 'Koreańska spiżarnia', english: 'Korean pantry' },
    subtext: {
      source: 'Ryż, sosy, makarony i podstawy kuchni koreańskiej.',
      english: 'Rice, sauces, noodles, and Korean cooking essentials.',
    },
    ctaText: { source: 'Otwórz kolekcję', english: 'Open collection' },
  },
};

const GRID_ITEM_TITLES: Record<string, ExactTranslation> = {
  'asiandeligo-grid-korean-pantry': { source: 'Sosy i pasty', english: 'Sauces and pastes' },
  'asiandeligo-grid-drinks': { source: 'Napoje', english: 'Drinks' },
  'asiandeligo-grid-ready-meals': { source: 'Dania gotowe', english: 'Ready meals' },
  'asiandeligo-grid-kimchi': { source: 'Kimchi i kiszonki', english: 'Kimchi and pickles' },
  'asiandeligo-grid-noodles-rice': { source: 'Makaron i ryż', english: 'Noodles and rice' },
  'asiandeligo-grid-snacks-sweets': { source: 'Przekąski i słodycze', english: 'Snacks and sweets' },
  'asiandeligo-round-sushi-algae': { source: 'Sushi i algi', english: 'Sushi and seaweed' },
  'asiandeligo-round-mushrooms-tofu': { source: 'Grzyby i tofu', english: 'Mushrooms and tofu' },
  'asiandeligo-round-kitchen-tools': { source: 'Akcesoria kuchenne', english: 'Kitchen accessories' },
};

const HORIZONTAL_BLOCK_COPY: Record<string, {
  title: ExactTranslation;
  ctaText: ExactTranslation;
}> = {
  'asiandeligo-horizontal-quick-lunch-20260618': {
    title: {
      source: 'Ramen i gotowe dania na szybki obiad',
      english: 'Ramen and ready meals for a quick lunch',
    },
    ctaText: { source: 'Zobacz dania gotowe', english: 'Browse ready meals' },
  },
  'asiandeligo-horizontal-snacks-drinks-20260624': {
    title: {
      source: 'Przekąski i napoje do koszyka',
      english: 'Snacks and drinks for your basket',
    },
    ctaText: { source: 'Zobacz przekąski', english: 'Browse snacks' },
  },
};

const VERIFIED_HERO_MEDIA: Record<string, { imageUrl: string; mobileImageUrl: string }> = Object.fromEntries(
  Array.from({ length: 6 }, (_, index) => {
    const number = String(index + 1).padStart(2, '0');
    return [
      `asiandeligo-drive-hero-slide-${index + 1}`,
      {
        imageUrl: `/brand/hero/asia-deli-go-hero-${number}.webp`,
        mobileImageUrl: `/brand/hero/asia-deli-go-hero-${number}-mobile.webp`,
      },
    ];
  }),
);

const ENGLISH_HERO_SLIDE_IDS = new Set([
  'asiandeligo-drive-hero-slide-4',
  'asiandeligo-drive-hero-slide-5',
]);

const POLISH_HERO_SLIDE_IDS = new Set([
  'asiandeligo-drive-hero-slide-1',
  'asiandeligo-drive-hero-slide-6',
]);

const QUICK_LINK_COPY: Record<string, {
  label: ExactTranslation;
  description: ExactTranslation;
}> = {
  'quick-korean-pantry': {
    label: { source: 'Koreańska spiżarnia', english: 'Korean pantry' },
    description: { source: 'Podstawy kuchni koreańskiej', english: 'Korean cooking essentials' },
  },
};

const KOREAN_PANTRY_COPY: {
  title: ExactTranslation;
  subtitle: ExactTranslation;
  tiles: Record<string, { title: ExactTranslation; description: ExactTranslation }>;
} = {
  title: { source: 'Koreańska spiżarnia', english: 'Korean pantry' },
  subtitle: {
    source: 'Ryż, sosy, makarony i podstawowe składniki do kuchni koreańskiej.',
    english: 'Rice, sauces, noodles, and Korean cooking essentials.',
  },
  tiles: {
    'tile-kimchi': {
      title: { source: 'Kimchi', english: 'Kimchi' },
      description: {
        source: 'Fermentowane dodatki, pasty i chłodzone produkty.',
        english: 'Fermented sides, pastes, and chilled products.',
      },
    },
    'tile-sauces': {
      title: { source: 'Sosy i pasty', english: 'Sauces and pastes' },
      description: {
        source: 'Gochujang, sojowe, sezamowe i ostre bazy smaku.',
        english: 'Gochujang, soy sauce, sesame, and spicy flavour bases.',
      },
    },
    'tile-noodles': {
      title: { source: 'Makarony i ryż', english: 'Noodles and rice' },
      description: {
        source: 'Codzienne podstawy do szybkich dań.',
        english: 'Everyday staples for quick meals.',
      },
    },
  },
};

const SEO_COPY = {
  defaultTitle: {
    source: 'Asia Deli Go - azjatyckie produkty spożywcze',
    english: 'Asia Deli Go - Asian groceries',
  },
  defaultDescription: {
    source: 'Asia Deli Go: kimchi, ryż, sosy, makarony, napoje, przekąski i dania gotowe z odbiorem osobistym.',
    english: 'Asia Deli Go: kimchi, rice, sauces, noodles, drinks, snacks, and ready meals for in-store collection.',
  },
  canonical: {
    source: 'https://asiandeligo.eshoper.pro',
    english: 'https://asiandeligo.eshoper.pro/en',
  },
} satisfies Record<string, ExactTranslation>;

function translateExact(value: string, translation: ExactTranslation): string {
  return value === translation.source ? translation.english : value;
}

function translateNullableExact(
  value: string | null,
  translation: ExactTranslation,
): string | null {
  return value === null ? null : translateExact(value, translation);
}

function localizePromoBanner(banner: PromoBannerItem): PromoBannerItem {
  const copy = PROMO_COPY[banner.id];
  if (!copy) return banner;

  return {
    ...banner,
    headline: translateExact(banner.headline, copy.headline),
    subtext: translateExact(banner.subtext, copy.subtext),
    ctaText: translateExact(banner.ctaText, copy.ctaText),
  };
}

function localizeGridItem(item: GridItem): GridItem {
  const title = GRID_ITEM_TITLES[item.id];
  return title ? { ...item, title: translateExact(item.title, title) } : item;
}

function filterVerifiedHeroSlides(block: BannerBlock, locale: string): BannerBlock {
  if (block.type === 'hero' && block.id === 'asiandeligo-drive-hero-20260713') {
    const matchesVerifiedMedia = block.slides.length === Object.keys(VERIFIED_HERO_MEDIA).length
      && block.slides.every((slide) => {
        const media = VERIFIED_HERO_MEDIA[slide.id];
        return Boolean(
          media
          && slide.imageUrl === media.imageUrl
          && slide.mobileImageUrl === media.mobileImageUrl,
        );
      });
    const localeSlideIds = isEnglishLocale(locale)
      ? ENGLISH_HERO_SLIDE_IDS
      : POLISH_HERO_SLIDE_IDS;
    const localeSlides = block.slides.filter((slide) => localeSlideIds.has(slide.id));

    // The verified six-image set contains language-specific baked-in copy and
    // one obsolete shipping promise. Keep only the safe pair for each locale.
    // Any owner media edit disables this safeguard instead of hiding new work.
    if (matchesVerifiedMedia && localeSlides.some((slide) => slide.enabled)) {
      return { ...block, slides: localeSlides };
    }
  }

  return block;
}

function localizeBlock(block: BannerBlock): BannerBlock {
  if (block.type === 'hero') {
    return filterVerifiedHeroSlides(block, 'en');
  }

  if (block.type === 'grid' || block.type === 'round_grid') {
    return {
      ...block,
      items: block.items.map(localizeGridItem),
    };
  }

  if (block.type === 'horizontal') {
    const copy = HORIZONTAL_BLOCK_COPY[block.id];
    if (!copy) return block;

    return {
      ...block,
      title: translateExact(block.title, copy.title),
      ctaText: translateExact(block.ctaText, copy.ctaText),
    };
  }

  return block;
}

function localizeCollection(collection: CommercialCollection): CommercialCollection {
  if (collection.slug !== 'korean-pantry') return collection;

  return {
    ...collection,
    title: translateExact(collection.title, KOREAN_PANTRY_COPY.title),
    subtitle: translateNullableExact(collection.subtitle, KOREAN_PANTRY_COPY.subtitle),
    tiles: collection.tiles.map((tile) => {
      const copy = KOREAN_PANTRY_COPY.tiles[tile.id];
      if (!copy) return tile;

      return {
        ...tile,
        title: translateExact(tile.title, copy.title),
        description: translateNullableExact(tile.description, copy.description),
      };
    }),
  };
}

function isEnglishLocale(locale: string): boolean {
  return locale.toLowerCase().split('-')[0] === 'en';
}

/**
 * Applies the verified Asia Deli Go English copy at presentation time.
 *
 * The owner-managed config remains the Polish source of truth. Each replacement
 * requires both its stable ID (where available) and the expected Polish source
 * text, so an owner edit is never silently overwritten by stale copy.
 */
export function localizeConfiguredStorefront(
  config: StorefrontConfig | null,
  locale: string,
): StorefrontConfig | null {
  if (
    !config
    || config.branding.storeName.trim() !== ASIA_DELI_GO_STORE_NAME
  ) {
    return config;
  }

  if (!isEnglishLocale(locale)) {
    const blocks = config.homepage.blocks.map((block) => filterVerifiedHeroSlides(block, locale));

    if (blocks.every((block, index) => block === config.homepage.blocks[index])) {
      return config;
    }

    return {
      ...config,
      homepage: {
        ...config.homepage,
        blocks,
      },
    };
  }

  return {
    ...config,
    homepage: {
      ...config.homepage,
      hero: {
        ...config.homepage.hero,
        headline: translateExact(config.homepage.hero.headline, HERO_COPY.headline),
        subtitle: translateExact(config.homepage.hero.subtitle, HERO_COPY.subtitle),
        ctaText: translateExact(config.homepage.hero.ctaText, HERO_COPY.ctaText),
      },
      promoBanners: config.homepage.promoBanners.map(localizePromoBanner),
      blocks: config.homepage.blocks.map(localizeBlock),
    },
    commercial: {
      ...config.commercial,
      quickLinks: config.commercial.quickLinks.map((link) => {
        const copy = QUICK_LINK_COPY[link.id];
        if (!copy) return link;

        return {
          ...link,
          label: translateExact(link.label, copy.label),
          description: translateNullableExact(link.description, copy.description),
        };
      }),
      collections: config.commercial.collections.map(localizeCollection),
    },
    seo: {
      ...config.seo,
      defaultTitle: translateExact(config.seo.defaultTitle, SEO_COPY.defaultTitle),
      defaultDescription: translateExact(config.seo.defaultDescription, SEO_COPY.defaultDescription),
      canonical: translateExact(config.seo.canonical, SEO_COPY.canonical),
    },
  };
}

/**
 * next-intl's Link owns the locale prefix. For verified Asia Deli Go blocks,
 * remove an existing supported locale segment from configured internal URLs.
 * Other tenants, external URLs, and unknown URLs are left intact.
 */
export function getLocaleNeutralConfiguredHref(href: string, sourceId: string): string {
  const value = href.trim();
  if (!sourceId.startsWith('asiandeligo-')) return value;

  const match = value.match(/^\/(?:pl|en)(?=\/|[?#]|$)(.*)$/i);

  if (!match) return value;

  const remainder = match[1];
  if (!remainder) return '/';
  return remainder.startsWith('/') ? remainder : `/${remainder}`;
}
