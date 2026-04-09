'use client';

import { useState, useMemo, useEffect, type Dispatch, type SetStateAction } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useQuery, useClient, type CombinedError } from 'urql';
import { ChevronDown, SlidersHorizontal, X } from 'lucide-react';
import { PRODUCTS_QUERY } from '@/lib/graphql/operations/grocery';
import { ProductCard } from '@/components/product/ProductCard';
import { MobileProductCard } from '@/components/product/MobileProductCard';
import { AllergenFilter } from '@/components/grocery/AllergenFilter';
import { SortDropdown, SORT_OPTIONS } from '@/components/grocery/SortDropdown';
import { useHydrated } from '@/hooks/use-hydrated';
import { useRouter } from '@/i18n/navigation';
import { useChannel } from '@/hooks/use-channel';
import type { StorageZone } from '@/types';

const PAGE_SIZE = 24;

const ALLERGEN_OPTIONS = ['cereals', 'crustaceans', 'eggs', 'fish', 'peanuts', 'soybeans', 'milk', 'nuts', 'celery', 'mustard', 'sesame', 'sulphites', 'lupin', 'molluscs'] as const;
const DIETARY_OPTIONS = ['vegan', 'vegetarian', 'gluten-free', 'lactose-free', 'sugar-free'];
const CERT_OPTIONS = ['organic', 'halal', 'kosher'];
const ZONE_OPTIONS: StorageZone[] = ['FROZEN', 'CHILLED', 'AMBIENT'];
const ALLERGEN_ALIASES: Record<string, string> = {
  gluten: 'cereals',
};
const NO_PRODUCTS_MATCH_MESSAGE = 'No products match your filters.';

type ProductFiltersState = {
  excludeAllergens: string[];
  dietaryTags: string[];
  certifications: string[];
  storageZone: StorageZone | '';
  priceMin: string;
  priceMax: string;
};

const DEFAULT_FILTERS: ProductFiltersState = {
  excludeAllergens: [],
  dietaryTags: [],
  certifications: [],
  storageZone: '',
  priceMin: '',
  priceMax: '',
};

function getProductsErrorMessage(error: CombinedError | undefined | null, fallbackMessage: string) {
  if (!error) return null;

  const graphQlMessage = error.graphQLErrors.find((entry) => entry.message?.trim())?.message;
  if (graphQlMessage) return graphQlMessage;

  if (error.networkError?.message?.trim()) return error.networkError.message;
  if (error.message?.trim()) return error.message;

  return fallbackMessage;
}

function normalizeAllergenCode(code: string) {
  return ALLERGEN_ALIASES[code] ?? code;
}

function parsePriceInput(value: string) {
  const normalizedValue = value.replace(/[^\d.,]/g, '').replace(',', '.').trim();

  if (!normalizedValue) {
    return null;
  }

  const parsedValue = Number(normalizedValue);
  return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : null;
}

function formatPriceInput(value: number | null) {
  if (value === null) {
    return '';
  }

  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}

function normalizeFiltersState(
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
    excludeAllergens: Array.from(new Set(filters.excludeAllergens.map(normalizeAllergenCode).filter(Boolean))),
    dietaryTags: Array.from(new Set(filters.dietaryTags.filter(Boolean))),
    certifications: Array.from(new Set(filters.certifications.filter(Boolean))),
    storageZone: filters.storageZone,
    priceMin: formatPriceInput(minPrice),
    priceMax: formatPriceInput(maxPrice),
  };
}

function countActiveFilters(filters: ProductFiltersState) {
  return (
    filters.excludeAllergens.length
    + filters.dietaryTags.length
    + filters.certifications.length
    + (filters.storageZone ? 1 : 0)
    + (filters.priceMin || filters.priceMax ? 1 : 0)
  );
}

function areFiltersEqual(left: ProductFiltersState, right: ProductFiltersState) {
  return (
    left.storageZone === right.storageZone
    && left.priceMin === right.priceMin
    && left.priceMax === right.priceMax
    && left.excludeAllergens.length === right.excludeAllergens.length
    && left.excludeAllergens.every((value, index) => value === right.excludeAllergens[index])
    && left.dietaryTags.length === right.dietaryTags.length
    && left.dietaryTags.every((value, index) => value === right.dietaryTags[index])
    && left.certifications.length === right.certifications.length
    && left.certifications.every((value, index) => value === right.certifications[index])
  );
}

