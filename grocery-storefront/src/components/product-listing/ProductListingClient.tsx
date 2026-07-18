'use client';

import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { ArrowDownUp, ChevronDown, SlidersHorizontal, X } from 'lucide-react';
import { useClient, useQuery, type CombinedError } from 'urql';

import { AllergenFilter } from '@/components/grocery/AllergenFilter';
import { SortDropdown, SORT_OPTIONS } from '@/components/grocery/SortDropdown';
import { MobileProductCard } from '@/components/product/MobileProductCard';
import { ProductCard } from '@/components/product/ProductCard';
import { useHydrated } from '@/hooks/use-hydrated';
import { Link, useRouter } from '@/i18n/navigation';
import { PRODUCT_COUNTRY_ORIGINS_QUERY, PRODUCT_FILTER_CATALOG_QUERY, PRODUCT_LISTING_QUERY } from '@/lib/graphql/operations/grocery';
import type { GroceryProduct, StorageZone } from '@/types';
import {
  ALLERGEN_OPTIONS,
  CERT_OPTIONS,
  DEFAULT_FILTERS,
  DIETARY_OPTIONS,
  ZONE_OPTIONS,
  areFiltersEqual,
  buildProductFilter,
  countActiveFilters,
  extractProductCertifications,
  formatPriceInput,
  getProductPrice,
  normalizeAllergenCode,
  normalizeFiltersState,
  toggleMultiValue,
  type ProductFiltersState,
} from './listing-filters';

interface ProductConnection {
  edges: Array<{
    node: GroceryProduct;
    cursor: string;
  }>;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
  };
  totalCount: number;
}

interface ProductsQueryResponse {
  products: ProductConnection | null;
}

interface ProductPageSnapshot {
  products: GroceryProduct[];
  totalCount: number;
  startCursor: string | null;
  endCursor: string | null;
  hasMore: boolean;
  hasPreviousPage: boolean;
  afterCursor: string | null;
}

interface ProductListingClientProps {
  channel: string;
  basePath: string;
  title: string;
  categoryId?: string | null;
  categoryIds?: string[];
  initialProducts?: GroceryProduct[];
  initialEndCursor?: string | null;
  initialHasMore?: boolean;
  initialTotalCount?: number;
  initialSearch?: string;
  initialSort?: string;
  initialZone?: StorageZone | '';
  pageSize?: number;
  layoutMode?: 'adaptive' | 'responsive';
  showTitle?: boolean;
  withContainer?: boolean;
  categoryNavigation?: CategoryNavigationItem[];
  currentCategorySlug?: string | null;
}

interface CategoryFilterOption {
  id: string;
  name: string;
  count: number;
}

interface CountryOriginFilterOption {
  value: string;
  count: number;
}

interface ProductCountryOriginsQueryResponse {
  productCountryOrigins: CountryOriginFilterOption[] | null;
}

interface CategoryNavigationItem {
  id: string;
  slug: string;
  name: string;
  count: number | null;
}

interface ActiveFilterChip {
  key: string;
  label: string;
  onRemove: () => void;
}

const EMPTY_CATEGORY_IDS: string[] = [];

