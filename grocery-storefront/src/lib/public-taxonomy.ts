export interface PublicTaxonomyRawCategory {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  products?: {
    totalCount: number;
  } | null;
}

export interface PublicCategory {
  id: string;
  slug: string;
  name: string;
  description: string;
  products: {
    totalCount: number | null;
  };
  rawCategoryIds: string[];
  rawCategorySlugs: string[];
}

interface PublicCategoryDefinition {
  slug: string;
  names: {
    pl: string;
    en: string;
  };
  descriptions: {
    pl: string;
    en: string;
  };
  rawSlugs?: string[];
  keywords?: string[];
}

interface BuildPublicCategoriesOptions {
  requireProductCount?: boolean;
  includeEmpty?: boolean;
}

const HIDDEN_CATEGORY_KEYWORDS = [
  'kategoria tymczasowa',
  'unmapped',
  'pozostale produkty',
  'pozostałe produkty',
  'pozostale-produkty',
  'temporary',
];

export const PUBLIC_CATEGORY_DEFINITIONS: PublicCategoryDefinition[] = [
  {
    slug: 'kimchi-i-kiszonki',
    names: { pl: 'Kimchi i kiszonki', en: 'Kimchi and pickles' },
    descriptions: {
      pl: 'Kimchi, marynowane warzywa i fermentowane dodatki.',
      en: 'Kimchi, pickled vegetables, and fermented side dishes.',
    },
    rawSlugs: ['kimchi', 'owoce-marynowane-warzywa', 'imbir-marynowany'],
    keywords: ['kimchi', 'kiszon', 'marynowan', 'pickl', 'ferment'],
  },
  {
    slug: 'makaron-i-ryz',
    names: { pl: 'Makaron i ryż', en: 'Noodles and rice' },
    descriptions: {
      pl: 'Ramen, ryż, kluski i makarony do codziennych dań.',
      en: 'Ramen, rice, rice cakes, and noodles for everyday meals.',
    },
    rawSlugs: ['ramyun-ramen', 'ryż-i-inne-ziarna', 'makaron-pszenny', 'makaron-ryżowy', 'makaron-konjac', 'makaron-szklisty', 'makaron-gryczany', 'makarony', 'kluski-tteok-do-dań'],
    keywords: ['ramen', 'ramyun', 'makaron', 'ryz', 'ryż', 'kluski', 'tteok', 'noodle'],
  },
  {
    slug: 'sosy-pasty-i-przyprawy',
    names: { pl: 'Sosy, pasty i przyprawy', en: 'Sauces, pastes, and spices' },
    descriptions: {
      pl: 'Sosy, pasty, oleje, octy i przyprawy azjatyckie.',
      en: 'Asian sauces, pastes, oils, vinegars, and spices.',
    },
    rawSlugs: ['sosy-marynaty', 'sos-sojowy', 'pasty-smakowe', 'przyprawy', 'sosy-marynaty-oleje', 'octy-i-winne-przyprawy', 'oleje', 'pasta-miso', 'wasabi', 'sezam', 'mleczko-kokosowe', 'buliony', 'pasty', 'mąki-panierki-tapioka', 'sól'],
    keywords: ['sos', 'pasta', 'pasty', 'przypraw', 'olej', 'ocet', 'miso', 'wasabi', 'sezam', 'bulion', 'marynat', 'kokos', 'mąk', 'maki', 'panier', 'tapioka', 'sól', 'sol'],
  },
  {
    slug: 'przekaski-i-slodycze',
    names: { pl: 'Przekąski i słodycze', en: 'Snacks and sweets' },
    descriptions: {
      pl: 'Słodkie i słone przekąski, ciastka, chipsy i czekolady.',
      en: 'Sweet and savory snacks, cookies, chips, and chocolates.',
    },
    rawSlugs: ['słodycze-przekąski'],
    keywords: ['slodyc', 'słodyc', 'przekask', 'chips', 'czekolad', 'snack'],
  },
  {
    slug: 'napoje-herbaty-i-kawy',
    names: { pl: 'Napoje, herbaty i kawy', en: 'Drinks, tea, and coffee' },
    descriptions: {
      pl: 'Napoje, herbaty, kawy i syropy.',
      en: 'Drinks, tea, coffee, and syrups.',
    },
    rawSlugs: ['napoje', 'herbaty', 'kawy', 'syropy'],
    keywords: ['napoj', 'herbat', 'kawa', 'kawy', 'syrop', 'drink', 'tea'],
  },
  {
    slug: 'dania-gotowe',
    names: { pl: 'Dania gotowe', en: 'Ready meals' },
    descriptions: {
      pl: 'Gotowe dania, szybkie posilki i produkty instant.',
      en: 'Ready meals, quick meals, and instant products.',
    },
    rawSlugs: ['dania-gotowe'],
    keywords: ['dania gotowe', 'gotowe', 'instant', 'meal'],
  },
  {
    slug: 'sushi-i-algi',
    names: { pl: 'Sushi i algi', en: 'Sushi and seaweed' },
    descriptions: {
      pl: 'Nori, papier ryżowy i zestawy do sushi.',
      en: 'Nori, rice paper, and sushi sets.',
    },
    rawSlugs: ['arkusze-nori-gim', 'papier-ryżowy', 'komplety-do-sushi-i-herbaty', 'wakame-miyeok', 'zestawy-do-sushi'],
    keywords: ['sushi', 'nori', 'gim', 'papier ryzowy', 'papier-ryzowy', 'papier-ryżowy', 'wakame', 'miyeok', 'algi'],
  },
  {
    slug: 'grzyby-warzywa-i-tofu',
    names: { pl: 'Grzyby, warzywa i tofu', en: 'Mushrooms, vegetables, and tofu' },
    descriptions: {
      pl: 'Grzyby azjatyckie, tofu, kombu i produkty roślinne.',
      en: 'Asian mushrooms, tofu, kombu, and plant-based ingredients.',
    },
    rawSlugs: ['grzyby-shiitake', 'inne-grzyby-azjatyckie', 'grzyby-mun', 'kombu-dasima', 'tofu', 'świeże-produkty'],
    keywords: ['grzyb', 'shiitake', 'mun', 'kombu', 'dasima', 'tofu', 'świeże', 'swieze'],
  },
  {
    slug: 'akcesoria-kuchenne',
    names: { pl: 'Akcesoria kuchenne', en: 'Kitchen accessories' },
    descriptions: {
      pl: 'Naczynia, pałeczki, noże, maty, miski i akcesoria do gotowania.',
      en: 'Tableware, chopsticks, knives, mats, bowls, and cooking tools.',
    },
    rawSlugs: ['pałeczki-i-sztućce', 'noże', 'miski', 'duża-micha', 'patelnie-wok-grill', 'patelnie-tamago', 'parowary-bambusowe', 'maty-do-zwijania', 'foremki', 'moździerze', 'naczynia', 'koty-szczęścia-i-inne-gadżety', 'prezenty'],
    keywords: ['paleczki', 'pałeczki', 'sztucce', 'sztućce', 'noze', 'noże', 'miski', 'micha', 'patelnie', 'wok', 'tamago', 'parowary', 'maty', 'foremki', 'mozdzierze', 'moździerze', 'naczynia', 'gadzety', 'gadżety', 'prezent'],
  },
  {
    slug: 'kosmetyki-koreanskie',
    names: { pl: 'Kosmetyki koreańskie', en: 'Korean cosmetics' },
    descriptions: {
      pl: 'Koreańska pielęgnacja i kosmetyki.',
      en: 'Korean skincare and cosmetics.',
    },
    rawSlugs: ['koreańskie-kosmetyki'],
    keywords: ['kosmetyk', 'pielegnac', 'pielęgnac'],
  },
];

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function getSearchText(category: PublicTaxonomyRawCategory) {
  return normalizeText(`${category.slug} ${category.name} ${category.description ?? ''}`);
}

