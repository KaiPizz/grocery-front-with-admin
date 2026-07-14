'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { en } from './translations/en';
import { vi } from './translations/vi';
import { pl } from './translations/pl';
import type { Translations } from './translations/en';

export type Language = 'en' | 'vi' | 'pl';

const STORAGE_KEY = 'admin-lang';

const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'pl', label: 'Polski', flag: '🇵🇱' },
];

const TRANSLATIONS: Record<Language, Translations> = { en, vi, pl };

export function isSupportedLanguage(value: unknown): value is Language {
  return typeof value === 'string' && LANGUAGES.some(({ code }) => code === value);
}

function getPath(obj: unknown, path: string): string {
  const keys = path.split('.');
  let current = obj;
  for (const key of keys) {
    if (current === null || typeof current !== 'object') return path;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === 'string' ? current : path;
}

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  tf: (key: string, ...args: unknown[]) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  setLanguage: () => {},
  t: (key) => key,
  tf: (key, ..._args) => key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    let saved: Language | null = null;

    try {
      saved = localStorage.getItem(STORAGE_KEY) as Language | null;
    } catch {
      // Storage may be disabled; the language switcher still works in memory.
    }

    if (isSupportedLanguage(saved)) {
      setLanguageState(saved);
      return;
    }

    const browserLanguage = navigator.language.toLowerCase().split('-')[0];
    if (isSupportedLanguage(browserLanguage)) {
      setLanguageState(browserLanguage);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = TRANSLATIONS[language].login.title;
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Keep the selected language for this session if storage is unavailable.
    }
  }, []);

  const t = useCallback(
    (key: string) => getPath(TRANSLATIONS[language], key),
    [language]
  );

  const tf = useCallback(
    (key: string, ...args: unknown[]) => {
      const fn = getPath(TRANSLATIONS[language], key);
      if (typeof fn === 'function') return (fn as (...a: unknown[]) => string)(...args);
      return String(fn);
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, tf }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LangSwitcher() {
  const { language, setLanguage, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = useId();
  const current = LANGUAGES.find((l) => l.code === language)!;

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }

      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      const options = optionRefs.current.filter(
        (option): option is HTMLButtonElement => Boolean(option)
      );
      if (options.length === 0) return;

      event.preventDefault();
      const currentIndex = options.indexOf(document.activeElement as HTMLButtonElement);
      let nextIndex = currentIndex;
      if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = options.length - 1;
      else if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % options.length;
      else nextIndex = (currentIndex <= 0 ? options.length : currentIndex) - 1;
      options[nextIndex]?.focus();
    }

    const selectedIndex = LANGUAGES.findIndex(({ code }) => code === language);
    const focusTimer = window.setTimeout(() => {
      optionRefs.current[selectedIndex]?.focus();
    }, 0);

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [language, open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
          }
        }}
        aria-label={`${t('common.language')}: ${current.label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className="flex min-h-11 items-center gap-2 rounded-full border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-emerald-700 hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
      >
        <span aria-hidden="true">{current.flag}</span>
        <span>{current.code.toUpperCase()}</span>
        <svg
          aria-hidden="true"
          className={`h-3.5 w-3.5 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={t('common.selectLanguage')}
          className="absolute right-0 top-full z-50 mt-2 min-w-[172px] overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-950/10"
        >
          {LANGUAGES.map((lang, index) => (
            <button
              key={lang.code}
              ref={(element) => {
                optionRefs.current[index] = element;
              }}
              type="button"
              role="menuitemradio"
              aria-checked={language === lang.code}
              onClick={() => {
                setLanguage(lang.code);
                setOpen(false);
                triggerRef.current?.focus();
              }}
              className={`flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-700
                ${language === lang.code
                  ? 'bg-emerald-50 font-semibold text-emerald-900'
                  : 'text-slate-700 hover:bg-slate-50'}`}
            >
              <span aria-hidden="true" className="text-base">{lang.flag}</span>
              <span>{lang.label}</span>
              {language === lang.code && (
                <svg
                  aria-hidden="true"
                  className="ml-auto h-4 w-4 text-emerald-700"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