function getProductsErrorMessage(error: CombinedError | undefined | null, fallbackMessage: string) {
  if (!error) return null;

  const graphQlMessage = error.graphQLErrors.find((entry) => entry.message?.trim())?.message;
  if (graphQlMessage) return graphQlMessage;

  if (error.networkError?.message?.trim()) return error.networkError.message;
  if (error.message?.trim()) return error.message;

  return fallbackMessage;
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

export function ProductListingClient({
  channel,
  basePath,
  title,
  categoryId = null,
  categoryIds = EMPTY_CATEGORY_IDS,
  initialProducts = [],
  initialEndCursor = null,
  initialHasMore = false,
  initialTotalCount = 0,
  initialSearch = '',
  initialSort = 'newest',
  initialZone = '',
  pageSize = 24,
  layoutMode = 'adaptive',
  showTitle = true,
  withContainer = true,
  categoryNavigation = [],
  currentCategorySlug = null,
}: ProductListingClientProps) {
  const t = useTranslations('products');
  const tCommon = useTranslations('common');
  const tHome = useTranslations('home');
  const tAllergens = useTranslations('allergens');
  const searchParams = useSearchParams();
  const router = useRouter();
  const isHydrated = useHydrated();
  const client = useClient();

  const [committedFilters, setCommittedFilters] = useState<ProductFiltersState>(() => ({
    ...DEFAULT_FILTERS,
    storageZone: initialZone || '',
  }));
  const [draftFilters, setDraftFilters] = useState<ProductFiltersState>(() => ({
    ...DEFAULT_FILTERS,
    storageZone: initialZone || '',
  }));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [draftSort, setDraftSort] = useState(initialSort);
  const [search, setSearch] = useState(initialSearch);
  const [sort, setSort] = useState(initialSort);
  const [loadedProducts, setLoadedProducts] = useState<GroceryProduct[]>(initialProducts);
  const [visibleTotalCount, setVisibleTotalCount] = useState(initialTotalCount);
  const [startCursor, setStartCursor] = useState<string | null>(null);
  const [endCursor, setEndCursor] = useState(initialEndCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageAfterCursors, setPageAfterCursors] = useState<Record<number, string | null>>({ 1: null });
  const [pageSnapshots, setPageSnapshots] = useState<Record<number, ProductPageSnapshot>>(() => ({
    1: {
      products: initialProducts,
      totalCount: initialTotalCount,
      startCursor: null,
      endCursor: initialEndCursor,
      hasMore: initialHasMore,
      hasPreviousPage: false,
      afterCursor: null,
    },
  }));
  const [loadingPage, setLoadingPage] = useState(false);
  const [filterMetadataRequested, setFilterMetadataRequested] = useState(initialProducts.length > 0);
  const [isMobileLayout, setIsMobileLayout] = useState<boolean | null>(layoutMode === 'adaptive' ? null : false);
  const listingQueryResetMountedRef = useRef(false);

  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    if (urlSearch !== search) setSearch(urlSearch);
  }, [searchParams, search]);

  useEffect(() => {
    if (layoutMode !== 'adaptive' || !isHydrated) return;

    const syncViewport = () => {
      setIsMobileLayout(window.innerWidth < 768);
    };

    syncViewport();
    window.addEventListener('resize', syncViewport);

    return () => {
      window.removeEventListener('resize', syncViewport);
    };
  }, [isHydrated, layoutMode]);

  const sortOption = SORT_OPTIONS.find((option) => option.value === sort) || SORT_OPTIONS[0];
  const activeCategoryIds = useMemo(() => (
    categoryIds.length > 0 ? categoryIds : categoryId ? [categoryId] : []
  ), [categoryId, categoryIds]);
  const catalogFilter = useMemo(() => (
    activeCategoryIds.length > 0 ? { categories: activeCategoryIds } : undefined
  ), [activeCategoryIds]);
  const countryOriginCategoryIds = activeCategoryIds.length > 0 ? activeCategoryIds : null;
  const [catalogResult] = useQuery<ProductsQueryResponse>({
    query: PRODUCT_FILTER_CATALOG_QUERY,
    pause: !filterMetadataRequested,
    variables: {
      channel,
      first: 100,
      filter: catalogFilter,
    },
  });
  const [countryOriginsResult] = useQuery<ProductCountryOriginsQueryResponse>({
    query: PRODUCT_COUNTRY_ORIGINS_QUERY,
    pause: !filterMetadataRequested,
    variables: {
      channel,
      first: 100,
      categoryIds: countryOriginCategoryIds,
    },
  });

  const catalogProducts = useMemo(() => (
    catalogResult.data?.products?.edges?.map((edge) => edge.node) ?? []
  ), [catalogResult.data]);
  const filterSourceProducts = catalogProducts.length > 0 ? catalogProducts : loadedProducts;
  const catalogPriceBoundsReady = !catalogResult.fetching
    && !catalogResult.error
    && catalogResult.data?.products != null;

  const priceBounds = useMemo(() => {
    if (!catalogPriceBoundsReady) {
      return null;
    }

    const prices = catalogProducts
      .map((product) => getProductPrice(product as GroceryProduct & Record<string, any>))
      .filter((amount: number | null): amount is number => typeof amount === 'number' && Number.isFinite(amount));

    if (prices.length === 0) {
      return null;
    }

    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }, [catalogPriceBoundsReady, catalogProducts]);

  const availableAllergens = useMemo(() => {
    const allergenCodes = new Set<string>();

    for (const product of filterSourceProducts) {
      const productAllergens = Array.isArray(product?.allergens)
        ? product.allergens.map((code) => normalizeAllergenCode(code))
        : [];
      const productMayContainAllergens = Array.isArray(product?.mayContainAllergens)
        ? product.mayContainAllergens.map((code) => normalizeAllergenCode(code))
        : [];

      for (const allergen of [...productAllergens, ...productMayContainAllergens]) {
        allergenCodes.add(allergen);
      }
    }

    return ALLERGEN_OPTIONS.filter((allergen) => allergenCodes.has(allergen));
  }, [filterSourceProducts]);

  const availableDietaryTags = useMemo(() => (
    DIETARY_OPTIONS.filter((tag) => filterSourceProducts.some((product) => Array.isArray(product?.dietaryTags) && product.dietaryTags.includes(tag)))
  ), [filterSourceProducts]);

  const availableStorageZones = useMemo(() => (
    ZONE_OPTIONS.filter((zone) => filterSourceProducts.some((product) => product?.storageZone === zone))
  ), [filterSourceProducts]);

  const availableCertifications = useMemo(() => (
    CERT_OPTIONS.filter((certification) => filterSourceProducts.some((product) => extractProductCertifications(product as GroceryProduct & Record<string, any>).includes(certification)))
  ), [filterSourceProducts]);
  const availableCountryOrigins = useMemo(() => {
    const origins = countryOriginsResult.data?.productCountryOrigins ?? [];

    return origins
      .filter((origin) => origin?.value?.trim())
      .map((origin) => ({
        value: origin.value.trim(),
        count: Number(origin.count) || 0,
      }))
      .sort((left, right) => {
        if (left.value === 'Wietnam') return -1;
        if (right.value === 'Wietnam') return 1;
        if (right.count !== left.count) return right.count - left.count;
        return left.value.localeCompare(right.value, 'pl');
      });
  }, [countryOriginsResult.data]);
  const availableCategories = useMemo(() => {
    const categories = new Map<string, CategoryFilterOption>();

    for (const product of filterSourceProducts) {
      const category = (product as GroceryProduct & Record<string, any>)?.category;
      const id = typeof category?.id === 'string' ? category.id : null;
      const name = typeof category?.name === 'string' ? category.name : null;

      if (!id || !name) continue;

      const existing = categories.get(id);
      categories.set(id, {
        id,
        name,
        count: (existing?.count ?? 0) + 1,
      });
    }

    return Array.from(categories.values()).sort((left, right) => left.name.localeCompare(right.name));
  }, [filterSourceProducts]);
  const categoryNameById = useMemo(() => new Map(availableCategories.map((category) => [category.id, category.name])), [availableCategories]);
  const countryOriginByValue = useMemo(() => new Map(availableCountryOrigins.map((origin) => [origin.value, origin.value])), [availableCountryOrigins]);

  const normalizedCommittedFilters = useMemo(
    () => normalizeFiltersState(committedFilters, priceBounds),
    [committedFilters, priceBounds],
  );
  const normalizedDraftFilters = useMemo(
    () => normalizeFiltersState(draftFilters, priceBounds),
    [draftFilters, priceBounds],
  );
  const initialFilters = useMemo<ProductFiltersState>(() => ({
    ...DEFAULT_FILTERS,
    storageZone: initialZone || '',
  }), [initialZone]);
  const normalizedInitialFilters = useMemo(
    () => normalizeFiltersState(initialFilters, priceBounds),
    [initialFilters, priceBounds],
  );

  const filter = useMemo(
    () => buildProductFilter(normalizedCommittedFilters, search, activeCategoryIds),
    [activeCategoryIds, normalizedCommittedFilters, search],
  );
  const queryFilter = Object.keys(filter).length > 0 ? filter : undefined;
  const canUseInitialListingResult = initialProducts.length > 0
    && search === initialSearch
    && sort === initialSort
    && areFiltersEqual(normalizedCommittedFilters, normalizedInitialFilters);

  const [result, reexecuteProductsQuery] = useQuery<ProductsQueryResponse>({
    query: PRODUCT_LISTING_QUERY,
    pause: canUseInitialListingResult,
    variables: {
      channel,
      first: pageSize,
      last: null,
      after: null,
      before: null,
      filter: queryFilter,
      sortBy: { field: sortOption.field, direction: sortOption.direction },
    },
  });

  useEffect(() => {
    const initialListingLoaded = !result.fetching && result.data?.products != null;

    if (!filterMetadataRequested && (filtersOpen || initialListingLoaded)) {
      setFilterMetadataRequested(true);
    }
  }, [filterMetadataRequested, filtersOpen, result.data, result.fetching]);

  useEffect(() => {
    if (!listingQueryResetMountedRef.current) {
      listingQueryResetMountedRef.current = true;
      return;
    }

    setCurrentPage(1);
    setPageAfterCursors({ 1: null });
    setPageSnapshots({});
  }, [queryFilter, sortOption.value]);

  useEffect(() => {
    if (result.data?.products) {
      const products = result.data.products.edges?.map((edge) => edge.node) || [];
      setLoadedProducts(products);
      setVisibleTotalCount(result.data.products.totalCount ?? 0);
      setStartCursor(result.data.products.pageInfo?.startCursor || null);
      setEndCursor(result.data.products.pageInfo?.endCursor || null);
      setHasMore(result.data.products.pageInfo?.hasNextPage || false);
      setHasPreviousPage(result.data.products.pageInfo?.hasPreviousPage || false);
      const initialPageCursors: Record<number, string | null> = { 1: null };
      if (result.data.products.pageInfo?.hasNextPage && result.data.products.pageInfo.endCursor) {
        initialPageCursors[2] = result.data.products.pageInfo.endCursor;
      }
      setPageAfterCursors(initialPageCursors);
      setPageSnapshots({
        1: {
          products,
          totalCount: result.data.products.totalCount ?? 0,
          startCursor: result.data.products.pageInfo?.startCursor || null,
          endCursor: result.data.products.pageInfo?.endCursor || null,
          hasMore: result.data.products.pageInfo?.hasNextPage || false,
          hasPreviousPage: result.data.products.pageInfo?.hasPreviousPage || false,
          afterCursor: null,
        },
      });
    }
  }, [result.data]);

  const totalCount = visibleTotalCount;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentRangeStart = loadedProducts.length > 0 ? ((currentPage - 1) * pageSize) + 1 : 0;
  const currentRangeEnd = loadedProducts.length > 0 ? Math.min(totalCount, currentRangeStart + loadedProducts.length - 1) : 0;
  const activeFilterCount = countActiveFilters(normalizedCommittedFilters);
  const draftFilterCount = countActiveFilters(normalizedDraftFilters);
  const productsErrorMessage = getProductsErrorMessage(result.error, tCommon('error'));
  const hasProductsError = Boolean(productsErrorMessage) && loadedProducts.length === 0;
  const isInitialLoading = result.fetching && loadedProducts.length === 0 && !hasProductsError;
  const hasCategoryNavigation = categoryNavigation.length > 0;
  const hasDesktopSidebar = hasCategoryNavigation;

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
    const categoryFilterUnavailable = availableCategories.length === 0;
    const countryFilterUnavailable = availableCountryOrigins.length === 0;
    const localActiveFilterCount = countActiveFilters(normalizedFilters);
    const unavailableMessage = t('filterUnavailable');
    const visibleAllergens = allergenFilterUnavailable ? ALLERGEN_OPTIONS : availableAllergens;
    const visibleDietaryTags = dietaryFilterUnavailable ? DIETARY_OPTIONS : availableDietaryTags;
    const visibleStorageZones = zoneFilterUnavailable ? ZONE_OPTIONS : availableStorageZones;
    const visibleCertifications = certificationFilterUnavailable ? CERT_OPTIONS : availableCertifications;

    return (
      <>
        {activeCategoryIds.length === 0 && !categoryFilterUnavailable && (
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
              {t('categoryFilter')}
            </legend>
            <div className="flex flex-wrap gap-2" role="group">
              {availableCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setFilters((prev) => ({
                    ...prev,
                    categoryIds: toggleMultiValue(prev.categoryIds, category.id),
                  }))}
                  disabled={categoryFilterUnavailable}
                  className="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-fast disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    borderColor: normalizedFilters.categoryIds.includes(category.id) ? 'var(--color-primary)' : 'var(--color-border)',
                    backgroundColor: normalizedFilters.categoryIds.includes(category.id) ? 'var(--color-accent)' : 'transparent',
                    color: normalizedFilters.categoryIds.includes(category.id) ? 'var(--color-primary)' : 'var(--color-muted-foreground)',
                  }}
                  aria-pressed={normalizedFilters.categoryIds.includes(category.id)}
                >
                  {category.name}
                  <span className="ml-1 tabular-nums" aria-hidden="true">
                    {category.count}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {!countryFilterUnavailable && (
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
              {t('countryOriginFilter')}
            </legend>
            <div className="flex flex-wrap gap-2" role="group">
              {availableCountryOrigins.map((origin) => (
                <button
                  key={origin.value}
                  type="button"
                  onClick={() => setFilters((prev) => ({
                    ...prev,
                    countryOfOrigin: toggleMultiValue(prev.countryOfOrigin, origin.value),
                  }))}
                  className="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-fast"
                  style={{
                    borderColor: normalizedFilters.countryOfOrigin.includes(origin.value) ? 'var(--color-primary)' : 'var(--color-border)',
                    backgroundColor: normalizedFilters.countryOfOrigin.includes(origin.value) ? 'var(--color-accent)' : 'transparent',
                    color: normalizedFilters.countryOfOrigin.includes(origin.value) ? 'var(--color-primary)' : 'var(--color-muted-foreground)',
                  }}
                  aria-pressed={normalizedFilters.countryOfOrigin.includes(origin.value)}
                >
                  {origin.value}
                  <span className="ml-1 tabular-nums" aria-hidden="true">
                    {origin.count}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>
        )}

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
            options={visibleAllergens}
            disabled={allergenFilterUnavailable}
          />
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
            {t('dietaryFilter')}
          </legend>
          <div className="flex flex-wrap gap-2" role="group">
            {visibleDietaryTags.map((tag) => (
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
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
            {t('zoneFilter')}
          </legend>
          <div className="flex flex-wrap gap-2" role="group">
            {visibleStorageZones.map((zone) => (
              <button
                key={zone}
                type="button"
                onClick={() => setFilters((prev) => ({
                  ...prev,
                  storageZone: prev.storageZone === zone ? '' : zone,
                }))}
                disabled={zoneFilterUnavailable}
                className={`rounded-full px-3 py-1.5 text-xs font-medium text-white transition-opacity duration-fast disabled:cursor-not-allowed disabled:opacity-35 ${normalizedFilters.storageZone === zone ? 'opacity-100' : 'opacity-55 hover:opacity-80'}`}
                style={{ backgroundColor: `var(--color-${zone.toLowerCase()})` }}
                aria-pressed={normalizedFilters.storageZone === zone}
              >
                {tHome(zone.toLowerCase() as any)}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
            {t('certFilter')}
          </legend>
          <div className="flex flex-wrap gap-2" role="group">
            {visibleCertifications.map((certification) => (
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
        </fieldset>

        {categoryFilterUnavailable
          && allergenFilterUnavailable
          && dietaryFilterUnavailable
          && zoneFilterUnavailable
          && countryFilterUnavailable
          && certificationFilterUnavailable && (
            <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
              {unavailableMessage}
            </p>
          )}

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

  function buildListingUrl(nextSort: string, nextSearch: string) {
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
    return `${basePath}${nextParams ? `?${nextParams}` : ''}`;
  }

  function handleSortChange(newSort: string) {
    setSort(newSort);
    setDraftSort(newSort);
    setLoadedProducts([]);
    router.replace(buildListingUrl(newSort, search), { scroll: false });
  }

  function openMobileFilters() {
    setDraftFilters(normalizedCommittedFilters);
    setFiltersOpen(true);
  }

  function openMobileSort() {
    setDraftSort(sort);
    setSortOpen(true);
  }

  function closeMobileSort() {
    setSortOpen(false);
  }

  function applyMobileSort() {
    setSortOpen(false);
    if (draftSort !== sort) {
      handleSortChange(draftSort);
    }
  }

  function closeMobileFilters() {
    setFiltersOpen(false);
  }

  function applyPageResult(productsResult: NonNullable<ProductsQueryResponse['products']>, nextPage: number, afterCursorForPage: string | null) {
    const products = productsResult.edges?.map((edge) => edge.node) || [];
    const nextStartCursor = productsResult.pageInfo?.startCursor || null;
    const nextEndCursor = productsResult.pageInfo?.endCursor || null;
    const nextHasMore = productsResult.pageInfo?.hasNextPage || false;

    setLoadedProducts(products);
    setVisibleTotalCount(productsResult.totalCount ?? totalCount);
    setStartCursor(nextStartCursor);
    setEndCursor(nextEndCursor);
    setHasMore(nextHasMore);
    setHasPreviousPage(productsResult.pageInfo?.hasPreviousPage || nextPage > 1);
    setCurrentPage(Math.min(totalPages, Math.max(1, nextPage)));
    setPageAfterCursors((cursors) => ({
      ...cursors,
      [nextPage]: afterCursorForPage,
      ...(nextHasMore && nextEndCursor ? { [nextPage + 1]: nextEndCursor } : {}),
    }));
    setPageSnapshots((snapshots) => ({
      ...snapshots,
      [nextPage]: {
        products,
        totalCount: productsResult.totalCount ?? totalCount,
        startCursor: nextStartCursor,
        endCursor: nextEndCursor,
        hasMore: nextHasMore,
        hasPreviousPage: productsResult.pageInfo?.hasPreviousPage || nextPage > 1,
        afterCursor: afterCursorForPage,
      },
    }));
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  function applyPageSnapshot(targetPage: number, snapshot: ProductPageSnapshot) {
    setLoadedProducts(snapshot.products);
    setVisibleTotalCount(snapshot.totalCount);
    setStartCursor(snapshot.startCursor);
    setEndCursor(snapshot.endCursor);
    setHasMore(snapshot.hasMore);
    setHasPreviousPage(snapshot.hasPreviousPage || targetPage > 1);
    setCurrentPage(targetPage);
    setPageAfterCursors((cursors) => ({
      ...cursors,
      [targetPage]: snapshot.afterCursor,
      ...(snapshot.hasMore && snapshot.endCursor ? { [targetPage + 1]: snapshot.endCursor } : {}),
    }));
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  async function fetchPageByCursor(targetPage: number, afterCursorForPage: string | null) {
    setLoadingPage(true);

    try {
      const result2 = await client.query<ProductsQueryResponse>(PRODUCT_LISTING_QUERY, {
        channel,
        first: pageSize,
        last: null,
        after: afterCursorForPage,
        before: null,
        filter: queryFilter,
        sortBy: { field: sortOption.field, direction: sortOption.direction },
      }).toPromise();

      if (result2.data?.products) {
        applyPageResult(result2.data.products, targetPage, afterCursorForPage);
      }
    } finally {
      setLoadingPage(false);
    }
  }

  async function handlePageMove(direction: 'next' | 'previous') {
    if (loadingPage) return;
    if (direction === 'next' && !endCursor) return;
    if (direction === 'previous' && !startCursor) return;

    const nextPage = direction === 'next'
      ? Math.min(totalPages, currentPage + 1)
      : Math.max(1, currentPage - 1);

    if (
      direction === 'previous'
      && Object.prototype.hasOwnProperty.call(pageAfterCursors, nextPage)
    ) {
      await fetchPageByCursor(nextPage, pageAfterCursors[nextPage] ?? null);
      return;
    }

    setLoadingPage(true);

    try {
      const afterCursorForPage = direction === 'next'
        ? endCursor
        : (pageAfterCursors[nextPage] ?? null);
      const result2 = await client.query<ProductsQueryResponse>(PRODUCT_LISTING_QUERY, {
        channel,
        first: direction === 'next' ? pageSize : null,
        last: direction === 'previous' ? pageSize : null,
        after: direction === 'next' ? endCursor : null,
        before: direction === 'previous' ? startCursor : null,
        filter: queryFilter,
        sortBy: { field: sortOption.field, direction: sortOption.direction },
      }).toPromise();

      if (result2.data?.products) {
        applyPageResult(result2.data.products, nextPage, afterCursorForPage);
      }
    } finally {
      setLoadingPage(false);
    }
  }

  async function handlePageSelect(targetPage: number) {
    if (loadingPage || targetPage === currentPage || targetPage < 1 || targetPage > totalPages) return;
    const snapshot = pageSnapshots[targetPage];
    if (snapshot) {
      applyPageSnapshot(targetPage, snapshot);
      return;
    }

    if (Object.prototype.hasOwnProperty.call(pageAfterCursors, targetPage)) {
      await fetchPageByCursor(targetPage, pageAfterCursors[targetPage] ?? null);
      return;
    }

    if (targetPage === currentPage + 1) {
      await handlePageMove('next');
      return;
    }
    if (targetPage === currentPage - 1) {
      await handlePageMove('previous');
      return;
    }

  }

  function getPaginationItems(): Array<number | 'ellipsis'> {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const pages = new Set<number>([1, currentPage]);
    if (currentPage > 1) pages.add(currentPage - 1);
    if (currentPage < totalPages) pages.add(currentPage + 1);

    return Array.from(pages)
      .filter((page) => page >= 1 && page <= totalPages)
      .sort((a, b) => a - b)
      .reduce<Array<number | 'ellipsis'>>((items, page) => {
        const previous = items[items.length - 1];
        if (typeof previous === 'number' && page - previous > 1) {
          items.push('ellipsis');
        }
        items.push(page);
        return items;
      }, []);
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

  function getActiveFilterChips() {
    const chips: ActiveFilterChip[] = [];

    for (const selectedCategoryId of normalizedCommittedFilters.categoryIds) {
      const label = categoryNameById.get(selectedCategoryId) ?? selectedCategoryId;
      chips.push({
        key: `category-${selectedCategoryId}`,
        label,
        onRemove: () => setCommittedFilters((prev) => ({
          ...prev,
          categoryIds: prev.categoryIds.filter((categoryIdValue) => categoryIdValue !== selectedCategoryId),
        })),
      });
    }

    if (normalizedCommittedFilters.priceMin || normalizedCommittedFilters.priceMax) {
      const currency = tCommon('currency');
      const label = normalizedCommittedFilters.priceMin && normalizedCommittedFilters.priceMax
        ? t('priceBetween', {
          min: normalizedCommittedFilters.priceMin,
          max: normalizedCommittedFilters.priceMax,
          currency,
        })
        : normalizedCommittedFilters.priceMin
          ? t('priceFrom', { price: `${normalizedCommittedFilters.priceMin} ${currency}` })
          : t('priceTo', { price: `${normalizedCommittedFilters.priceMax} ${currency}` });

      chips.push({
        key: 'price',
        label,
        onRemove: () => setCommittedFilters((prev) => ({
          ...prev,
          priceMin: '',
          priceMax: '',
        })),
      });
    }

    for (const allergen of normalizedCommittedFilters.excludeAllergens) {
      const label = t('withoutFilter', { value: tAllergens(allergen as any) });
      chips.push({
        key: `allergen-${allergen}`,
        label,
        onRemove: () => setCommittedFilters((prev) => ({
          ...prev,
          excludeAllergens: prev.excludeAllergens.filter((allergenValue) => allergenValue !== allergen),
        })),
      });
    }

    for (const tag of normalizedCommittedFilters.dietaryTags) {
      chips.push({
        key: `dietary-${tag}`,
        label: t(tag as any),
        onRemove: () => setCommittedFilters((prev) => ({
          ...prev,
          dietaryTags: prev.dietaryTags.filter((tagValue) => tagValue !== tag),
        })),
      });
    }

    if (normalizedCommittedFilters.storageZone) {
      const selectedZone = normalizedCommittedFilters.storageZone;
      chips.push({
        key: `zone-${selectedZone}`,
        label: tHome(selectedZone.toLowerCase() as any),
        onRemove: () => setCommittedFilters((prev) => ({
          ...prev,
          storageZone: '',
        })),
      });
    }

    for (const origin of normalizedCommittedFilters.countryOfOrigin) {
      const label = countryOriginByValue.get(origin) ?? origin;
      chips.push({
        key: `origin-${origin}`,
        label,
        onRemove: () => setCommittedFilters((prev) => ({
          ...prev,
          countryOfOrigin: prev.countryOfOrigin.filter((countryValue) => countryValue !== origin),
        })),
      });
    }

    for (const certification of normalizedCommittedFilters.certifications) {
      chips.push({
        key: `certification-${certification}`,
        label: t(certification as any),
        onRemove: () => setCommittedFilters((prev) => ({
          ...prev,
          certifications: prev.certifications.filter((certificationValue) => certificationValue !== certification),
        })),
      });
    }

    return chips;
  }

  function renderActiveFilterSummary(isCompact = false) {
    const chips = getActiveFilterChips();

    if (chips.length === 0) {
      return null;
    }

    return (
      <section
        data-testid="product-filter-summary"
        className={`rounded-[1.15rem] border ${isCompact ? 'space-y-3 px-3 py-3' : 'mb-6 flex flex-wrap items-center justify-between gap-3 px-4 py-3'}`}
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'color-mix(in srgb, var(--color-card) 82%, var(--color-accent))',
        }}
        aria-label={t('activeFilters')}
      >
        <p className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
          {t('showing', { count: loadedProducts.length, total: totalCount })}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.onRemove}
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-fast hover-surface"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-card)',
                color: 'var(--color-foreground)',
              }}
              aria-label={t('removeFilter', { filter: chip.label })}
            >
              {chip.label}
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          ))}
          <button
            type="button"
            onClick={clearCommittedFilters}
            className="px-2 py-1.5 text-xs font-semibold transition-opacity duration-fast hover:opacity-80"
            style={{ color: 'var(--color-primary)' }}
          >
            {t('clearAllFilters')}
          </button>
        </div>
      </section>
    );
  }

  function renderEmptyState(isCompact = false) {
    const hasActiveFilters = activeFilterCount > 0;

    return (
      <div
        className={`${isCompact ? 'rounded-[1.75rem] px-5 py-10' : 'rounded-2xl px-6 py-14'} border text-center`}
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
      >
        <p className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
          {hasActiveFilters ? t('emptyFilteredTitle') : t('emptyTitle')}
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          {hasActiveFilters ? t('emptyFilteredDescription') : t('emptyDescription')}
        </p>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearCommittedFilters}
            className="mt-4 inline-flex items-center justify-center rounded-full border px-4 py-2.5 text-sm font-medium transition-colors duration-fast hover-surface"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
          >
            {t('clearFilters')}
          </button>
        )}
      </div>
    );
  }

  function renderPaginationControls(isCompact = false) {
    if (totalCount <= pageSize || loadedProducts.length === 0) {
      return null;
    }

    const canGoPrevious = hasPreviousPage && currentPage > 1;
    const canGoNext = hasMore;
    const paginationItems = getPaginationItems();

    return (
      <nav
        className={`mt-8 flex ${isCompact ? 'flex-col items-stretch gap-3' : 'flex-wrap items-center justify-between gap-3'}`}
        aria-label={t('pagination')}
        data-testid="product-pagination"
      >
        <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          {t('showingRange', {
            from: currentRangeStart,
            to: currentRangeEnd,
            total: totalCount,
          })}
        </p>

        <div className={`flex items-center ${isCompact ? 'justify-between' : 'justify-end'} gap-2`}>
          <button
            type="button"
            onClick={() => void handlePageMove('previous')}
            disabled={!canGoPrevious || loadingPage}
            className="inline-flex min-h-11 items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold transition-colors duration-fast hover-surface disabled:cursor-not-allowed disabled:opacity-45"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
          >
            {t('previousPage')}
          </button>
          <div className="flex min-w-0 flex-1 items-center justify-center gap-1 overflow-x-auto px-1 sm:flex-none" aria-label={t('pageStatus', { current: currentPage, total: totalPages })}>
            {paginationItems.map((item, index) => {
              if (item === 'ellipsis') {
                return (
                  <span
                    key={`ellipsis-${index}`}
                    className="inline-flex min-h-11 min-w-8 items-center justify-center px-1 text-sm font-semibold"
                    style={{ color: 'var(--color-muted-foreground)' }}
                    aria-hidden="true"
                  >
                    ...
                  </span>
                );
              }

              const canSelectPage = item === currentPage
                || (item === currentPage + 1 && canGoNext)
                || (item === currentPage - 1 && canGoPrevious)
                || Boolean(pageSnapshots[item])
                || Object.prototype.hasOwnProperty.call(pageAfterCursors, item);
              const isCurrentPage = item === currentPage;

              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => void handlePageSelect(item)}
                  disabled={loadingPage || isCurrentPage || !canSelectPage}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border px-3 py-2 text-sm font-semibold tabular-nums transition-colors duration-fast hover-surface disabled:cursor-not-allowed disabled:opacity-45"
                  style={{
                    borderColor: isCurrentPage ? 'var(--color-primary)' : 'var(--color-border)',
                    backgroundColor: isCurrentPage ? 'var(--color-primary)' : 'var(--color-card)',
                    color: isCurrentPage ? 'var(--color-primary-foreground)' : 'var(--color-foreground)',
                  }}
                  aria-current={isCurrentPage ? 'page' : undefined}
                >
                  {item}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => void handlePageMove('next')}
            disabled={!canGoNext || loadingPage}
            className="inline-flex min-h-11 items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold transition-colors duration-fast hover-surface disabled:cursor-not-allowed disabled:opacity-45"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
          >
            {loadingPage ? tCommon('loading') : t('nextPage')}
          </button>
        </div>
      </nav>
    );
  }

  function renderMobileProductsContent() {
    if (isInitialLoading) {
      return (
        <div data-testid="mobile-products-grid" className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <MobileProductSkeleton key={index} />
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
            {loadedProducts.map((product, index) => (
              <MobileProductCard key={product.id} product={product} imagePriority={index < 8} showCatalogFacts />
            ))}
          </div>

          {renderPaginationControls(true)}
        </>
      );
    }

    return renderEmptyState(true);
  }

  function renderDesktopProductsContent() {
    const gridClassName = hasDesktopSidebar
      ? 'product-grid grid grid-cols-2 gap-5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-4'
      : 'product-grid grid grid-cols-2 gap-5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4';

    if (isInitialLoading) {
      return (
        <div className={gridClassName}>
          {Array.from({ length: 12 }).map((_, index) => (
            <ProductSkeleton key={index} />
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
          <div className={gridClassName}>
            {loadedProducts.map((product, index) => (
              <ProductCard key={product.id} product={product} imagePriority={index < 8} showCatalogFacts />
            ))}
          </div>

          {renderPaginationControls(false)}
        </>
      );
    }

    return renderEmptyState(false);
  }

  function renderDesktopSidebar() {
    if (!hasDesktopSidebar) return null;

    return (
      <aside className="hidden w-[17.5rem] shrink-0 space-y-5 lg:block" data-testid="desktop-category-sidebar">
        <section
          className="rounded-[1.15rem] border bg-[var(--color-card)] p-4"
          style={{ borderColor: 'var(--color-border)' }}
          aria-label={t('categoryFilter')}
        >
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--color-muted-foreground)' }}>
            {t('categoryFilter')}
          </h2>
          <nav className="max-h-[30rem] space-y-1.5 overflow-y-auto pr-1">
            {categoryNavigation.map((category) => {
              const isActive = currentCategorySlug === category.slug;

              return (
                <Link
                  key={category.id}
                  href={`/categories/${category.slug}`}
                  className="flex min-h-[2.75rem] items-center justify-between gap-3 rounded-[0.9rem] px-3 py-2 text-sm font-semibold transition-colors duration-fast hover-surface"
                  style={{
                    backgroundColor: isActive ? 'var(--color-accent)' : 'transparent',
                    color: isActive ? 'var(--color-primary)' : 'var(--color-foreground)',
                  }}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="min-w-0 leading-snug">{category.name}</span>
                  {typeof category.count === 'number' && (
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums"
                      style={{
                        backgroundColor: isActive
                          ? 'color-mix(in srgb, var(--color-primary) 13%, white)'
                          : 'color-mix(in srgb, var(--color-foreground) 6%, transparent)',
                        color: isActive ? 'var(--color-primary)' : 'var(--color-muted-foreground)',
                      }}
                    >
                      {category.count}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </section>

        <section
          className="sticky top-28 rounded-[1.15rem] border bg-[var(--color-card)] p-4"
          style={{ borderColor: 'var(--color-border)' }}
          aria-label={t('filters')}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--color-muted-foreground)' }}>
              {t('filters')}
            </h2>
            {activeFilterCount > 0 && (
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {activeFilterCount}
              </span>
            )}
          </div>
          <div className="space-y-5">
            {renderFilterContent(committedFilters, normalizedCommittedFilters, setCommittedFilters, clearCommittedFilters)}
          </div>
        </section>
      </aside>
    );
  }

  function renderMobileCategoryRail() {
    if (!hasCategoryNavigation) return null;

    return (
      <section className="-mx-4 space-y-2 overflow-hidden" data-testid="mobile-category-rail" aria-label={t('categoryFilter')}>
        <div className="px-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-muted-foreground)' }}>
            {t('categoryFilter')}
          </p>
        </div>
        <div className="flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categoryNavigation.map((category) => {
            const isActive = currentCategorySlug === category.slug;

            return (
              <Link
                key={category.id}
                href={`/categories/${category.slug}`}
                className="inline-flex min-h-[2.45rem] shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold shadow-[0_12px_24px_-24px_rgba(66,109,72,0.35)] transition-colors duration-fast"
                style={{
                  borderColor: isActive ? 'var(--color-primary)' : 'var(--color-border)',
                  backgroundColor: isActive ? 'var(--color-accent)' : 'var(--color-card)',
                  color: isActive ? 'var(--color-primary)' : 'var(--color-foreground)',
                }}
                aria-current={isActive ? 'page' : undefined}
              >
                <span>{category.name}</span>
                {typeof category.count === 'number' && (
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums"
                    style={{
                      backgroundColor: isActive
                        ? 'color-mix(in srgb, var(--color-primary) 13%, white)'
                        : 'color-mix(in srgb, var(--color-foreground) 6%, transparent)',
                      color: isActive ? 'var(--color-primary)' : 'var(--color-muted-foreground)',
                    }}
                  >
                    {category.count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </section>
    );
  }

  function renderMobileShell() {
    return (
      <div data-testid="mobile-products-shell" className="space-y-4">
        <header className="space-y-4">
          {showTitle && (
            <h1
              className="max-w-[11.5rem] text-[1.95rem] font-semibold leading-[0.98] tracking-[-0.045em]"
              style={{ color: 'var(--color-foreground)' }}
              data-testid="mobile-products-title"
            >
              {title}
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
          )}

          <div data-testid="mobile-products-toolbar" className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <button
              id="mobile-products-sort-trigger"
              type="button"
              onClick={openMobileSort}
              className="flex min-h-[3rem] min-w-0 items-center gap-3 rounded-full border bg-[var(--color-card)] px-3.5 py-2 text-left shadow-[0_16px_30px_-28px_rgba(66,109,72,0.45)] transition-colors duration-fast hover-surface focus:outline-none focus-visible:ring-2"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-foreground)',
              }}
              aria-haspopup="dialog"
              aria-expanded={sortOpen}
              aria-controls="mobile-sort-sheet"
              data-testid="mobile-products-sort-trigger"
            >
              <ArrowDownUp className="h-4 w-4 shrink-0" style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span
                  className="block text-[10px] font-semibold uppercase tracking-[0.12em]"
                  style={{ color: 'var(--color-muted-foreground)' }}
                  data-testid="mobile-products-sort-label"
                >
                  {t('sortBy')}
                </span>
                <span className="mt-0.5 block truncate text-sm font-semibold">{t(sortOption.label as any)}</span>
              </span>
              <ChevronDown
                className="h-4 w-4 shrink-0"
                style={{ color: 'var(--color-muted-foreground)' }}
                aria-hidden="true"
              />
              <input type="hidden" value={sort} data-testid="mobile-products-sort-select" readOnly />
            </button>

            <button
              type="button"
              onClick={openMobileFilters}
              className="inline-flex min-h-[3rem] shrink-0 items-center gap-2 rounded-full border bg-[var(--color-card)] px-3.5 py-2 text-sm font-semibold shadow-[0_16px_30px_-28px_rgba(66,109,72,0.45)] transition-colors duration-fast hover-surface"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
              aria-expanded={filtersOpen}
              aria-controls="mobile-filter-sheet"
              aria-label={activeFilterCount > 0 ? `${t('filters')}, ${t('activeFilterCount', { count: activeFilterCount })}` : t('filters')}
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

          {renderMobileCategoryRail()}

          <div className="h-px w-full" style={{ backgroundColor: 'color-mix(in srgb, var(--color-border) 88%, transparent)' }} />
        </header>

        {renderActiveFilterSummary(true)}

        {sortOpen && (
          <div className="fixed inset-0 isolate z-[70] md:hidden" data-testid="mobile-sort-sheet" role="dialog" aria-modal="true" aria-label={t('sortBy')}>
            <button
              type="button"
              className="absolute inset-0 z-0 bg-black/45"
              aria-label={`${tCommon('close')} ${t('sortBy').toLowerCase()}`}
              onClick={closeMobileSort}
            />
            <div
              className="absolute inset-x-0 bottom-0 z-10 flex max-h-[56vh] w-full flex-col overflow-hidden rounded-t-[1.35rem] border animate-bottom-sheet-in"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: '#fff',
                boxShadow: '0 -18px 42px -28px rgba(15, 23, 42, 0.45)',
              }}
            >
              <div className="mx-auto mt-2.5 h-1.5 w-12 rounded-full" style={{ backgroundColor: 'var(--color-border)' }} />
              <div className="flex items-center justify-between gap-3 border-b px-4 pb-3 pt-3.5" style={{ borderColor: 'var(--color-border)' }}>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
                    {t('sortBy')}
                  </p>
                  <p className="mt-1 text-sm" style={{ color: 'var(--color-foreground)' }}>
                    {t((SORT_OPTIONS.find((option) => option.value === draftSort) || SORT_OPTIONS[0]).label as any)}
                  </p>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium hover-surface"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
                  aria-label={`${tCommon('close')} ${t('sortBy').toLowerCase()}`}
                  onClick={closeMobileSort}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                  {tCommon('close')}
                </button>
              </div>

              <div className="space-y-1.5 overflow-y-auto px-4 py-3" role="radiogroup" aria-label={t('sortBy')}>
                {SORT_OPTIONS.map((option) => {
                  const isSelected = draftSort === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => setDraftSort(option.value)}
                      className="flex min-h-[2.85rem] w-full items-center justify-between gap-3 rounded-[0.9rem] border px-4 py-2.5 text-left text-sm font-semibold transition-colors duration-fast"
                      style={{
                        borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-border)',
                        backgroundColor: isSelected ? 'var(--color-accent)' : 'transparent',
                        color: isSelected ? 'var(--color-primary)' : 'var(--color-foreground)',
                      }}
                    >
                      <span>{t(option.label as any)}</span>
                      <span
                        className="flex h-5 w-5 items-center justify-center rounded-full border"
                        style={{
                          borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-border)',
                          backgroundColor: isSelected ? 'var(--color-primary)' : 'transparent',
                        }}
                        aria-hidden="true"
                      >
                        {isSelected && <span className="h-2 w-2 rounded-full bg-white" />}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div
                className="grid grid-cols-2 gap-3 border-t px-4 pb-3 pt-3"
                style={{
                  borderColor: 'var(--color-border)',
                  paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)',
                }}
              >
                <button
                  type="button"
                  onClick={closeMobileSort}
                  className="rounded-full border px-4 py-3 text-base font-semibold transition-colors duration-fast hover-surface"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
                >
                  {t('cancelSort')}
                </button>
                <button
                  type="button"
                  onClick={applyMobileSort}
                  className="rounded-full px-4 py-3 text-base font-semibold text-white transition-opacity duration-fast hover:opacity-90"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {t('applySort')}
                </button>
              </div>
            </div>
          </div>
        )}

        {filtersOpen && (
          <div className="fixed inset-0 isolate z-[70]" data-testid="mobile-filter-sheet" role="dialog" aria-modal="true" aria-label={t('filters')}>
            <button
              type="button"
              className="absolute inset-0 z-0 bg-black/45"
              aria-label={`${tCommon('close')} ${t('filters').toLowerCase()}`}
              onClick={closeMobileFilters}
            />
            <div
              className="absolute inset-x-0 bottom-0 z-10 flex max-h-[82vh] w-full flex-col overflow-hidden rounded-t-[1.35rem] border animate-bottom-sheet-in"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: '#fff',
                boxShadow: '0 -18px 42px -28px rgba(15, 23, 42, 0.45)',
              }}
            >
              <div className="mx-auto mt-2.5 h-1.5 w-12 rounded-full" style={{ backgroundColor: 'var(--color-border)' }} />
              <div className="flex items-center justify-between gap-3 border-b px-4 pb-3 pt-3.5" style={{ borderColor: 'var(--color-border)' }}>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
                    {t('filters')}
                  </p>
                  {draftFilterCount > 0 && (
                    <p className="mt-1 text-sm" style={{ color: 'var(--color-foreground)' }}>
                      {t('activeFilterCount', { count: draftFilterCount })}
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

              <div className="flex-1 overflow-y-auto px-4 py-4">
                <div className="space-y-4">
                  {renderFilterContent(draftFilters, normalizedDraftFilters, setDraftFilters, clearDraftFilters)}
                </div>
              </div>

              <div
                className="border-t px-4 pb-3 pt-3"
                style={{
                  borderColor: 'var(--color-border)',
                  paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)',
                }}
              >
                <button
                  type="button"
                  onClick={applyMobileFilters}
                  className="w-full rounded-full px-4 py-3 text-base font-semibold text-white transition-opacity duration-fast hover:opacity-90"
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
    );
  }

  function renderDesktopShell() {
    const content = (
      <div className="min-w-0 flex-1">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          {showTitle ? (
            <h1 className="heading-display text-2xl md:text-3xl" style={{ color: 'var(--color-foreground)' }}>
              {title}
              {totalCount > 0 && (
                <span className="ml-2 text-base font-normal tabular-nums" style={{ color: 'var(--color-muted-foreground)' }}>
                  ({totalCount})
                </span>
              )}
            </h1>
          ) : (
            <div aria-hidden="true" />
          )}
          <div className="flex items-center gap-2">
            <SortDropdown value={sort} onChange={handleSortChange} />
            {!hasDesktopSidebar && (
              <button
                type="button"
                onClick={() => setFiltersOpen(!filtersOpen)}
                className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors duration-fast hover-surface"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
                aria-expanded={filtersOpen}
                aria-controls="filter-panel"
                aria-label={activeFilterCount > 0 ? `${t('filters')}, ${t('activeFilterCount', { count: activeFilterCount })}` : t('filters')}
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
            )}
          </div>
        </div>

        {!hasDesktopSidebar && filtersOpen && (
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

        {renderActiveFilterSummary(false)}

        {renderDesktopProductsContent()}
      </div>
    );

    if (hasDesktopSidebar) {
      return (
        <div className="flex items-start gap-6">
          {renderDesktopSidebar()}
          {content}
        </div>
      );
    }

    return content;
  }

  function renderContent() {
    if (layoutMode === 'adaptive') {
      if (isMobileLayout === null) {
        return (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
            {Array.from({ length: 8 }).map((_, index) => (
              <MobileProductSkeleton key={index} />
            ))}
          </div>
        );
      }

      return isMobileLayout ? renderMobileShell() : renderDesktopShell();
    }

    return (
      <>
        <div className="md:hidden">
          {renderMobileShell()}
        </div>
        <div className="hidden md:block">
          {renderDesktopShell()}
        </div>
      </>
    );
  }

  if (!withContainer) {
    return renderContent();
  }

  return (
    <div className="container-grocery py-8 md:py-12">
      {renderContent()}
    </div>
  );
}
