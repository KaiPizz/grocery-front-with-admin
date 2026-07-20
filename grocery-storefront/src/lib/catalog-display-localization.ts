import {
  buildPublicCategories,
  type PublicTaxonomyRawCategory,
} from '@/lib/public-taxonomy';

export interface CatalogCategoryDisplay {
  id: string;
  name: string;
  slug: string;
  isCurated: boolean;
}

const ENGLISH_COUNTRY_ORIGIN_LABELS: Readonly<Record<string, string>> = {
  Japonia: 'Japan',
  'Korea Południowa': 'South Korea',
  Chiny: 'China',
  Tajlandia: 'Thailand',
  Wietnam: 'Vietnam',
  Indonezja: 'Indonesia',
  Polska: 'Poland',
  Tajwan: 'Taiwan',
  Francja: 'France',
  Hiszpania: 'Spain',
  Holandia: 'Netherlands',
  'Unia Europejska': 'European Union',
  Filipiny: 'Philippines',
  Indie: 'India',
  Turcja: 'Turkey',
  Niemcy: 'Germany',
  Singapur: 'Singapore',
  'Hong Kong': 'Hong Kong',
  'Wielka Brytania': 'United Kingdom',
  'Włochy': 'Italy',
  Belgia: 'Belgium',
  Pakistan: 'Pakistan',
  USA: 'United States',
  'Sri Lanka': 'Sri Lanka',
  'Zjednoczone Emiraty Arabskie': 'United Arab Emirates',
  'Kambodża': 'Cambodia',
  Tunezja: 'Tunisia',
  Brazylia: 'Brazil',
  Dania: 'Denmark',
  Kanada: 'Canada',
  Malezja: 'Malaysia',
  Mauritius: 'Mauritius',
  Paragwaj: 'Paraguay',
};

const UNIT_LABELS: Readonly<Record<string, string>> = {
  KG: 'kg',
  GRAM: 'g',
  G: 'g',
  LITER: 'l',
  L: 'l',
  ML: 'ml',
};

export function isEnglishLocale(locale: string | null | undefined): boolean {
  return locale?.toLowerCase().startsWith('en') ?? false;
}

export function getLocalizedCountryOrigin(
  countryOfOrigin: string | null | undefined,
  locale: string,
): string | null {
  const value = countryOfOrigin?.trim();
  if (!value) return null;
  if (!isEnglishLocale(locale)) return value;

  return ENGLISH_COUNTRY_ORIGIN_LABELS[value] ?? value;
}

export function getCatalogCategoryDisplay(
  category: PublicTaxonomyRawCategory | null | undefined,
  locale: string,
): CatalogCategoryDisplay | null {
  if (!category) return null;

  const publicCategory = buildPublicCategories(
    [category],
    isEnglishLocale(locale) ? 'en' : 'pl',
    { requireProductCount: false, includeEmpty: true },
  )[0];

  if (!publicCategory) {
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      isCurated: false,
    };
  }

  return {
    id: publicCategory.id,
    name: publicCategory.name,
    slug: publicCategory.slug,
    isCurated: true,
  };
}

export function getLocalizedUnitLabel(unit: string, locale: string): string {
  const key = unit.trim().toUpperCase();
  if (key === 'PIECE' || key === 'PCS') {
    return isEnglishLocale(locale) ? 'pcs' : 'szt.';
  }

  return UNIT_LABELS[key] ?? unit.toLowerCase();
}