function buildProductFilter(filters: ProductFiltersState, search: string) {
  const nextFilter: Record<string, any> = {};

  if (filters.excludeAllergens.length > 0) nextFilter.excludeAllergens = filters.excludeAllergens;
  if (filters.dietaryTags.length > 0) nextFilter.dietaryTags = filters.dietaryTags;
  if (filters.certifications.length > 0) nextFilter.certifications = filters.certifications;
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

function toggleMultiValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((entry) => entry !== value)
    : [...values, value];
}

function extractProductCertifications(product: any) {
  const certifications = new Set<string>();
  const directCertifications = Array.isArray(product?.certifications)
    ? product.certifications.map((value: any) => String(value).toLowerCase())
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

function getProductPrice(product: any) {
  return product?.variants?.[0]?.pricing?.price?.gross?.amount
    ?? product?.pricing?.priceRange?.start?.gross?.amount
    ?? null;
}

function ProductSkeleton() {
  return (
    <div className="overflow-hidden rounded-none border-0 sm:rounded-xl sm:border" style={{ borderColor: 'var(--color-border)' }}>
      <div className="aspect-square skeleton" />
      <div className="space-y-2 p-3.5 sm:bg-[var(--color-card)]">
        <div className="h-4 skeleton rounded w-3/4" />
        <div className="h-4 skeleton rounded w-1/2" />
        <div className="flex justify-between items-end mt-3">
          <div className="h-5 skeleton rounded w-16" />
          <div className="w-9 h-9 skeleton rounded-xl" />
        </div>
      </div>
    </div>
  );
}

function MobileProductSkeleton() {
  return (
    <div
      className="rounded-[1.45rem] border bg-[var(--color-card)] p-2 shadow-[0_18px_36px_-30px_rgba(66,109,72,0.35)]"
      style={{ borderColor: 'color-mix(in srgb, var(--color-border) 88%, white)' }}
    >
      <div
        className="overflow-hidden rounded-[1.05rem] border"
        style={{ borderColor: 'color-mix(in srgb, var(--color-border) 76%, white)' }}
      >
        <div className="aspect-square skeleton" />
      </div>
      <div className="space-y-2 px-1.5 pb-1 pt-2.5">
        <div className="h-4 w-4/5 rounded skeleton" />
        <div className="h-4 w-1/3 rounded skeleton" />
        <div className="h-11 rounded-full skeleton" />
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const t = useTranslations('products');
  const tCommon = useTranslations('common');
  const tHome = useTranslations('home');
  const searchParams = useSearchParams();
  const router = useRouter();
  const isHydrated = useHydrated();
  const initialZone = searchParams.get('zone') as StorageZone | null;
  const initialSearch = searchParams.get('search') || '';
  const initialSort = searchParams.get('sort') || 'newest';

  const [committedFilters, setCommittedFilters] = useState<ProductFiltersState>(() => ({
    ...DEFAULT_FILTERS,
    storageZone: initialZone || '',
  }));
  const [draftFilters, setDraftFilters] = useState<ProductFiltersState>(() => ({
    ...DEFAULT_FILTERS,
    storageZone: initialZone || '',
  }));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState(initialSearch);
  const [sort, setSort] = useState(initialSort);
  const [loadedProducts, setLoadedProducts] = useState<any[]>([]);
  const [endCursor, setEndCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isMobileLayout, setIsMobileLayout] = useState<boolean | null>(null);
  const channel = useChannel();

  // Sync search param from URL changes
  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    if (urlSearch !== search) setSearch(urlSearch);
  }, [searchParams, search]);

  useEffect(() => {
    if (!isHydrated) return;

    const syncViewport = () => {
      setIsMobileLayout(window.innerWidth < 768);
    };

    syncViewport();
    window.addEventListener('resize', syncViewport);

    return () => {
      window.removeEventListener('resize', syncViewport);
    };
  }, [isHydrated]);

  const sortOption = SORT_OPTIONS.find((o) => o.value === sort) || SORT_OPTIONS[0];
  const [catalogResult] = useQuery({
    query: PRODUCTS_QUERY,
    variables: {
      channel,
      first: 100,
    },
  });

  const catalogProducts = useMemo(() => (
    catalogResult.data?.products?.edges?.map((edge: any) => edge.node) ?? []
  ), [catalogResult.data]);
  const filterSourceProducts = catalogProducts.length > 0 ? catalogProducts : loadedProducts;

  const priceBounds = useMemo(() => {
    const prices = filterSourceProducts
      .map((product: any) => getProductPrice(product))
      .filter((amount: number | null): amount is number => typeof amount === 'number' && Number.isFinite(amount));

    if (prices.length === 0) {
      return null;
    }

    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }, [filterSourceProducts]);

  const availableAllergens = useMemo(() => {
    const allergenCodes = new Set<string>();

    for (const product of filterSourceProducts) {
      const productAllergens = Array.isArray(product?.allergens)
        ? product.allergens.map((code: string) => normalizeAllergenCode(code))
        : [];

      for (const allergen of productAllergens) {
        allergenCodes.add(allergen);
      }
    }

    return ALLERGEN_OPTIONS.filter((allergen) => allergenCodes.has(allergen));
  }, [filterSourceProducts]);

  const availableDietaryTags = useMemo(() => (
    DIETARY_OPTIONS.filter((tag) => filterSourceProducts.some((product: any) => Array.isArray(product?.dietaryTags) && product.dietaryTags.includes(tag)))
  ), [filterSourceProducts]);

  const availableStorageZones = useMemo(() => (
    ZONE_OPTIONS.filter((zone) => filterSourceProducts.some((product: any) => product?.storageZone === zone))
  ), [filterSourceProducts]);

  const availableCertifications = useMemo(() => (
    CERT_OPTIONS.filter((certification) => filterSourceProducts.some((product: any) => extractProductCertifications(product).includes(certification)))
  ), [filterSourceProducts]);

  const normalizedCommittedFilters = useMemo(
    () => normalizeFiltersState(committedFilters, priceBounds),
    [committedFilters, priceBounds],
  );
  const normalizedDraftFilters = useMemo(
    () => normalizeFiltersState(draftFilters, priceBounds),
    [draftFilters, priceBounds],
  );

  const filter = useMemo(
    () => buildProductFilter(normalizedCommittedFilters, search),
    [normalizedCommittedFilters, search],
  );

  const [result, reexecuteProductsQuery] = useQuery({
    query: PRODUCTS_QUERY,
    variables: {
      channel,
      first: PAGE_SIZE,
      filter: Object.keys(filter).length > 0 ? filter : undefined,
      sortBy: { field: sortOption.field, direction: sortOption.direction },
    },
  });

  // Update loaded products when initial query changes
  useEffect(() => {
    if (result.data?.products) {
      const products = result.data.products.edges?.map((e: any) => e.node) || [];
      setLoadedProducts(products);
      setEndCursor(result.data.products.pageInfo?.endCursor || null);
      setHasMore(result.data.products.pageInfo?.hasNextPage || false);
    }
  }, [result.data]);

  const totalCount = result.data?.products?.totalCount ?? 0;
  const activeFilterCount = countActiveFilters(normalizedCommittedFilters);
  const draftFilterCount = countActiveFilters(normalizedDraftFilters);
  const productsErrorMessage = getProductsErrorMessage(result.error, tCommon('error'));
  const hasProductsError = Boolean(productsErrorMessage) && loadedProducts.length === 0;
  const isInitialLoading = result.fetching && loadedProducts.length === 0 && !hasProductsError;

  function renderFilterContent(
    filters: ProductFiltersState,
    normalizedFilters: ProductFiltersState,
    setFilters: Dispatch<SetStateAction<ProductFiltersState>>,
    onClear: () => void,
  ) {
    const allergenFilterUnavailable = availableAllergens.length === 0;
    const dietaryFilterUnavailable = availableDietaryTags.length === 0;
    const zoneFilterUnavailable = availableStorageZones.length === 0;
    const certificationFilterUnavailable = availableCertifications.length === 0;
    const localActiveFilterCount = countActiveFilters(normalizedFilters);
    const unavailableMessage = t('filterUnavailable');

    return (
      <>
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
            {t('priceFilter')}
          </legend>
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
            <input
              type="text"
              inputMode="decimal"
              value={filters.priceMin}
              onChange={(event) => setFilters((prev) => ({ ...prev, priceMin: event.target.value }))}
              aria-label={t('minimumPrice')}
              placeholder={t('minimumPrice')}
              className="min-w-0 rounded-[1rem] border bg-[var(--color-card)] px-4 py-3 text-base focus:outline-none focus-visible:ring-2"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
            />
            <span className="text-sm font-medium" style={{ color: 'var(--color-muted-foreground)' }}>
              -
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={filters.priceMax}
              onChange={(event) => setFilters((prev) => ({ ...prev, priceMax: event.target.value }))}
              aria-label={t('maximumPrice')}
              placeholder={t('maximumPrice')}
              className="min-w-0 rounded-[1rem] border bg-[var(--color-card)] px-4 py-3 text-base focus:outline-none focus-visible:ring-2"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
            />
          </div>
          {priceBounds && (
            <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
              {t('priceBounds', {
                min: formatPriceInput(priceBounds.min),
                max: formatPriceInput(priceBounds.max),
                currency: tCommon('currency'),
              })}
            </p>
          )}
        </fieldset>

        <div className="space-y-3">
          <AllergenFilter
            selected={filters.excludeAllergens}
            onChange={(nextAllergens) => setFilters((prev) => ({
              ...prev,
              excludeAllergens: nextAllergens.map(normalizeAllergenCode),
            }))}
            options={ALLERGEN_OPTIONS}
            disabled={allergenFilterUnavailable}
          />
          {allergenFilterUnavailable && (
            <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
              {unavailableMessage}
            </p>
          )}
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
            {t('dietaryFilter')}
          </legend>
          <div className="flex flex-wrap gap-2" role="group">
            {DIETARY_OPTIONS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setFilters((prev) => ({
                  ...prev,
                  dietaryTags: toggleMultiValue(prev.dietaryTags, tag),
                }))}
                disabled={dietaryFilterUnavailable}
                className="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-fast disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  borderColor: normalizedFilters.dietaryTags.includes(tag) ? 'var(--color-primary)' : 'var(--color-border)',
                  backgroundColor: normalizedFilters.dietaryTags.includes(tag) ? 'var(--color-accent)' : 'transparent',
                  color: normalizedFilters.dietaryTags.includes(tag) ? 'var(--color-primary)' : 'var(--color-muted-foreground)',
                }}
                aria-pressed={normalizedFilters.dietaryTags.includes(tag)}
              >
                {t(tag as any)}
              </button>
            ))}
          </div>
          {dietaryFilterUnavailable && (
            <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
              {unavailableMessage}
            </p>
          )}
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
            {t('zoneFilter')}
          </legend>
          <div className="flex flex-wrap gap-2" role="group">
            {ZONE_OPTIONS.map((zone) => (
              <button
                key={zone}
                type="button"
                onClick={() => setFilters((prev) => ({
                  ...prev,
                  storageZone: prev.storageZone === zone ? '' : zone,
                }))}
                disabled={zoneFilterUnavailable}
                className={`rounded-full px-3 py-1.5 text-xs font-medium text-white transition-opacity duration-fast disabled:cursor-not-allowed disabled:opacity-45 ${normalizedFilters.storageZone === zone ? 'opacity-100' : 'opacity-55 hover:opacity-80'}`}
                style={{ backgroundColor: `var(--color-${zone.toLowerCase()})` }}
                aria-pressed={normalizedFilters.storageZone === zone}
              >
                {tHome(zone.toLowerCase() as any)}
              </button>
            ))}
          </div>
          {zoneFilterUnavailable && (
            <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
              {unavailableMessage}
            </p>
          )}
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
            {t('certFilter')}
          </legend>
          <div className="flex flex-wrap gap-2" role="group">
            {CERT_OPTIONS.map((certification) => (
              <button
                key={certification}
                type="button"
                onClick={() => setFilters((prev) => ({
                  ...prev,
                  certifications: toggleMultiValue(prev.certifications, certification),
                }))}
                disabled={certificationFilterUnavailable}
                className="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-fast disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  borderColor: normalizedFilters.certifications.includes(certification) ? 'var(--color-primary)' : 'var(--color-border)',
                  backgroundColor: normalizedFilters.certifications.includes(certification) ? 'var(--color-accent)' : 'transparent',
                  color: normalizedFilters.certifications.includes(certification) ? 'var(--color-primary)' : 'var(--color-muted-foreground)',
                }}
                aria-pressed={normalizedFilters.certifications.includes(certification)}
              >
                {t(certification as any)}
              </button>
            ))}
          </div>
          {certificationFilterUnavailable && (
            <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
              {unavailableMessage}
            </p>
          )}
        </fieldset>

        {localActiveFilterCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1.5 text-sm font-medium transition-opacity duration-fast hover:opacity-80"
            style={{ color: 'var(--color-primary)' }}
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            {t('clearFilters')}
          </button>
        )}
      </>
    );
  }

  function buildProductsUrl(nextSort: string, nextSearch: string) {
    const params = new URLSearchParams(searchParams.toString());
    const trimmedSearch = nextSearch.trim();

    if (nextSort !== 'newest') {
      params.set('sort', nextSort);
    } else {
      params.delete('sort');
    }

    if (trimmedSearch) {
      params.set('search', trimmedSearch);
    } else {
      params.delete('search');
    }

    const nextParams = params.toString();
    return `/products${nextParams ? `?${nextParams}` : ''}`;
  }

  function handleSortChange(newSort: string) {
    setSort(newSort);
    setLoadedProducts([]);
    router.replace(buildProductsUrl(newSort, search), { scroll: false });
  }

  function openMobileFilters() {
    setDraftFilters(normalizedCommittedFilters);
    setFiltersOpen(true);
  }

  function closeMobileFilters() {
    setFiltersOpen(false);
  }

  const client = useClient();

  async function handleLoadMore() {
    if (!endCursor || loadingMore) return;
    setLoadingMore(true);

    const result2 = await client.query(PRODUCTS_QUERY, {
      channel,
      first: PAGE_SIZE,
      after: endCursor,
      filter: Object.keys(filter).length > 0 ? filter : undefined,
      sortBy: { field: sortOption.field, direction: sortOption.direction },
    }).toPromise();

    if (result2.data?.products) {
      const newProducts = result2.data.products.edges?.map((e: any) => e.node) || [];
      setLoadedProducts((prev) => [...prev, ...newProducts]);
      setEndCursor(result2.data.products.pageInfo?.endCursor || null);
      setHasMore(result2.data.products.pageInfo?.hasNextPage || false);
    }
    setLoadingMore(false);
  }

  function clearCommittedFilters() {
    setCommittedFilters(DEFAULT_FILTERS);
  }

  function clearDraftFilters() {
    setDraftFilters(DEFAULT_FILTERS);
  }

  function applyMobileFilters() {
    if (areFiltersEqual(normalizedDraftFilters, normalizedCommittedFilters)) {
      setFiltersOpen(false);
      return;
    }

    setCommittedFilters(normalizedDraftFilters);
    setFiltersOpen(false);
  }

  function renderMobileProductsContent() {
    if (isInitialLoading) {
      return (
        <div data-testid="mobile-products-grid" className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <MobileProductSkeleton key={i} />
          ))}
        </div>
      );
    }

    if (hasProductsError) {
      return (
        <div
          className="rounded-[1.75rem] border px-5 py-10 text-center"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
            {tCommon('error')}
          </p>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            {productsErrorMessage}
          </p>
          <button
            type="button"
            onClick={() => reexecuteProductsQuery({ requestPolicy: 'network-only' })}
            className="mt-4 inline-flex items-center justify-center rounded-full border px-4 py-2.5 text-sm font-medium transition-colors duration-fast hover-surface"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
          >
            {tCommon('retry')}
          </button>
        </div>
      );
    }

    if (loadedProducts.length > 0) {
      return (
        <>
          <div data-testid="mobile-products-grid" className="grid grid-cols-2 gap-3">
            {loadedProducts.map((product: any, index: number) => (
              <MobileProductCard key={product.id} product={product} imagePriority={index < 8} />
            ))}
          </div>

          {hasMore && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 rounded-[1.15rem] border px-6 py-3 text-base font-medium transition-colors duration-fast hover-surface disabled:opacity-60"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
              >
                {loadingMore ? tCommon('loading') : `${t('loadMore')} (${loadedProducts.length} / ${totalCount})`}
              </button>
            </div>
          )}
        </>
      );
    }

    return (
      <div className="rounded-[1.75rem] border px-5 py-10 text-center" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}>
        <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          {NO_PRODUCTS_MATCH_MESSAGE}
        </p>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={clearCommittedFilters}
            className="mt-3 text-sm font-medium transition-opacity duration-fast hover:opacity-80"
            style={{ color: 'var(--color-primary)' }}
          >
            {t('clearFilters')}
          </button>
        )}
      </div>
    );
  }

  function renderDesktopProductsContent() {
    if (isInitialLoading) {
      return (
        <div className="product-grid grid grid-cols-2 gap-5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <ProductSkeleton key={i} />
          ))}
        </div>
      );
    }

    if (hasProductsError) {
      return (
        <div
          className="rounded-2xl border px-5 py-10 text-center"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
            {tCommon('error')}
          </p>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            {productsErrorMessage}
          </p>
          <button
            type="button"
            onClick={() => reexecuteProductsQuery({ requestPolicy: 'network-only' })}
            className="mt-4 inline-flex items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors duration-fast hover-surface"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
          >
            {tCommon('retry')}
          </button>
        </div>
      );
    }

    if (loadedProducts.length > 0) {
      return (
        <>
          <div className="product-grid grid grid-cols-2 gap-5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {loadedProducts.map((product: any, index: number) => (
              <ProductCard key={product.id} product={product} imagePriority={index < 8} />
            ))}
          </div>

          {hasMore && (
            <div className="text-center mt-8">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border text-sm font-medium transition-colors duration-fast hover-surface disabled:opacity-60"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
              >
                {loadingMore ? tCommon('loading') : `${t('loadMore')} (${loadedProducts.length} / ${totalCount})`}
              </button>
            </div>
          )}
        </>
      );
    }

    return (
      <div className="text-center py-16">
        <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          {NO_PRODUCTS_MATCH_MESSAGE}
        </p>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={clearCommittedFilters}
            className="mt-3 text-sm font-medium transition-opacity duration-fast hover:opacity-80"
            style={{ color: 'var(--color-primary)' }}
          >
            {t('clearFilters')}
          </button>
        )}
      </div>
    );
  }

  if (isMobileLayout === null) {
    return (
      <div className="container-grocery py-8 md:py-12">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <MobileProductSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container-grocery py-8 md:py-12">
      {isMobileLayout ? (
        <div data-testid="mobile-products-shell" className="space-y-4">
          <header className="space-y-4">
            <h1
              className="max-w-[11.5rem] text-[1.95rem] font-semibold leading-[0.98] tracking-[-0.045em]"
              style={{ color: 'var(--color-foreground)' }}
              data-testid="mobile-products-title"
            >
              {t('title')}
              {totalCount > 0 && (
                <span
                  className="ml-1.5 align-top text-[0.95rem] font-medium tracking-[-0.01em]"
                  style={{ color: 'var(--color-muted-foreground)' }}
                  data-testid="mobile-products-title-count"
                >
                  ({totalCount})
                </span>
              )}
            </h1>

            <div data-testid="mobile-products-toolbar" className="flex items-center justify-between gap-3">
              <div data-testid="mobile-products-sort" className="min-w-0 flex-1">
                <label
                  className="mb-1.5 block text-sm font-medium leading-tight"
                  style={{ color: 'var(--color-foreground)' }}
                  htmlFor="mobile-products-sort-select"
                  data-testid="mobile-products-sort-label"
                >
                  {t('sortBy')}
                </label>
                <div className="relative">
                  <select
                    id="mobile-products-sort-select"
                    value={sort}
                    onChange={(event) => handleSortChange(event.target.value)}
                    className="w-full appearance-none rounded-[1rem] border bg-[var(--color-card)] py-3 pl-4 pr-10 text-base font-medium focus:outline-none focus-visible:ring-2"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
                    aria-label={t('sortBy')}
                    data-testid="mobile-products-sort-select"
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {t(option.label as any)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2"
                    style={{ color: 'var(--color-muted-foreground)' }}
                    aria-hidden="true"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={openMobileFilters}
                className="mt-[1.55rem] inline-flex shrink-0 items-center gap-2 rounded-[1rem] border bg-[var(--color-card)] px-4 py-3 text-base font-medium transition-colors duration-fast hover-surface"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
                aria-expanded={filtersOpen}
                aria-controls="mobile-filter-sheet"
                aria-label={`${t('filters')}${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ''}`}
              >
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                {t('filters')}
                {activeFilterCount > 0 && (
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                    aria-hidden="true"
                  >
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            <div className="h-px w-full" style={{ backgroundColor: 'color-mix(in srgb, var(--color-border) 88%, transparent)' }} />
          </header>

          {filtersOpen && (
            <div className="fixed inset-0 z-[70]" data-testid="mobile-filter-sheet" role="dialog" aria-modal="true" aria-label={t('filters')}>
              <button
                type="button"
                className="absolute inset-0 bg-black/45"
                aria-label={`${tCommon('close')} ${t('filters').toLowerCase()}`}
                onClick={closeMobileFilters}
              />
              <div
                className="absolute inset-x-0 bottom-0 flex h-4/5 w-full flex-col overflow-hidden rounded-t-[1.75rem] border animate-bottom-sheet-in"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-card)',
                }}
              >
                <div className="flex items-center justify-between gap-3 border-b px-4 pb-4 pt-4" style={{ borderColor: 'var(--color-border)' }}>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
                      {t('filters')}
                    </p>
                    {draftFilterCount > 0 && (
                      <p className="mt-1 text-sm" style={{ color: 'var(--color-foreground)' }}>
                        {`${draftFilterCount} active`}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium hover-surface"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
                    aria-label={`${tCommon('close')} ${t('filters').toLowerCase()}`}
                    onClick={closeMobileFilters}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                    {tCommon('close')}
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-5">
                  <div className="space-y-5">
                    {renderFilterContent(draftFilters, normalizedDraftFilters, setDraftFilters, clearDraftFilters)}
                  </div>
                </div>

                <div
                  className="border-t px-4 pb-4 pt-3"
                  style={{
                    borderColor: 'var(--color-border)',
                    paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)',
                  }}
                >
                  <button
                    type="button"
                    onClick={applyMobileFilters}
                    className="w-full rounded-[1rem] px-4 py-3.5 text-base font-semibold text-white transition-opacity duration-fast hover:opacity-90"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    {t('applyFilters')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {renderMobileProductsContent()}
        </div>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h1 className="heading-display text-2xl md:text-3xl" style={{ color: 'var(--color-foreground)' }}>
              {t('title')}
              {totalCount > 0 && (
                <span className="ml-2 text-base font-normal tabular-nums" style={{ color: 'var(--color-muted-foreground)' }}>
                  ({totalCount})
                </span>
              )}
            </h1>
            <div className="flex items-center gap-2">
              <SortDropdown value={sort} onChange={handleSortChange} />
              <button
                type="button"
                onClick={() => setFiltersOpen(!filtersOpen)}
                className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors duration-fast hover-surface"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
                aria-expanded={filtersOpen}
                aria-controls="filter-panel"
                aria-label={`${t('filters')}${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ''}`}
              >
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                {t('filters')}
                {activeFilterCount > 0 && (
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                    aria-hidden="true"
                  >
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {filtersOpen && (
            <div
              id="filter-panel"
              className="mb-6 space-y-5 rounded-xl border p-5 animate-fade-up"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
              role="region"
              aria-label="Product filters"
            >
              {renderFilterContent(committedFilters, normalizedCommittedFilters, setCommittedFilters, clearCommittedFilters)}
            </div>
          )}

          {renderDesktopProductsContent()}
        </>
      )}
    </div>
  );
}
