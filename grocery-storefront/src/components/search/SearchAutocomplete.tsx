'use client';

import { useDeferredValue, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useQuery } from 'urql';
import { ArrowRight, Clock3, CornerUpLeft, Search, X } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { useChannel } from '@/hooks/use-channel';
import { SEARCH_PRODUCTS_QUERY } from '@/lib/graphql/operations/grocery';
import { buildSearchSuggestions, normalizeSearchTerm, rankProductsForSearch, type SearchableProduct } from '@/lib/search';
import { cn, formatPrice, getImageSrc, isImageProxySrc } from '@/lib/utils';
import { useSearchStore } from '@/stores/search-store';

const SEARCH_INDEX_LIMIT = 180;

interface SearchAutocompleteProps {
  inputId: string;
  value: string;
  placeholder: string;
  onValueChange: (value: string) => void;
  onSearch: (query: string) => void;
  autoFocus?: boolean;
  className?: string;
  inputClassName?: string;
  onDismiss?: () => void;
}

export function SearchAutocomplete({
  inputId,
  value,
  placeholder,
  onValueChange,
  onSearch,
  autoFocus = false,
  className,
  inputClassName,
  onDismiss,
}: SearchAutocompleteProps) {
  const tSearch = useTranslations('search');
  const tCommon = useTranslations('common');
  const channel = useChannel();
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [hasActivated, setHasActivated] = useState(false);
  const recentSearches = useSearchStore((state) => state.recentSearches);
  const addRecentSearch = useSearchStore((state) => state.addRecentSearch);
  const clearRecentSearches = useSearchStore((state) => state.clearRecentSearches);
  const deferredValue = useDeferredValue(value);
  const normalizedQuery = normalizeSearchTerm(deferredValue);
  const shouldLoadIndex = hasActivated || value.trim().length > 0;

  const [result] = useQuery({
    query: SEARCH_PRODUCTS_QUERY,
    variables: { channel, first: SEARCH_INDEX_LIMIT },
    pause: !shouldLoadIndex,
  });

  const products = useMemo<SearchableProduct[]>(
    () => result.data?.products?.edges?.map((edge: any) => edge.node) || [],
    [result.data]
  );

  const suggestions = useMemo(() => {
    if (!normalizedQuery) {
      return recentSearches.slice(0, 4);
    }

    if (normalizedQuery.length < 2) {
      return recentSearches.filter((entry) => normalizeSearchTerm(entry).includes(normalizedQuery)).slice(0, 4);
    }

    return buildSearchSuggestions(products, value, recentSearches, 4);
  }, [normalizedQuery, products, recentSearches, value]);

  const productMatches = useMemo(
    () => (normalizedQuery.length >= 2 ? rankProductsForSearch(products, value).slice(0, 4) : []),
    [normalizedQuery, products, value]
  );

  const hasDropdownContent =
    (normalizedQuery.length === 0 && recentSearches.length > 0) ||
    suggestions.length > 0 ||
    productMatches.length > 0 ||
    result.fetching;

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isOpen]);

  function commitSearch(nextQuery: string) {
    const trimmed = nextQuery.trim();
    if (!trimmed) return;

    addRecentSearch(trimmed);
    onValueChange(trimmed);
    onSearch(trimmed);
    setIsOpen(false);
    onDismiss?.();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    commitSearch(value);
  }

  function handleFocus() {
    setHasActivated(true);
    setIsOpen(true);
  }

  function handleClear() {
    onValueChange('');
    setIsOpen(true);
  }

  function handleProductSelect(product: SearchableProduct) {
    if (value.trim()) {
      addRecentSearch(value.trim());
    }

    router.push(`/products/${product.slug}`);
    setIsOpen(false);
    onDismiss?.();
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <form onSubmit={handleSubmit}>
        <label htmlFor={inputId} className="sr-only">
          {placeholder}
        </label>

        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ color: 'var(--color-muted-foreground)' }}
          aria-hidden="true"
        />

        <input
          id={inputId}
          type="search"
          value={value}
          autoFocus={autoFocus}
          placeholder={placeholder}
          onFocus={handleFocus}
          onChange={(event) => {
            setHasActivated(true);
            setIsOpen(true);
            onValueChange(event.target.value);
          }}
          className={cn(
            'w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm bg-transparent transition-colors duration-fast focus:outline-none focus-visible:ring-2',
            inputClassName
          )}
          style={{
            borderColor: 'var(--color-border)',
            color: 'var(--color-foreground)',
            ['--tw-ring-color' as string]: 'var(--color-ring)',
          }}
          role="combobox"
          aria-expanded={isOpen && hasDropdownContent}
          aria-controls={`${inputId}-results`}
          aria-autocomplete="list"
        />

        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center transition-colors duration-fast hover-surface"
            aria-label={tCommon('close')}
          >
            <X className="w-4 h-4" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
          </button>
        )}
      </form>

      {isOpen && hasDropdownContent && (
        <div
          id={`${inputId}-results`}
          className="absolute top-full left-0 right-0 mt-2 rounded-2xl border shadow-xl overflow-hidden animate-fade-up"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-card)',
            boxShadow: '0 28px 60px -24px color-mix(in srgb, var(--color-foreground) 24%, transparent)',
          }}
        >
          <div className="max-h-[28rem] overflow-y-auto">
            <div className="px-4 pt-4">
              <div className="flex items-center justify-between gap-3 pb-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <span
                  className="text-[11px] font-semibold uppercase tracking-[0.18em]"
                  style={{ color: 'var(--color-muted-foreground)' }}
                >
                  {normalizedQuery ? tSearch('suggestions') : tSearch('recentSearches')}
                </span>

                {!normalizedQuery && recentSearches.length > 0 && (
                  <button
                    type="button"
                    onClick={() => clearRecentSearches()}
                    className="text-[11px] font-medium transition-opacity duration-fast hover:opacity-80"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    {tSearch('clearRecent')}
                  </button>
                )}
              </div>
            </div>

            {suggestions.length > 0 && (
              <div className="px-2 py-2">
                {suggestions.map((suggestion) => {
                  const isRecent = recentSearches.some(
                    (entry) => normalizeSearchTerm(entry) === normalizeSearchTerm(suggestion)
                  );

                  return (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => commitSearch(suggestion)}
                      className="w-full flex items-center justify-between gap-3 px-2.5 py-2.5 rounded-xl text-left transition-colors duration-fast hover-surface"
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        {isRecent ? (
                          <Clock3 className="w-4 h-4 shrink-0" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
                        ) : (
                          <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
                        )}
                        <span className="truncate text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
                          {suggestion}
                        </span>
                      </span>
                      <CornerUpLeft className="w-4 h-4 shrink-0" style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            )}

            {normalizedQuery.length >= 2 && (
              <div className="px-4 pt-2 pb-4">
                <div className="pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <p
                    className="text-[11px] font-semibold uppercase tracking-[0.18em] mb-3"
                    style={{ color: 'var(--color-muted-foreground)' }}
                  >
                    {tSearch('resultsFor', { query: value.trim() })}
                  </p>

                  {result.fetching && products.length === 0 ? (
                    <p className="text-sm py-3" style={{ color: 'var(--color-muted-foreground)' }}>
                      {tCommon('loading')}
                    </p>
                  ) : productMatches.length > 0 ? (
                    <div className="space-y-2">
                      {productMatches.map((product) => {
                        const imageUrl = getImageSrc(product.thumbnail?.url);
                        const amount = product.pricing?.priceRange?.start?.gross?.amount ?? 0;
                        const currency = product.pricing?.priceRange?.start?.gross?.currency ?? 'PLN';

                        return (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => handleProductSelect(product)}
                            className="w-full flex items-center gap-3 p-2 rounded-xl text-left transition-colors duration-fast hover-surface"
                          >
                            <div
                              className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0"
                              style={{ backgroundColor: 'var(--color-muted)' }}
                            >
                              {imageUrl ? (
                                <Image
                                  src={imageUrl}
                                  alt=""
                                  fill
                                  className="object-cover"
                                  sizes="56px"
                                  unoptimized={isImageProxySrc(imageUrl)}
                                />
                              ) : null}
                            </div>

                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold truncate" style={{ color: 'var(--color-foreground)' }}>
                                {product.name}
                              </span>
                              {product.category?.name && (
                                <span className="block text-xs truncate" style={{ color: 'var(--color-muted-foreground)' }}>
                                  {product.category.name}
                                </span>
                              )}
                              <span className="block text-sm font-semibold tabular-nums mt-1" style={{ color: 'var(--color-primary)' }}>
                                {formatPrice(amount, currency)}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm py-3" style={{ color: 'var(--color-muted-foreground)' }}>
                      {tSearch('noMatches')}
                    </p>
                  )}
                </div>
              </div>
            )}

            {value.trim() && (
              <button
                type="button"
                onClick={() => commitSearch(value)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 border-t text-sm font-semibold transition-colors duration-fast hover-surface"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
              >
                <span>{tSearch('seeResults', { query: value.trim() })}</span>
                <ArrowRight className="w-4 h-4" style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
