import type { GroceryProduct, StorageZone } from '@/types';

export const ALLERGEN_OPTIONS = ['cereals', 'crustaceans', 'eggs', 'fish', 'peanuts', 'soybeans', 'milk', 'nuts', 'celery', 'mustard', 'sesame', 'sulphites', 'lupin', 'molluscs'] as const;
export const DIETARY_OPTIONS = ['vegan', 'vegetarian', 'gluten-free', 'lactose-free', 'sugar-free'];
export const CERT_OPTIONS = ['organic', 'halal', 'kosher'];
export const ZONE_OPTIONS: StorageZone[] = ['FROZEN', 'CHILLED', 'AMBIENT'];

const ALLERGEN_ALIASES: Record<string, string> = {
  gluten: 'cereals',
  tree_nuts: 'nuts',
};

export interface ProductFiltersState {
  categoryIds: string[];
  excludeAllergens: string[];
  dietaryTags: string[];
  certifications: string[];
  countryOfOrigin: string[];
  storageZone: StorageZone | '';
  priceMin: string;
  priceMax: string;
}

export const DEFAULT_FILTERS: ProductFiltersState = {
  categoryIds: [],
  excludeAllergens: [],
  dietaryTags: [],
  certifications: [],
  countryOfOrigin: [],
  storageZone: '',
  priceMin: '',
  priceMax: '',
};

export function normalizeAllergenCode(code: string) {
  return ALLERGEN_ALIASES[code] ?? code;
}

export function parsePriceInput(value: string) {
  const normalizedValue = value.replace(/[^\d.,]/g, '').replace(',', '.').trim();

  if (!normalizedValue) {
    return null;
  }

  const parsedValue = Number(normalizedValue);
  return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : null;
}

export function formatPriceInput(value: number | null) {
  if (value === null) {
    return '';
  }

  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}

export function normalizeFiltersState(
  filters: ProductFiltersState,
  priceBounds?: { min: number; max: number } | null,
): ProductFiltersState {
  let minPrice = parsePriceInput(filters.priceMin);
  let maxPrice = parsePriceInput(filters.priceMax);

  if (priceBounds) {
    if (minPrice !== null) {
      minPrice = Math.max(priceBounds.min, Math.min(priceBounds.max, minPrice));
    }

    if (maxPrice !== null) {
      maxPrice = Math.max(priceBounds.min, Math.min(priceBounds.max, maxPrice));
    }
  }

  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    [minPrice, maxPrice] = [maxPrice, minPrice];
  }

  return {
    categoryIds: Array.from(new Set(filters.categoryIds.filter(Boolean))),
    excludeAllergens: Array.from(new Set(filters.excludeAllergens.map(normalizeAllergenCode).filter(Boolean))),
    dietaryTags: Array.from(new Set(filters.dietaryTags.filter(Boolean))),
    certifications: Array.from(new Set(filters.certifications.filter(Boolean))),
    countryOfOrigin: Array.from(new Set(filters.countryOfOrigin.map((country) => country.trim()).filter(Boolean))),
    storageZone: filters.storageZone,
    priceMin: formatPriceInput(minPrice),
    priceMax: formatPriceInput(maxPrice),
  };
}

export function countActiveFilters(filters: ProductFiltersState) {
  return (
    filters.categoryIds.length
    + filters.excludeAllergens.length
    + filters.dietaryTags.length
    + filters.certifications.length
    + filters.countryOfOrigin.length
    + (filters.storageZone ? 1 : 0)
    + (filters.priceMin || filters.priceMax ? 1 : 0)
  );
}

export function areFiltersEqual(left: ProductFiltersState, right: ProductFiltersState) {
  return (
    left.storageZone === right.storageZone
    && left.priceMin === right.priceMin
    && left.priceMax === right.priceMax
    && left.categoryIds.length === right.categoryIds.length
    && left.categoryIds.every((value, index) => value === right.categoryIds[index])
    && left.excludeAllergens.length === right.excludeAllergens.length
    && left.excludeAllergens.every((value, index) => value === right.excludeAllergens[index])
    && left.dietaryTags.length === right.dietaryTags.length
    && left.dietaryTags.every((value, index) => value === right.dietaryTags[index])
    && left.certifications.length === right.certifications.length
    && left.certifications.every((value, index) => value === right.certifications[index])
    && left.countryOfOrigin.length === right.countryOfOrigin.length
    && left.countryOfOrigin.every((value, index) => value === right.countryOfOrigin[index])
  );
}

export function buildProductFilter(
  filters: ProductFiltersState,
  search: string,
  categoryIds: string[] = [],
) {
  const nextFilter: Record<string, unknown> = {};
  const scopedCategoryIds = Array.from(new Set(categoryIds.filter(Boolean)));

  if (scopedCategoryIds.length > 0) {
    nextFilter.categories = scopedCategoryIds;
  } else if (filters.categoryIds.length > 0) {
    nextFilter.categories = filters.categoryIds;
  }
  if (filters.excludeAllergens.length > 0) nextFilter.excludeAllergens = filters.excludeAllergens;
  if (filters.dietaryTags.length > 0) nextFilter.dietaryTags = filters.dietaryTags;
  if (filters.certifications.length > 0) nextFilter.certifications = filters.certifications;
  if (filters.countryOfOrigin.length > 0) nextFilter.countryOfOrigin = filters.countryOfOrigin;
  if (filters.storageZone) nextFilter.storageZone = filters.storageZone;

  const minimumPrice = parsePriceInput(filters.priceMin);
  const maximumPrice = parsePriceInput(filters.priceMax);

  if (minimumPrice !== null || maximumPrice !== null) {
    nextFilter.price = {
      ...(minimumPrice !== null ? { gte: minimumPrice } : {}),
      ...(maximumPrice !== null ? { lte: maximumPrice } : {}),
    };
  }

  if (search.trim()) nextFilter.search = search.trim();

  return nextFilter;
}

export function toggleMultiValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((entry) => entry !== value)
    : [...values, value];
}

export function extractProductCertifications(product: GroceryProduct & Record<string, any>) {
  const certifications = new Set<string>();
  const directCertifications = Array.isArray(product?.certifications)
    ? product.certifications.map((value: string) => String(value).toLowerCase())
    : [];
  const attributes = Array.isArray(product?.attributes) ? product.attributes : [];

  for (const certification of directCertifications) {
    if ((CERT_OPTIONS as readonly string[]).includes(certification)) {
      certifications.add(certification);
    }
  }

  for (const attribute of attributes) {
    const slug = String(attribute?.attribute?.slug ?? '').toLowerCase();
    const values = Array.isArray(attribute?.values)
      ? attribute.values.map((value: any) => String(value?.value ?? value?.name ?? '').toLowerCase())
      : [];

    for (const certification of CERT_OPTIONS) {
      if (slug.includes(certification) || values.includes(certification)) {
        certifications.add(certification);
      }
    }
  }

  return Array.from(certifications);
}

export function getProductPrice(product: GroceryProduct & Record<string, any>) {
  const variant = product?.variants?.[0] as any;

  return variant?.pricing?.price?.gross?.amount
    ?? product?.pricing?.priceRange?.start?.gross?.amount
    ?? null;
}
