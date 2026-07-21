'use client';

import { useId } from 'react';
import { useTranslations } from 'next-intl';

export interface SortOption {
  value: string;
  label: string;
  field: string;
  direction: string;
}

export const SORT_OPTIONS: SortOption[] = [
  { value: 'newest', label: 'sortNewest', field: 'DATE', direction: 'DESC' },
  { value: 'price_asc', label: 'sortPrice', field: 'PRICE', direction: 'ASC' },
  { value: 'price_desc', label: 'sortPriceDesc', field: 'PRICE', direction: 'DESC' },
  { value: 'name_asc', label: 'sortName', field: 'NAME', direction: 'ASC' },
];

export const RELEVANCE_SORT_OPTION: SortOption = {
  value: 'relevance',
  label: 'sortRelevance',
  field: 'RELEVANCE',
  direction: 'DESC',
};

export function getSortOptions(includeRelevance = false) {
  return includeRelevance
    ? [RELEVANCE_SORT_OPTION, ...SORT_OPTIONS]
    : SORT_OPTIONS;
}

interface SortDropdownProps {
  value: string;
  onChange: (value: string) => void;
  showRelevance?: boolean;
}

export function SortDropdown({ value, onChange, showRelevance = false }: SortDropdownProps) {
  const t = useTranslations('products');
  const selectId = useId();
  const sortOptions = getSortOptions(showRelevance);

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={selectId} className="text-xs font-medium whitespace-nowrap" style={{ color: 'var(--color-foreground)' }}>
        {t('sortBy')}
      </label>
      <select
        id={selectId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border px-3 py-2.5 text-sm bg-transparent transition-colors duration-fast focus:outline-none focus-visible:ring-2 cursor-pointer"
        style={{
          borderColor: 'var(--color-border)',
          color: 'var(--color-foreground)',
          backgroundColor: 'var(--color-card)',
        }}
      >
        {sortOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {t(opt.label as any)}
          </option>
        ))}
      </select>
    </div>
  );
}
