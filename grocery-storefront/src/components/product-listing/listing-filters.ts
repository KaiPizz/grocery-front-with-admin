import type { GroceryProduct, StorageZone } from '@/types';

export const ZONE_OPTIONS: StorageZone[] = ['FROZEN', 'CHILLED', 'AMBIENT'];

type SearchParamsReader = Pick<URLSearchParams, 'getAll'>;

const ALLERGEN_ALIASES: Record<string, string> = {
  gluten: 'cereals',
  tree_nuts: 'nuts',
};

// Wave 1 (27/09/2026): the listing filters are category, brand, country of
// origin, storage zone (reachable only through `?zone=` links), in-stock and
// price. Allergen, dietary and certification filters were removed — the
// catalog carries no certification data and dietary tags on ~5% of products,
// so those filters silently dropped most of the range.
export interface ProductFiltersState {
  categoryIds: string[];
  brands: string[];
  countryOfOrigin: string[];
  storageZone: StorageZone | '';
  inStockOnly: boolean;
  priceMin: string;
  priceMax: string;
}

export const DEFAULT_FILTERS: ProductFiltersState = {
  categoryIds: [],
  brands: [],
  countryOfOrigin: [],
  storageZone: '',
  inStockOnly: false,
  priceMin: '',
  priceMax: '',
};

/**
 * `?country=Japonia&country=Chiny` or `?country=Japonia,Chiny`. Values are the
 * Polish country names stored in `products.country_of_origin`, matched as-is.
 */
export function parseCountryQueryParams(searchParams: SearchParamsReader) {
  return Array.from(new Set(
    searchParams
      .getAll('country')
      .flatMap((value) => value.split(','))
      .map((value) => value.trim())
      .filter(Boolean),
  ));
}

export function setCountryQueryParams(searchParams: URLSearchParams, countries: string[]) {
  const normalizedCountries = Array.from(new Set(countries.map((value) => value.trim()).filter(Boolean)));

  searchParams.delete('country');
  for (const country of normalizedCountries) {
    searchParams.append('country', country);
  }
}

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
    brands: Array.from(new Set(filters.brands.map((brand) => brand.trim()).filter(Boolean))),
    countryOfOrigin: Array.from(new Set(filters.countryOfOrigin.map((country) => country.trim()).filter(Boolean))),
    storageZone: filters.storageZone,
    inStockOnly: Boolean(filters.inStockOnly),
    priceMin: formatPriceInput(minPrice),
    priceMax: formatPriceInput(maxPrice),
  };
}

export function countActiveFilters(filters: ProductFiltersState) {
  return (
    filters.categoryIds.length
    + filters.brands.length
    + filters.countryOfOrigin.length
    + (filters.storageZone ? 1 : 0)
    + (filters.inStockOnly ? 1 : 0)
    + (filters.priceMin || filters.priceMax ? 1 : 0)
  );
}

function sameList(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function areFiltersEqual(left: ProductFiltersState, right: ProductFiltersState) {
  return (
    left.storageZone === right.storageZone
    && left.inStockOnly === right.inStockOnly
    && left.priceMin === right.priceMin
    && left.priceMax === right.priceMax
    && sameList(left.categoryIds, right.categoryIds)
    && sameList(left.brands, right.brands)
    && sameList(left.countryOfOrigin, right.countryOfOrigin)
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
  if (filters.brands.length > 0) nextFilter.brands = filters.brands;
  if (filters.countryOfOrigin.length > 0) nextFilter.countryOfOrigin = filters.countryOfOrigin;
  if (filters.storageZone) nextFilter.storageZone = filters.storageZone;
  if (filters.inStockOnly) nextFilter.stockAvailability = 'IN_STOCK';

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

export function getProductPrice(product: GroceryProduct & Record<string, any>) {
  const variant = product?.variants?.[0] as any;

  return variant?.pricing?.price?.gross?.amount
    ?? product?.pricing?.priceRange?.start?.gross?.amount
    ?? null;
}
