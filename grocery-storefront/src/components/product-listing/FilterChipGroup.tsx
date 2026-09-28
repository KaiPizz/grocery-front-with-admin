'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export interface FilterChipOption {
  value: string;
  label: string;
  count?: number;
}

interface FilterSectionProps {
  legend: string;
  /** Short text shown next to the legend while the section is closed. */
  summary?: string;
  /** Sections holding an active choice start open so the choice stays visible. */
  defaultOpen: boolean;
  testId: string;
  children: ReactNode;
}

// A filter group that starts closed: a category page opens on its products,
// not on 30 brand chips and 17 country chips (Japan Centre / Ocado pattern).
export function FilterSection({ legend, summary, defaultOpen, testId, children }: FilterSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <fieldset className="border-t pt-3" style={{ borderColor: 'var(--color-border)' }} data-testid={testId}>
      <legend className="float-left w-full">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex min-h-[2.5rem] w-full items-center justify-between gap-3 text-left text-sm font-medium"
          style={{ color: 'var(--color-foreground)' }}
          aria-expanded={open}
          data-testid={`${testId}-heading`}
        >
          <span>{legend}</span>
          <span className="flex min-w-0 items-center gap-2">
            {!open && summary && (
              <span className="truncate text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>
                {summary}
              </span>
            )}
            <ChevronDown
              className={`h-4 w-4 shrink-0 transition-transform duration-fast ${open ? 'rotate-180' : ''}`}
              style={{ color: 'var(--color-muted-foreground)' }}
              aria-hidden="true"
            />
          </span>
        </button>
      </legend>
      {open && <div className="clear-both space-y-3 pt-2">{children}</div>}
    </fieldset>
  );
}

interface FilterChipGroupProps {
  legend: string;
  options: FilterChipOption[];
  selected: string[];
  onToggle: (value: string) => void;
  showCounts: boolean;
  /** Chips shown before the "show more" toggle; selected values are always shown. */
  initialLimit: number;
  moreLabel: (hiddenCount: number) => string;
  lessLabel: string;
  testId: string;
  /** Adds a name search above the chips when the list is longer than initialLimit. */
  searchLabel?: string;
  noMatchesLabel?: string;
}

function foldForSearch(value: string) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase();
}

// One chip group for the brand and country filters: a bounded first view
// (the catalog has 378 brands and 18 countries) with a "show more" toggle,
// so the sidebar stays short while every option remains reachable.
export function FilterChipGroup({
  legend,
  options,
  selected,
  onToggle,
  showCounts,
  initialLimit,
  moreLabel,
  lessLabel,
  testId,
  searchLabel,
  noMatchesLabel,
}: FilterChipGroupProps) {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const foldedQuery = foldForSearch(query.trim());
  const searchable = Boolean(searchLabel) && options.length > initialLimit;
  const visibleOptions = foldedQuery
    ? options.filter((option) => foldForSearch(option.label).includes(foldedQuery))
    : expanded
      ? options
      : options.filter((option, index) => index < initialLimit || selected.includes(option.value));
  const hiddenCount = options.length - visibleOptions.length;
  const canToggle = !foldedQuery && (expanded || hiddenCount > 0);
  const selectedLabels = options.filter((option) => selected.includes(option.value)).map((option) => option.label);

  return (
    <FilterSection
      legend={legend}
      summary={selectedLabels.join(', ')}
      defaultOpen={selected.length > 0}
      testId={testId}
    >
      {searchable && (
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label={searchLabel}
          placeholder={searchLabel}
          className="w-full rounded-full border bg-[var(--color-card)] px-4 py-2 text-base focus:outline-none focus-visible:ring-2 md:text-sm"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
          data-testid={`${testId}-search`}
        />
      )}
      <div className="flex flex-wrap gap-2" role="group" aria-label={legend}>
        {visibleOptions.map((option) => {
          const isSelected = selected.includes(option.value);

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onToggle(option.value)}
              className="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-fast"
              style={{
                borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-border)',
                backgroundColor: isSelected ? 'var(--color-accent)' : 'transparent',
                color: isSelected ? 'var(--color-primary)' : 'var(--color-muted-foreground)',
              }}
              aria-pressed={isSelected}
            >
              {option.label}
              {showCounts && typeof option.count === 'number' && (
                <span className="ml-1 tabular-nums" aria-hidden="true">
                  {option.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {foldedQuery && visibleOptions.length === 0 && noMatchesLabel && (
        <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
          {noMatchesLabel}
        </p>
      )}
      {canToggle && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="text-xs font-semibold transition-opacity duration-fast hover:opacity-80"
          style={{ color: 'var(--color-primary)' }}
          aria-expanded={expanded}
          data-testid={`${testId}-toggle`}
        >
          {expanded ? lessLabel : moreLabel(hiddenCount)}
        </button>
      )}
    </FilterSection>
  );
}
