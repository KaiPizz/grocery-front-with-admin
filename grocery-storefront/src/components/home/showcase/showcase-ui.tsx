import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';

/** Logo red, used sparingly: eyebrows, badges, the step numbers. */
export const SHOWCASE_ACCENT = '#D3121C';
/** Warm band behind every other section. */
export const SHOWCASE_CREAM = '#FBF6EE';

/** English value when the page is English and one is configured, else Polish. */
export function showcaseText(polish: string, english: string | undefined, isEnglish: boolean): string {
  return isEnglish && english?.trim() ? english : polish;
}

export function SectionHeading({
  eyebrow,
  title,
  link,
  id,
}: {
  eyebrow: string;
  title: string;
  link?: { href: string; label: string } | null;
  id?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4 md:mb-6">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: SHOWCASE_ACCENT }}>
          {eyebrow}
        </p>
        <h2 id={id} className="mt-1 font-display text-[1.45rem] font-bold leading-tight md:text-[1.9rem]" style={{ color: 'var(--color-foreground)' }}>
          {title}
        </h2>
      </div>
      {link ? (
        <Link
          href={link.href}
          className="inline-flex min-h-10 shrink-0 items-center gap-1 whitespace-nowrap text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ color: 'var(--color-primary)' }}
        >
          {link.label}
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}

export function ShowcaseSection({
  children,
  cream = false,
  testId,
  labelledBy,
}: {
  children: ReactNode;
  cream?: boolean;
  testId: string;
  labelledBy?: string;
}) {
  return (
    <section
      className="py-7 md:py-12"
      style={cream ? { backgroundColor: SHOWCASE_CREAM } : undefined}
      data-testid={testId}
      aria-labelledby={labelledBy}
    >
      <div className="container-grocery">{children}</div>
    </section>
  );
}

/** Horizontal scroll row on phones, a plain grid from `md` up. */
export const SCROLL_ROW =
  'flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:px-0 md:pb-0 md:overflow-visible';
