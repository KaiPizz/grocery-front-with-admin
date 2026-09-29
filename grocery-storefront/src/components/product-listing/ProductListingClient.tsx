'use client';

import { useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { ArrowDownUp, ChevronDown, ChevronLeft, ChevronRight, SlidersHorizontal, X } from 'lucide-react';
import { useClient, useQuery, type CombinedError } from 'urql';

import { SortDropdown, getSortOptions } from '@/components/grocery/SortDropdown';
import { MobileProductCard } from '@/components/product/MobileProductCard';
import { ProductCard } from '@/components/product/ProductCard';
import { useHydrated } from '@/hooks/use-hydrated';
import { buildPageItems, decodeOffsetCursor, offsetAfterCursorForPage, type PageItem } from '@/lib/listing-pagination';
import { Link, useRouter } from '@/i18n/navigation';
import {
  getCatalogCategoryDisplay,
  getLocalizedCountryOrigin,
} from '@/lib/catalog-display-localization';
import {
  PRODUCT_BRANDS_QUERY,
  PRODUCT_COUNTRY_ORIGINS_QUERY,
  PRODUCT_LISTING_QUERY,
} from '@/lib/graphql/operations/grocery';
import type { GroceryProduct, StorageZone } from '@/types';
import { FilterChipGroup, FilterSection, type FilterChipOption } from './FilterChipGroup';
import {
  DEFAULT_FILTERS,
  areFiltersEqual,
  buildProductFilter,
  countActiveFilters,
  normalizeFiltersState,
  parseCountryQueryParams,
  setCountryQueryParams,
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

interface ProductCountryOriginNode {
  value: string;
  count: number;
}

interface ProductCountryOriginsQueryResponse {
  productCountryOrigins: ProductCountryOriginNode[] | null;
}

interface ProductFacetCountNode {
  value: string;
  count: number;
}

interface ProductBrandsQueryResponse {
  productBrands: ProductFacetCountNode[] | null;
}

interface CategoryNavigationLeaf {
  id: string;
  slug: string;
  name: string;
  count: number | null;
}

interface CategoryNavigationItem extends CategoryNavigationLeaf {
  /** Leaves of this group; rendered only while the group is `expanded`. */
  children?: CategoryNavigationLeaf[];
  expanded?: boolean;
}

interface ActiveFilterChip {
  key: string;
  label: string;
  onRemove: () => void;
}

const EMPTY_CATEGORY_IDS: string[] = [];

// Facet counts are computed for the page's category scope only; once another
// filter narrows the listing the counts would overstate, so they are hidden.
function hasNarrowedFacetScope(filters: ProductFiltersState): boolean {
  return filters.categoryIds.length > 0
    || filters.brands.length > 0
    || Boolean(filters.storageZone)
    || filters.inStockOnly
    || Boolean(filters.priceMin || filters.priceMax);
}

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

// Phone subcategory chips. The group page shows two wrapped rows and the
// rest behind "Show all (N)"; a subcategory page shows every chip, so the
// chips sit in the same place on every sibling page. The state comes from
// the server render — nothing jumps after hydration or under a tapping
// finger — and a measurement after mount may only drop the toggle when every
// chip fits in two rows.
function ClampedChipRows({
  children,
  itemCount,
  activeIndex,
}: {
  children: ReactNode;
  itemCount: number;
  activeIndex: number;
}) {
  const t = useTranslations('products');
  const rowsRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(activeIndex > 0);
  const [fitsTwoRows, setFitsTwoRows] = useState(itemCount <= 3);

  useEffect(() => {
    const rows = rowsRef.current;
    if (!rows || fitsTwoRows) return;

    const measure = () => {
      const chips = Array.from(rows.children) as HTMLElement[];
      const rowTops = Array.from(new Set(chips.map((chip) => chip.offsetTop))).sort((a, b) => a - b);
      if (rowTops.length > 0 && rowTops.length <= 2) setFitsTwoRows(true);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(rows);
    return () => observer.disconnect();
  }, [fitsTwoRows]);

  const clamped = !fitsTwoRows && !expanded;

  return (
    <>
      <div
        ref={rowsRef}
        className={`flex flex-wrap gap-1.5 px-4 pb-1 ${clamped ? 'max-h-[5.1rem] overflow-hidden' : ''}`}
        // Keyboard users tabbing into a hidden row get the rows opened; a tap
        // (no :focus-visible) must not move the chips under the finger.
        onFocusCapture={(event) => {
          if ((event.target as HTMLElement).matches(':focus-visible')) setExpanded(true);
        }}
      >
        {children}
      </div>
      {!fitsTwoRows && (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="ml-4 mt-1 inline-flex min-h-9 items-center gap-1 text-[13px] font-semibold"
          style={{ color: 'var(--color-primary)' }}
          aria-expanded={expanded}
          data-testid="category-rail-toggle"
        >
          {expanded ? t('showFewerCategories') : t('showMoreCategories', { count: itemCount - 1 })}
          <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
      )}
    </>
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
  const locale = useLocale();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isHydrated = useHydrated();
  const client = useClient();
  // `?country=` is the one filter with external producers (the "Kuchnie"
  // header menu), so it seeds the state and follows later URL changes — a
  // soft navigation between two cuisines re-renders this same instance.
  const countriesFromUrl = useMemo(
    () => parseCountryQueryParams(searchParams),
    [searchParams],
  );
  const countryQueryKey = countriesFromUrl.join('\u0000');

  const [committedFilters, setCommittedFilters] = useState<ProductFiltersState>(() => ({
    ...DEFAULT_FILTERS,
    countryOfOrigin: countriesFromUrl,
    storageZone: initialZone || '',
  }));
  const [draftFilters, setDraftFilters] = useState<ProductFiltersState>(() => ({
    ...DEFAULT_FILTERS,
    countryOfOrigin: countriesFromUrl,
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
  const [pageAfterCursors, setPageAfterCursors] = useState<Record<number, string | null>>(() => {
    const initialCursors: Record<number, string | null> = { 1: null };

    if (initialHasMore && initialEndCursor) {
      initialCursors[2] = initialEndCursor;
    }

    return initialCursors;
  });
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
  const pageRequestIdRef = useRef(0);
  const [filterMetadataRequested, setFilterMetadataRequested] = useState(initialProducts.length > 0);
  const [isMobileLayout, setIsMobileLayout] = useState<boolean | null>(layoutMode === 'adaptive' ? null : false);
  const [initialListingReusable, setInitialListingReusable] = useState(initialProducts.length > 0);

  useEffect(() => {
    const urlSearch = (searchParams.get('search') || '').trim();
    const fallbackSort = urlSearch ? 'relevance' : 'newest';
    const requestedSort = searchParams.get('sort') || fallbackSort;
    const supportedSort = getSortOptions(Boolean(urlSearch)).some((option) => option.value === requestedSort)
      ? requestedSort
      : fallbackSort;

    setSearch((currentSearch) => currentSearch === urlSearch ? currentSearch : urlSearch);
    setSort((currentSort) => currentSort === supportedSort ? currentSort : supportedSort);
    setDraftSort((currentSort) => currentSort === supportedSort ? currentSort : supportedSort);
  }, [searchParams]);

  useEffect(() => {
    const nextCountries = countryQueryKey ? countryQueryKey.split('\u0000') : [];
    const syncCountries = (previous: ProductFiltersState) => (
      previous.countryOfOrigin.length === nextCountries.length
      && previous.countryOfOrigin.every((country, index) => country === nextCountries[index])
        ? previous
        : { ...previous, countryOfOrigin: nextCountries }
    );

    setCommittedFilters(syncCountries);
    setDraftFilters(syncCountries);
  }, [countryQueryKey]);

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

  const normalizedSearch = search.trim();
  const sortOptions = getSortOptions(Boolean(normalizedSearch));
  const sortOption = sortOptions.find((option) => option.value === sort) || sortOptions[0];
  const listingSourceKey = `${channel}\u0000${pageSize}`;
  const listingDisplayKey = `${listingSourceKey}\u0000${normalizedSearch}\u0000${sortOption.value}`;
  const listingDisplayKeyRef = useRef(listingDisplayKey);
  const initialListingSourceKeyRef = useRef(listingSourceKey);
  const listingDisplayChanged = listingDisplayKeyRef.current !== listingDisplayKey;
  const displayedProducts = listingDisplayChanged ? [] : loadedProducts;
  const activeCategoryIds = useMemo(() => (
    categoryIds.length > 0 ? categoryIds : categoryId ? [categoryId] : []
  ), [categoryId, categoryIds]);
  const countryOriginCategoryIds = activeCategoryIds.length > 0 ? activeCategoryIds : null;
  const [countryOriginsResult] = useQuery<ProductCountryOriginsQueryResponse>({
    query: PRODUCT_COUNTRY_ORIGINS_QUERY,
    pause: !filterMetadataRequested,
    variables: {
      channel,
      first: 100,
      categoryIds: countryOriginCategoryIds,
    },
  });
  // The brand list is scoped to the selected countries (the "Kuchnie" landing
  // sets one): a channel-wide list would offer brands with no product in the
  // country and most chips would lead to an empty listing.
  const brandFacetCountries = committedFilters.countryOfOrigin
    .map((country) => country.trim())
    .filter(Boolean);
  const [brandsResult] = useQuery<ProductBrandsQueryResponse>({
    query: PRODUCT_BRANDS_QUERY,
    pause: !filterMetadataRequested,
    variables: {
      channel,
      // The backend caps this at 100; the group shows 8 and the search box
      // reaches the long tail.
      first: 100,
      categoryIds: countryOriginCategoryIds,
      countryOfOrigin: brandFacetCountries.length > 0 ? brandFacetCountries : null,
    },
  });

  const filterSourceProducts = displayedProducts;
  // A backend without `productBrands` answers with a validation error; that
  // only hides the brand section, every other filter keeps working.
  const availableBrands = useMemo<FilterChipOption[]>(() => {
    if (brandsResult.error) return [];

    return (brandsResult.data?.productBrands ?? [])
      .filter((brand) => brand?.value?.trim())
      .map((brand) => ({
        value: brand.value.trim(),
        label: brand.value.trim(),
        count: Number(brand.count) || 0,
      }));
  }, [brandsResult.data, brandsResult.error]);
  const availableCountryOrigins = useMemo(() => {
    const origins = countryOriginsResult.data?.productCountryOrigins ?? [];

    return origins
      .filter((origin) => origin?.value?.trim())
      .map((origin) => ({
        value: origin.value.trim(),
        label: getLocalizedCountryOrigin(origin.value, locale) ?? origin.value.trim(),
        count: Number(origin.count) || 0,
      }))
      .sort((left, right) => {
        if (left.value === 'Wietnam') return -1;
        if (right.value === 'Wietnam') return 1;
        if (right.count !== left.count) return right.count - left.count;
        return left.label.localeCompare(right.label, locale);
      });
  }, [countryOriginsResult.data, locale]);
  const availableCategories = useMemo(() => {
    const categories = new Map<string, CategoryFilterOption>();

    for (const product of filterSourceProducts) {
      const category = (product as GroceryProduct & Record<string, any>)?.category;
      const id = typeof category?.id === 'string' ? category.id : null;
      const name = typeof category?.name === 'string' ? category.name : null;
      const slug = typeof category?.slug === 'string' ? category.slug : null;

      if (!id || !name || !slug) continue;

      const displayCategory = getCatalogCategoryDisplay({ id, name, slug }, locale);

      const existing = categories.get(id);
      categories.set(id, {
        id,
        name: displayCategory?.name ?? name,
        count: (existing?.count ?? 0) + 1,
      });
    }

    return Array.from(categories.values()).sort((left, right) => left.name.localeCompare(right.name, locale));
  }, [filterSourceProducts, locale]);
  const categoryNameById = useMemo(() => new Map(availableCategories.map((category) => [category.id, category.name])), [availableCategories]);
  const countryOriginByValue = useMemo(() => new Map(availableCountryOrigins.map((origin) => [origin.value, origin.label])), [availableCountryOrigins]);

  const normalizedCommittedFilters = useMemo(
    () => normalizeFiltersState(committedFilters, null),
    [committedFilters],
  );
  const normalizedDraftFilters = useMemo(
    () => normalizeFiltersState(draftFilters, null),
    [draftFilters],
  );
  const initialFilters = useMemo<ProductFiltersState>(() => ({
    ...DEFAULT_FILTERS,
    storageZone: initialZone || '',
  }), [initialZone]);
  const normalizedInitialFilters = useMemo(
    () => normalizeFiltersState(initialFilters, null),
    [initialFilters],
  );

  const filter = useMemo(
    () => buildProductFilter(normalizedCommittedFilters, search, activeCategoryIds),
    [activeCategoryIds, normalizedCommittedFilters, search],
  );
  const queryFilter = Object.keys(filter).length > 0 ? filter : undefined;
  const queryFilterKey = JSON.stringify(queryFilter ?? null);
  const listingQueryResetKey = `${listingDisplayKey}\u0000${queryFilterKey}`;
  const listingQueryResetKeyRef = useRef(listingQueryResetKey);
  const latestListingQueryKeyRef = useRef(listingQueryResetKey);
  latestListingQueryKeyRef.current = listingQueryResetKey;
  const initialListingMatchesCurrentState = initialProducts.length > 0
    && listingSourceKey === initialListingSourceKeyRef.current
    && search === initialSearch
    && sort === initialSort
    && areFiltersEqual(normalizedCommittedFilters, normalizedInitialFilters);
  const canUseInitialListingResult = initialListingReusable && initialListingMatchesCurrentState;

  useEffect(() => {
    if (initialListingReusable && !initialListingMatchesCurrentState) {
      setInitialListingReusable(false);
    }
  }, [initialListingMatchesCurrentState, initialListingReusable]);

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
    if (listingQueryResetKeyRef.current === listingQueryResetKey) {
      return;
    }
    listingQueryResetKeyRef.current = listingQueryResetKey;

    // Do not keep products from a previous channel, page-size, search, or sort
    // visible while their replacement is in flight. Category navigation may
    // reuse server-provided products, so filters alone do not clear the grid.
    if (listingDisplayKeyRef.current !== listingDisplayKey) {
      listingDisplayKeyRef.current = listingDisplayKey;
      setLoadedProducts([]);
      setVisibleTotalCount(0);
    }
    setCurrentPage(1);
    setStartCursor(null);
    setEndCursor(null);
    setHasMore(false);
    setHasPreviousPage(false);
    setPageAfterCursors({ 1: null });
    setPageSnapshots({});
    pageRequestIdRef.current += 1;
    setLoadingPage(false);
  }, [listingDisplayKey, listingQueryResetKey]);

  useEffect(() => {
    if (!result.fetching && result.data?.products) {
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
  }, [result.data, result.fetching]);

  const productsErrorMessage = getProductsErrorMessage(result.error, tCommon('error'));
  const hasProductsError = Boolean(productsErrorMessage);
  const totalCount = hasProductsError || listingDisplayChanged ? 0 : visibleTotalCount;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const canJumpToAnyPage = decodeOffsetCursor(endCursor) !== null || decodeOffsetCursor(startCursor) !== null;
  const currentRangeStart = displayedProducts.length > 0 ? ((currentPage - 1) * pageSize) + 1 : 0;
  const currentRangeEnd = displayedProducts.length > 0 ? Math.min(totalCount, currentRangeStart + displayedProducts.length - 1) : 0;
  const activeFilterCount = countActiveFilters(normalizedCommittedFilters);
  const draftFilterCount = countActiveFilters(normalizedDraftFilters);
  const isInitialLoading = result.fetching && displayedProducts.length === 0 && !hasProductsError;
  const hasCategoryNavigation = categoryNavigation.length > 0;
  const hasDesktopSidebar = hasCategoryNavigation;

  function renderFilterContent(
    filters: ProductFiltersState,
    normalizedFilters: ProductFiltersState,
    setFilters: Dispatch<SetStateAction<ProductFiltersState>>,
    onClear: () => void,
    syncCountryUrl = false,
  ) {
    const categoryFilterUnavailable = availableCategories.length === 0;
    const brandFilterUnavailable = availableBrands.length === 0;
    const countryFilterUnavailable = availableCountryOrigins.length === 0;
    const localActiveFilterCount = countActiveFilters(normalizedFilters);
    const showFacetCounts = !normalizedSearch && !hasNarrowedFacetScope(normalizedFilters);
    const priceSummary = [normalizedFilters.priceMin, normalizedFilters.priceMax].some(Boolean)
      ? `${normalizedFilters.priceMin || '0'} – ${normalizedFilters.priceMax || '…'}`
      : '';

    return (
      <>
        <label
          className="flex cursor-pointer items-center gap-3 text-sm font-medium"
          style={{ color: 'var(--color-foreground)' }}
        >
          <input
            type="checkbox"
            checked={filters.inStockOnly}
            onChange={(event) => setFilters((prev) => ({ ...prev, inStockOnly: event.target.checked }))}
            className="h-4 w-4 rounded border"
            style={{ accentColor: 'var(--color-primary)' }}
            data-testid="filter-in-stock-only"
          />
          {t('inStockOnly')}
        </label>

        {!hasCategoryNavigation && activeCategoryIds.length === 0 && !categoryFilterUnavailable && (
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

        {!brandFilterUnavailable && (
          <FilterChipGroup
            legend={t('brandFilter')}
            options={availableBrands}
            selected={normalizedFilters.brands}
            onToggle={(brand) => setFilters((prev) => ({
              ...prev,
              brands: toggleMultiValue(prev.brands, brand),
            }))}
            showCounts={showFacetCounts}
            initialLimit={8}
            moreLabel={(hiddenCount) => t('showMoreOptions', { count: hiddenCount })}
            lessLabel={t('showLessOptions')}
            testId="filter-brand"
            searchLabel={t('searchBrands')}
            noMatchesLabel={t('noBrandMatches')}
          />
        )}

        {!countryFilterUnavailable && (
          <FilterChipGroup
            legend={t('countryOriginFilter')}
            options={availableCountryOrigins}
            selected={normalizedFilters.countryOfOrigin}
            onToggle={(origin) => {
              const nextCountries = toggleMultiValue(normalizedFilters.countryOfOrigin, origin);
              setFilters((prev) => ({
                ...prev,
                countryOfOrigin: toggleMultiValue(prev.countryOfOrigin, origin),
              }));
              if (syncCountryUrl) syncCountryQuery(nextCountries);
            }}
            showCounts={showFacetCounts}
            initialLimit={6}
            moreLabel={(hiddenCount) => t('showMoreOptions', { count: hiddenCount })}
            lessLabel={t('showLessOptions')}
            testId="filter-country"
          />
        )}

        <FilterSection
          legend={t('priceFilter')}
          summary={priceSummary}
          defaultOpen={Boolean(priceSummary)}
          testId="filter-price"
        >
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
        </FilterSection>

        {categoryFilterUnavailable && brandFilterUnavailable && countryFilterUnavailable && (
          <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
            {t('filterUnavailable')}
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

  function buildListingUrl(
    nextSort: string,
    nextSearch: string,
    nextCountries?: string[],
  ) {
    const params = new URLSearchParams(searchParams.toString());
    const trimmedSearch = nextSearch.trim();
    const defaultSort = trimmedSearch ? 'relevance' : 'newest';

    if (nextSort !== defaultSort) {
      params.set('sort', nextSort);
    } else {
      params.delete('sort');
    }

    if (trimmedSearch) {
      params.set('search', trimmedSearch);
    } else {
      params.delete('search');
    }

    if (nextCountries) {
      setCountryQueryParams(params, nextCountries);
    }

    const nextParams = params.toString();
    return `${basePath}${nextParams ? `?${nextParams}` : ''}`;
  }

  // Keep `?country=` truthful after the user changes the country filter, so a
  // reload or a shared link reproduces what is on screen.
  function syncCountryQuery(nextCountries: string[]) {
    const currentParams = window.location.search.replace(/^\?/, '');
    const params = new URLSearchParams(currentParams);
    setCountryQueryParams(params, nextCountries);
    const nextParams = params.toString();
    const nextUrl = `${window.location.pathname}${nextParams ? `?${nextParams}` : ''}${window.location.hash}`;

    if (nextParams !== currentParams) {
      window.history.replaceState(null, '', nextUrl);
    }
  }

  function handleSortChange(newSort: string) {
    setSort(newSort);
    setDraftSort(newSort);
    setLoadedProducts([]);
    router.replace(buildListingUrl(newSort, search), { scroll: false });
  }

  function clearSearch() {
    setSearch('');
    setSort('newest');
    setDraftSort('newest');
    setLoadedProducts([]);
    router.replace(buildListingUrl('newest', ''), { scroll: false });
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
    const requestId = ++pageRequestIdRef.current;
    const requestListingQueryKey = listingQueryResetKey;
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

      if (
        result2.data?.products
        && latestListingQueryKeyRef.current === requestListingQueryKey
      ) {
        applyPageResult(result2.data.products, targetPage, afterCursorForPage);
      }
    } finally {
      if (pageRequestIdRef.current === requestId) {
        setLoadingPage(false);
      }
    }
  }

  async function handlePageMove(direction: 'next' | 'previous') {
    if (loadingPage) return;
    if (direction === 'next' && !endCursor) return;
    if (direction === 'previous' && !startCursor) return;

    const nextPage = direction === 'next'
      ? Math.min(totalPages, currentPage + 1)
      : Math.max(1, currentPage - 1);

    // Always page forward from an offset: the API answers `last`/`before`
    // with a shifted window (after a jump to page 10 of 219, "previous"
    // returned items 197–216 instead of 193–216).
    if (canJumpToAnyPage) {
      await fetchPageByCursor(nextPage, offsetAfterCursorForPage(nextPage, pageSize));
      return;
    }

    if (
      direction === 'previous'
      && Object.prototype.hasOwnProperty.call(pageAfterCursors, nextPage)
    ) {
      await fetchPageByCursor(nextPage, pageAfterCursors[nextPage] ?? null);
      return;
    }

    const requestId = ++pageRequestIdRef.current;
    const requestListingQueryKey = listingQueryResetKey;
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

      if (
        result2.data?.products
        && latestListingQueryKeyRef.current === requestListingQueryKey
      ) {
        applyPageResult(result2.data.products, nextPage, afterCursorForPage);
      }
    } finally {
      if (pageRequestIdRef.current === requestId) {
        setLoadingPage(false);
      }
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
    if (canJumpToAnyPage) {
      await fetchPageByCursor(targetPage, offsetAfterCursorForPage(targetPage, pageSize));
    }
  }

  function getPaginationItems(isCompact: boolean): PageItem[] {
    if (canJumpToAnyPage) {
      return buildPageItems(currentPage, totalPages, isCompact ? 0 : 1);
    }

    const cursorBackedPages = new Set<number>([
      currentPage,
      ...Object.keys(pageAfterCursors).map(Number),
      ...Object.keys(pageSnapshots).map(Number),
    ]);

    if (totalPages <= 5) {
      return Array.from(cursorBackedPages)
        .filter((page) => page >= 1 && page <= totalPages)
        .sort((left, right) => left - right);
    }

    const pages = new Set<number>([1, currentPage]);
    if (currentPage > 1) pages.add(currentPage - 1);
    if (currentPage < totalPages) pages.add(currentPage + 1);

    return Array.from(pages)
      .filter((page) => page >= 1 && page <= totalPages && cursorBackedPages.has(page))
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
    syncCountryQuery([]);
  }

  function clearAllDiscovery() {
    setCommittedFilters(DEFAULT_FILTERS);
    setDraftFilters(DEFAULT_FILTERS);
    setSearch('');
    setSort('newest');
    setDraftSort('newest');
    setLoadedProducts([]);
    router.replace(buildListingUrl('newest', '', []), { scroll: false });
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
    syncCountryQuery(normalizedDraftFilters.countryOfOrigin);
    setFiltersOpen(false);
  }

  function getActiveFilterChips() {
    const chips: ActiveFilterChip[] = [];

    if (normalizedSearch) {
      chips.push({
        key: 'search',
        label: t('searchFilter', { query: normalizedSearch }),
        onRemove: clearSearch,
      });
    }

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

    if (normalizedCommittedFilters.inStockOnly) {
      chips.push({
        key: 'in-stock',
        label: t('inStockOnly'),
        onRemove: () => setCommittedFilters((prev) => ({ ...prev, inStockOnly: false })),
      });
    }

    for (const brand of normalizedCommittedFilters.brands) {
      chips.push({
        key: `brand-${brand}`,
        label: brand,
        onRemove: () => setCommittedFilters((prev) => ({
          ...prev,
          brands: prev.brands.filter((brandValue) => brandValue !== brand),
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
      const nextCountries = normalizedCommittedFilters.countryOfOrigin.filter((countryValue) => countryValue !== origin);
      chips.push({
        key: `origin-${origin}`,
        label,
        onRemove: () => {
          setCommittedFilters((prev) => ({
            ...prev,
            countryOfOrigin: prev.countryOfOrigin.filter((countryValue) => countryValue !== origin),
          }));
          syncCountryQuery(nextCountries);
        },
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
          {t('showing', { count: displayedProducts.length, total: totalCount })}
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
            onClick={clearAllDiscovery}
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
    const hasSearch = Boolean(normalizedSearch);
    const hasDiscoveryFilters = hasActiveFilters || hasSearch;

    return (
      <div
        className={`${isCompact ? 'rounded-[1.75rem] px-5 py-10' : 'rounded-2xl px-6 py-14'} border text-center`}
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
      >
        <p className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
          {hasSearch
            ? t('searchEmptyTitle', { query: normalizedSearch })
            : hasActiveFilters ? t('emptyFilteredTitle') : t('emptyTitle')}
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          {hasSearch
            ? t('searchEmptyDescription')
            : hasActiveFilters ? t('emptyFilteredDescription') : t('emptyDescription')}
        </p>
        {hasDiscoveryFilters && (
          <button
            type="button"
            onClick={clearAllDiscovery}
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
    if (totalCount <= pageSize || displayedProducts.length === 0) {
      return null;
    }

    const canGoPrevious = hasPreviousPage && currentPage > 1;
    const canGoNext = hasMore;
    const paginationItems = getPaginationItems(isCompact);
    // Phone: arrow-only Previous/Next so five page slots fit one row without
    // scrolling; the words stay as the accessible names.
    const stepButtonClass = isCompact
      ? 'inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full border transition-colors duration-fast hover-surface disabled:cursor-not-allowed disabled:opacity-45'
      : 'inline-flex min-h-11 items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold transition-colors duration-fast hover-surface disabled:cursor-not-allowed disabled:opacity-45';

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
            className={stepButtonClass}
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
            aria-label={isCompact ? t('previousPage') : undefined}
          >
            {isCompact ? <ChevronLeft className="h-5 w-5" aria-hidden="true" /> : t('previousPage')}
          </button>
          <div className="flex min-w-0 flex-1 items-center justify-center gap-1 sm:flex-none" aria-label={t('pageStatus', { current: currentPage, total: totalPages })}>
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
                || canJumpToAnyPage
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
            className={stepButtonClass}
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
            aria-label={isCompact ? t('nextPage') : undefined}
          >
            {isCompact
              ? <ChevronRight className="h-5 w-5" aria-hidden="true" />
              : loadingPage ? tCommon('loading') : t('nextPage')}
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

    if (displayedProducts.length > 0) {
      return (
        <>
          <div data-testid="mobile-products-grid" className="grid grid-cols-2 gap-3">
            {displayedProducts.map((product, index) => (
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
    const gridClassName = 'product-grid product-grid-fluid';

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

    if (displayedProducts.length > 0) {
      return (
        <>
          <div className={gridClassName}>
            {displayedProducts.map((product, index) => (
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
            {categoryNavigation.map((item) => {
              const isActive = currentCategorySlug === item.slug;

              return (
                <div key={item.id}>
                  <Link
                    href={`/categories/${item.slug}`}
                    className="flex min-h-[2.75rem] items-center justify-between gap-3 rounded-[0.9rem] px-3 py-2 text-sm font-semibold transition-colors duration-fast hover-surface"
                    style={{
                      backgroundColor: isActive ? 'var(--color-accent)' : 'transparent',
                      color: isActive ? 'var(--color-primary)' : 'var(--color-foreground)',
                    }}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="min-w-0 leading-snug">{item.name}</span>
                    {typeof item.count === 'number' && (
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums"
                        style={{
                          backgroundColor: isActive
                            ? 'color-mix(in srgb, var(--color-primary) 13%, white)'
                            : 'color-mix(in srgb, var(--color-foreground) 6%, transparent)',
                          color: isActive ? 'var(--color-primary)' : 'var(--color-muted-foreground)',
                        }}
                      >
                        {item.count}
                      </span>
                    )}
                  </Link>
                  {item.expanded && item.children && item.children.length > 0 && (
                    <ul
                      className="ml-3 mt-1 space-y-1 border-l pl-2"
                      style={{ borderColor: 'var(--color-border)' }}
                      data-testid="category-tree-leaves"
                    >
                      {item.children.map((leaf) => {
                        const isLeafActive = currentCategorySlug === leaf.slug;

                        return (
                          <li key={leaf.id}>
                            <Link
                              href={`/categories/${leaf.slug}`}
                              className="flex min-h-[2.4rem] items-center justify-between gap-2 rounded-[0.8rem] px-2.5 py-1.5 text-sm transition-colors duration-fast hover-surface"
                              style={{
                                backgroundColor: isLeafActive ? 'var(--color-accent)' : 'transparent',
                                color: isLeafActive ? 'var(--color-primary)' : 'var(--color-foreground)',
                              }}
                              aria-current={isLeafActive ? 'page' : undefined}
                            >
                              <span className="min-w-0 line-clamp-1">{leaf.name}</span>
                              {typeof leaf.count === 'number' && (
                                <span
                                  className="shrink-0 text-[11px] tabular-nums"
                                  style={{ color: 'var(--color-muted-foreground)' }}
                                >
                                  {leaf.count}
                                </span>
                              )}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
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
            {renderFilterContent(committedFilters, normalizedCommittedFilters, setCommittedFilters, clearCommittedFilters, true)}
          </div>
        </section>
      </aside>
    );
  }

  // One horizontal chip row: inside a group it is the group itself plus its
  // subcategories (the other nine groups live on /categories); on /products it
  // is the group list.
  function renderCategoryRail(testId: string, className: string, clampRows = false) {
    if (!hasCategoryNavigation) return null;
    const expandedGroup = categoryNavigation.find((item) => item.expanded && item.children && item.children.length > 0);
    const railItems = expandedGroup ? [expandedGroup, ...(expandedGroup.children ?? [])] : categoryNavigation;

    // Inside a group the subcategory chips wrap (on phones two rows, then
    // "Show all") and the group chip reads "All"; the top-level list of
    // groups keeps the single scrolling row.
    const chips = railItems.map((category) => {
      const isActive = currentCategorySlug === category.slug;
      const isGroupChip = category === expandedGroup;

      return (
        <Link
          key={category.id}
          href={`/categories/${category.slug}`}
          className={`inline-flex shrink-0 items-center rounded-full border font-semibold shadow-[0_12px_24px_-24px_rgba(66,109,72,0.35)] transition-colors duration-fast ${expandedGroup
            ? 'min-h-9 gap-1.5 px-3 py-1.5 text-[13px]'
            : 'min-h-[2.45rem] gap-2 px-3.5 py-2 text-sm'}`}
          style={{
            borderColor: isActive ? 'var(--color-primary)' : 'var(--color-border)',
            backgroundColor: isActive ? 'var(--color-accent)' : 'var(--color-card)',
            color: isActive ? 'var(--color-primary)' : 'var(--color-foreground)',
          }}
          aria-current={isActive ? 'page' : undefined}
        >
          <span>{isGroupChip ? t('allInCategory') : category.name}</span>
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
    });

    return (
      <nav className={`overflow-hidden ${className}`} data-testid={testId} aria-label={t('categoryFilter')}>
        {expandedGroup && clampRows ? (
          <ClampedChipRows
            itemCount={railItems.length}
            activeIndex={railItems.findIndex((category) => category.slug === currentCategorySlug)}
          >
            {chips}
          </ClampedChipRows>
        ) : expandedGroup ? (
          <div className="flex flex-wrap gap-1.5 px-4 pb-1">{chips}</div>
        ) : (
          <div className="flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {chips}
          </div>
        )}
      </nav>
    );
  }

  function renderMobileShell() {
    return (
      <div data-testid="mobile-products-shell" className="space-y-4">
        <header className="space-y-4">
          {showTitle && (
            <h1
              className="max-w-[18rem] text-[1.95rem] font-semibold leading-[0.98] tracking-[-0.045em]"
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
              <input type="hidden" value={sortOption.value} data-testid="mobile-products-sort-select" readOnly />
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

          {renderCategoryRail('mobile-category-rail', '-mx-4', true)}

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
                    {t((sortOptions.find((option) => option.value === draftSort) || sortOptions[0]).label as any)}
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
                {sortOptions.map((option) => {
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
            <SortDropdown
              value={sortOption.value}
              onChange={handleSortChange}
              showRelevance={Boolean(normalizedSearch)}
            />
            {/* The sidebar only shows from lg; tablets keep the filter button. */}
            <button
              type="button"
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors duration-fast hover-surface ${hasDesktopSidebar ? 'lg:hidden' : ''}`}
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
          </div>
        </div>

        {hasDesktopSidebar && renderCategoryRail('tablet-category-rail', '-mx-4 mb-5 lg:hidden')}

        {filtersOpen && (
          <div
            id="filter-panel"
            className={`mb-6 space-y-5 rounded-xl border p-5 animate-fade-up ${hasDesktopSidebar ? 'lg:hidden' : ''}`}
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
            role="region"
            aria-label="Product filters"
          >
            {renderFilterContent(committedFilters, normalizedCommittedFilters, setCommittedFilters, clearCommittedFilters, true)}
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
