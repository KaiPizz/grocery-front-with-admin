'use client';

import { useState } from 'react';

export interface FilterChipOption {
  value: string;
  label: string;
  count?: number;
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
}: FilterChipGroupProps) {
  const [expanded, setExpanded] = useState(false);
  const visibleOptions = expanded
    ? options
    : options.filter((option, index) => index < initialLimit || selected.includes(option.value));
  const hiddenCount = options.length - visibleOptions.length;
  const canToggle = expanded || hiddenCount > 0;

  return (
    <fieldset className="space-y-3" data-testid={testId}>
      <legend className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
        {legend}
      </legend>
      <div className="flex flex-wrap gap-2" role="group">
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
    </fieldset>
  );
}
