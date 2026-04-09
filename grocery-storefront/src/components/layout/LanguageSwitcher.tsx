'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Globe } from 'lucide-react';
import { locales } from '@/i18n/config';
import { usePathname, useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

const LOCALE_LABELS: Record<string, string> = {
  pl: 'PL',
  en: 'EN',
};

const LOCALE_NAMES: Record<string, string> = {
  pl: 'Polski',
  en: 'English',
};

interface LanguageSwitcherProps {
  className?: string;
  showLabel?: boolean;
  buttonTestId?: string;
}

export function LanguageSwitcher({ className, showLabel = false, buttonTestId }: LanguageSwitcherProps) {
  const locale = useLocale();
  const tCommon = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function switchLocale(newLocale: string) {
    const queryString = searchParams.toString();
    const href = queryString ? `${pathname}?${queryString}` : pathname;
    router.replace(href, { locale: newLocale });
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors duration-150 hover-surface',
          className
        )}
        style={{ color: 'var(--color-foreground)' }}
        aria-label={tCommon('changeLanguage')}
        aria-expanded={open}
        aria-haspopup="listbox"
        data-testid={buttonTestId}
      >
        <Globe className="w-4 h-4" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
        <span className={showLabel ? '' : 'hidden sm:inline'}>{LOCALE_LABELS[locale] || locale.toUpperCase()}</span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 min-w-[140px] rounded-xl border shadow-lg overflow-hidden animate-fade-up z-50"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-card)',
          }}
          role="listbox"
          aria-label={tCommon('selectLanguage')}
        >
          {locales.map((loc) => (
            <button
              key={loc}
              type="button"
              role="option"
              aria-selected={loc === locale}
              onClick={() => switchLocale(loc)}
              className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm transition-colors duration-150 hover-surface"
              style={{
                color: loc === locale ? 'var(--color-primary)' : 'var(--color-foreground)',
                fontWeight: loc === locale ? 600 : 400,
                backgroundColor: loc === locale ? 'var(--color-accent)' : 'transparent',
              }}
            >
              <span className="w-6 text-xs font-semibold tabular-nums" style={{ color: 'var(--color-muted-foreground)' }}>
                {LOCALE_LABELS[loc]}
              </span>
              <span>{LOCALE_NAMES[loc]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
