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
    rawSlugs: [
      'kimchi',
      'owoce-marynowane-warzywa',
      'marynowane-warzywa-i-owoce',
      'imbir-marynowany',
    ],
    keywords: ['kimchi', 'kiszon', 'marynowan', 'pickl', 'ferment'],
  },
  {
    slug: 'makaron-i-ryz',
    names: { pl: 'Makaron i ryż', en: 'Noodles and rice' },
    descriptions: {
      pl: 'Ramen, ryż, kluski i makarony do codziennych dań.',
      en: 'Ramen, rice, rice cakes, and noodles for everyday meals.',
    },
    rawSlugs: [
      'ramyun-ramen',
      'ryż-i-inne-ziarna',
      'ryż-do-sushi-i-nie-tylko',
      'japońskie-ciasto-ryżowe',
      'makaron-pszenny',
      'makaron-ryżowy',
      'makaron-konjac',
      'makaron-szklisty',
      'makaron-gryczany',
      'makarony',
      'kluski-tteok-do-dań',
    ],
    keywords: ['ramen', 'ramyun', 'makaron', 'ryz', 'ryż', 'kluski', 'tteok', 'noodle'],
  },
  {
    slug: 'sosy-pasty-i-przyprawy',
    names: { pl: 'Sosy, pasty i przyprawy', en: 'Sauces, pastes, and spices' },
    descriptions: {
      pl: 'Sosy, pasty, oleje, octy i przyprawy azjatyckie.',
      en: 'Asian sauces, pastes, oils, vinegars, and spices.',
    },
    rawSlugs: [
      'sosy-marynaty',
      'sosy-i-marynaty',
      'sos-sojowy',
      'sosy-sojowe',
      'pasty-smakowe',
      'przyprawy',
      'przyprawy-jednoskładnikowe',
      'sosy-marynaty-oleje',
      'octy-i-winne-przyprawy',
      'ocet-ryżowy-do-sushi',
      'oleje',
      'oleje-sezamowe',
      'pasta-miso',
      'wasabi',
      'sezam',
      'mleczko-kokosowe',
      'buliony',
      'pasty',
      'mąki-panierki-tapioka',
      'sól',
    ],
    keywords: ['sos', 'pasta', 'pasty', 'przypraw', 'olej', 'ocet', 'miso', 'wasabi', 'sezam', 'bulion', 'marynat', 'kokos', 'mąk', 'maki', 'panier', 'tapioka', 'sól', 'sol'],
  },
  {
    slug: 'przekaski-i-slodycze',
    names: { pl: 'Przekąski i słodycze', en: 'Snacks and sweets' },
    descriptions: {
      pl: 'Słodkie i słone przekąski, ciastka, chipsy i czekolady.',
      en: 'Sweet and savory snacks, cookies, chips, and chocolates.',
    },
    rawSlugs: ['słodycze-przekąski', 'słodycze-japońskie'],
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
    rawSlugs: ['dania-gotowe', 'zupy-buliony', 'duża-micha'],
    keywords: ['dania-gotowe', 'dania gotowe', 'zupy-buliony', 'duża-micha', 'gotowe', 'instant', 'meal'],
  },
  {
    slug: 'sushi-i-algi',
    names: { pl: 'Sushi i algi', en: 'Sushi and seaweed' },
    descriptions: {
      pl: 'Nori, kombu, wakame i papier ryżowy.',
      en: 'Nori, kombu, wakame, and rice paper.',
    },
    rawSlugs: ['arkusze-nori-gim', 'papier-ryżowy', 'wakame-miyeok', 'kombu-dasima'],
    keywords: ['sushi', 'nori', 'gim', 'papier ryzowy', 'papier-ryzowy', 'papier-ryżowy', 'wakame', 'miyeok', 'kombu', 'dasima', 'algi'],
  },
  {
    slug: 'grzyby-warzywa-i-tofu',
    names: { pl: 'Grzyby, warzywa i tofu', en: 'Mushrooms, vegetables, and tofu' },
    descriptions: {
      pl: 'Grzyby azjatyckie, tofu i świeże produkty roślinne.',
      en: 'Asian mushrooms, tofu, and fresh plant-based ingredients.',
    },
    rawSlugs: ['grzyby-shiitake', 'inne-grzyby-azjatyckie', 'grzyby-mun', 'tofu', 'świeże-produkty'],
    keywords: ['grzyb', 'shiitake', 'mun', 'tofu', 'świeże', 'swieze'],
  },
  {
    slug: 'akcesoria-kuchenne',
    names: { pl: 'Akcesoria kuchenne', en: 'Kitchen accessories' },
    descriptions: {
      pl: 'Naczynia, pałeczki, noże, maty, miski i akcesoria do gotowania.',
      en: 'Tableware, chopsticks, knives, mats, bowls, and cooking tools.',
    },
    rawSlugs: [
      'pałeczki-i-sztućce',
      'noże',
      'miski',
      'patelnie-wok-grill',
      'patelnie-tamago',
      'parowary-bambusowe',
      'maty-do-zwijania',
      'foremki',
      'moździerze',
      'naczynia',
      'komplety-do-sushi-i-herbaty',
      'zaparzacze-do-kawy',
      'zestawy-do-sushi',
      'koty-szczęścia-i-inne-gadżety',
      'prezenty',
    ],
    keywords: ['zestawy-do-sushi', 'komplety-do-sushi', 'zaparzacze-do-kawy', 'paleczki', 'pałeczki', 'sztucce', 'sztućce', 'noze', 'noże', 'miski', 'micha', 'patelnie', 'wok', 'tamago', 'parowary', 'maty', 'foremki', 'mozdzierze', 'moździerze', 'naczynia', 'gadzety', 'gadżety', 'prezent'],
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

  // Prefer the most specific matching phrase across all groups. Definition
  // order alone would let a broad word such as "sushi", "bulion", or "micha"
  // steal future variants of known accessory/ready-meal categories.
  const keywordMatches = PUBLIC_CATEGORY_DEFINITIONS.flatMap((definition, definitionIndex) => (
    (definition.keywords ?? []).map((keyword) => ({
      definition,
      definitionIndex,
      normalizedKeyword: normalizeText(keyword),
    }))
  )).filter(({ normalizedKeyword }) => searchText.includes(normalizedKeyword));

  keywordMatches.sort((left, right) => (
    right.normalizedKeyword.length - left.normalizedKeyword.length
    || left.definitionIndex - right.definitionIndex
  ));

  return keywordMatches[0]?.definition ?? null;
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
