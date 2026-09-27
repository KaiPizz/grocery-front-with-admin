'use client';

import { useEffect, useId, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';

import { Link, usePathname } from '@/i18n/navigation';
import { parseCountryQueryParams } from '@/components/product-listing/listing-filters';
import { CUISINE_LINKS, buildCuisineHref } from '@/lib/cuisines';

const CLOSE_DELAY_MS = 120;

// Desktop "Kuchnie" menu: a hover/click dropdown of country-of-origin links
// into the listing. Sibling of the category mega menu in the main navigation.
export function CuisineMenu() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeCountries = pathname === '/products' ? parseCountryQueryParams(searchParams) : [];
  const isCurrentCuisine = (country: string) => activeCountries.includes(country);
  const anyCuisineActive = CUISINE_LINKS.some((link) => isCurrentCuisine(link.country));

  function cancelScheduledClose() {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }

  function openMenu() {
    cancelScheduledClose();
    setOpen(true);
  }

  function closeMenu() {
    cancelScheduledClose();
    setOpen(false);
  }

  function scheduleClose() {
    cancelScheduledClose();
    closeTimeoutRef.current = setTimeout(() => {
      setOpen(false);
      closeTimeoutRef.current = null;
    }, CLOSE_DELAY_MS);
  }

  useEffect(() => () => cancelScheduledClose(), []);

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    const nextTarget = event.relatedTarget;

    if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
      closeMenu();
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      closeMenu();
      triggerRef.current?.focus();
    }
  }

  return (
    <div
      className="relative"
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    >
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-medium hover-surface"
        style={{ color: anyCuisineActive ? 'var(--color-primary)' : 'var(--color-foreground)' }}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        data-testid="cuisine-menu-trigger"
        onClick={() => (open ? closeMenu() : openMenu())}
      >
        {t('cuisines')}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-fast ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <nav
          id={panelId}
          aria-label={t('cuisinesMenuLabel')}
          data-testid="cuisine-menu"
          className="absolute left-0 top-full z-[60] mt-1 min-w-[13rem] rounded-lg border p-1.5 shadow-2xl"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'color-mix(in srgb, var(--color-card) 98%, white)',
          }}
        >
          <ul className="space-y-0.5">
            {CUISINE_LINKS.map(({ key, country }) => {
              const isActive = isCurrentCuisine(country);

              return (
                <li key={key}>
                  <Link
                    href={buildCuisineHref(country)}
                    className="block rounded-lg px-3 py-2 text-sm font-medium hover-surface"
                    style={{ color: isActive ? 'var(--color-primary)' : 'var(--color-foreground)' }}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={closeMenu}
                  >
                    {t(`cuisine.${key}`)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}