function isHiddenCategory(category: PublicTaxonomyRawCategory) {
  const searchText = getSearchText(category);
  return HIDDEN_CATEGORY_KEYWORDS.some((keyword) => searchText.includes(normalizeText(keyword)));
}

function findDefinition(category: PublicTaxonomyRawCategory) {
  const normalizedSlug = normalizeText(category.slug);
  const searchText = getSearchText(category);

  const rawSlugMatch = PUBLIC_CATEGORY_DEFINITIONS.find((definition) => {
    return definition.rawSlugs?.some((slug) => normalizeText(slug) === normalizedSlug);
  });

  if (rawSlugMatch) return rawSlugMatch;

  return PUBLIC_CATEGORY_DEFINITIONS.find((definition) => {
    const hasKeywordMatch = definition.keywords?.some((keyword) => searchText.includes(normalizeText(keyword)));

    return Boolean(hasKeywordMatch);
  }) ?? null;
}

function mergeProductCounts(left: number | null, right: number | null) {
  if (left === null || right === null) return null;
  return left + right;
}

export function buildPublicCategories(
  categories: PublicTaxonomyRawCategory[],
  locale = 'pl',
  options: BuildPublicCategoriesOptions = {},
): PublicCategory[] {
  const requireProductCount = options.requireProductCount ?? true;
  const includeEmpty = options.includeEmpty ?? false;
  const groups = new Map<string, PublicCategory>();

  for (const category of categories) {
    const count = category.products?.totalCount;
    const hasKnownCount = typeof count === 'number';
    if (isHiddenCategory(category)) continue;
    if (requireProductCount && !hasKnownCount) continue;
    if (!includeEmpty && hasKnownCount && count <= 0) continue;

    const definition = findDefinition(category);
    if (!definition) continue;

    const existing = groups.get(definition.slug);
    if (existing) {
      existing.products.totalCount = mergeProductCounts(existing.products.totalCount, hasKnownCount ? count : null);
      existing.rawCategoryIds.push(category.id);
      existing.rawCategorySlugs.push(category.slug);
      continue;
    }

    groups.set(definition.slug, {
      id: `public:${definition.slug}`,
      slug: definition.slug,
      name: locale === 'en' ? definition.names.en : definition.names.pl,
      description: locale === 'en' ? definition.descriptions.en : definition.descriptions.pl,
      products: { totalCount: hasKnownCount ? count : null },
      rawCategoryIds: [category.id],
      rawCategorySlugs: [category.slug],
    });
  }

  return PUBLIC_CATEGORY_DEFINITIONS
    .map((definition) => groups.get(definition.slug))
    .filter((category): category is PublicCategory => Boolean(category));
}

export function findPublicCategory(
  categories: PublicTaxonomyRawCategory[],
  slug: string,
  locale = 'pl',
  options: BuildPublicCategoriesOptions = {},
) {
  return buildPublicCategories(categories, locale, options).find((category) => category.slug === slug) ?? null;
}
