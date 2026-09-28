'use client';

/* eslint-disable @next/next/no-img-element -- configured category/cuisine art lives under /brand. */

import { CheckCircle2, Clock, CreditCard, MapPin, Navigation, Package, ShoppingBasket, Star, Store } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { SocialBar } from '@/components/layout/SocialBar';
import { Link } from '@/i18n/navigation';
import { buildCuisineHref, CUISINE_LINKS } from '@/lib/cuisines';
import { todayOpeningHours } from '@/lib/home-showcase';
import type {
  CommercialTrustRowItem,
  HomepageSeoTextConfig,
  OpeningHoursEntry,
  ShowcaseCuisine,
  ShowcaseStoreConfig,
  SocialLink,
  TrustRowIcon,
} from '@/types/storefront-config';
import { SCROLL_ROW, SHOWCASE_ACCENT, SHOWCASE_CREAM, SectionHeading, ShowcaseSection, showcaseText } from './showcase-ui';

const USP_ICONS: Record<TrustRowIcon, LucideIcon> = {
  'map-pin': MapPin,
  'check-circle': CheckCircle2,
  'credit-card': CreditCard,
  package: Package,
};

/** One compact row of promises: equal height, one title line + one note line each. */
export function UspStrip({ items, english }: { items: CommercialTrustRowItem[]; english: boolean }) {
  const enabled = items.filter((item) => item.enabled).sort((a, b) => a.order - b.order);
  if (enabled.length === 0) return null;
  return (
    <div className="container-grocery pt-4 md:pt-5" data-testid="showcase-usp">
      <ul className={`${SCROLL_ROW} md:grid md:grid-cols-4 md:gap-4`}>
        {enabled.map((item) => {
          const Icon = USP_ICONS[item.icon] ?? CheckCircle2;
          const note = showcaseText(item.description, item.descriptionEn, english);
          return (
            <li
              key={item.id}
              className="flex h-[60px] min-w-[216px] shrink-0 snap-start items-center gap-3 rounded-2xl border px-3.5 md:min-w-0"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
              data-testid="showcase-usp-item"
            >
              <Icon className="h-5 w-5 shrink-0" style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold leading-5" style={{ color: 'var(--color-foreground)' }}>
                  {showcaseText(item.title, item.titleEn, english)}
                </span>
                {note ? (
                  <span className="block truncate text-xs leading-4" style={{ color: 'var(--color-muted-foreground)' }}>{note}</span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export interface ShowcaseCategoryTile {
  slug: string;
  name: string;
  imageUrl: string | null;
}

export function CategoryRow({ tiles }: { tiles: ShowcaseCategoryTile[] }) {
  const t = useTranslations('home.showcase');
  if (tiles.length === 0) return null;
  return (
    <ShowcaseSection testId="showcase-categories" labelledBy="showcase-categories-title">
      <SectionHeading
        id="showcase-categories-title"
        eyebrow={t('categoriesEyebrow')}
        title={t('categoriesTitle')}
        link={{ href: '/categories', label: t('seeAll') }}
      />
      <ul className={`${SCROLL_ROW} md:grid md:grid-cols-5 md:gap-4`}>
        {tiles.map((tile) => (
          <li key={tile.slug} className="w-[30%] min-w-[104px] shrink-0 snap-start md:w-auto md:min-w-0" data-testid="showcase-category-tile">
            <Link href={`/categories/${tile.slug}`} className="group block">
              <span className="block aspect-square overflow-hidden rounded-2xl" style={{ backgroundColor: SHOWCASE_CREAM }}>
                {tile.imageUrl ? (
                  <img src={tile.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
                ) : null}
              </span>
              <span className="mt-2 block text-center text-[13px] font-semibold leading-tight md:text-sm" style={{ color: 'var(--color-foreground)' }}>
                {tile.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </ShowcaseSection>
  );
}

export function CuisineCards({ cuisines, counts }: { cuisines: ShowcaseCuisine[]; counts: Map<string, number> }) {
  const t = useTranslations('home.showcase');
  const tNav = useTranslations('nav');
  const cards = cuisines
    .map((cuisine) => ({ ...cuisine, link: CUISINE_LINKS.find((link) => link.key === cuisine.key) }))
    .filter((cuisine): cuisine is ShowcaseCuisine & { link: (typeof CUISINE_LINKS)[number] } => Boolean(cuisine.link));
  if (cards.length === 0) return null;
  return (
    <ShowcaseSection cream testId="showcase-cuisines" labelledBy="showcase-cuisines-title">
      <SectionHeading id="showcase-cuisines-title" eyebrow={t('cuisinesEyebrow')} title={t('cuisinesTitle')} />
      <ul className={`${SCROLL_ROW} md:grid md:grid-cols-5 md:gap-4`}>
        {cards.map(({ key, imageUrl, link }) => {
          const count = counts.get(link.country);
          return (
            <li key={key} className="w-[42%] min-w-[150px] shrink-0 snap-start md:w-auto md:min-w-0" data-testid="showcase-cuisine-card">
              <Link href={buildCuisineHref(link.country)} className="group relative block overflow-hidden rounded-2xl">
                <span className="block aspect-[4/5] bg-white">
                  {imageUrl ? (
                    <img src={imageUrl} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
                  ) : null}
                </span>
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/35 to-transparent px-3 pb-3 pt-10 text-white">
                  <span className="block font-display text-lg font-bold leading-tight">{tNav(`cuisine.${key}`)}</span>
                  {count ? <span className="block text-xs opacity-90">{t('productCount', { count })}</span> : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </ShowcaseSection>
  );
}

export function PickupSteps() {
  const t = useTranslations('home.showcase');
  const steps = [
    { icon: ShoppingBasket, title: t('step1Title'), text: t('step1Text') },
    { icon: CheckCircle2, title: t('step2Title'), text: t('step2Text') },
    { icon: Store, title: t('step3Title'), text: t('step3Text') },
  ];
  return (
    <ShowcaseSection testId="showcase-steps" labelledBy="showcase-steps-title">
      <SectionHeading id="showcase-steps-title" eyebrow={t('stepsEyebrow')} title={t('stepsTitle')} />
      <ol className="grid gap-2.5 md:grid-cols-3 md:gap-5">
        {steps.map(({ icon: Icon, title, text }, index) => (
          <li
            key={title}
            className="flex items-start gap-4 rounded-2xl border p-3.5 md:p-5"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
            data-testid="showcase-step"
          >
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: SHOWCASE_CREAM }}>
              <Icon className="h-5 w-5" style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
              <span
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-white"
                style={{ backgroundColor: SHOWCASE_ACCENT }}
                aria-hidden="true"
              >
                {index + 1}
              </span>
            </span>
            <span>
              <span className="block font-semibold" style={{ color: 'var(--color-foreground)' }}>{title}</span>
              <span className="mt-0.5 block text-sm leading-relaxed" style={{ color: 'var(--color-muted-foreground)' }}>{text}</span>
            </span>
          </li>
        ))}
      </ol>
    </ShowcaseSection>
  );
}

export function StoreInfo({
  store,
  address,
  openingHours,
  socialLinks,
  storeName,
}: {
  store: ShowcaseStoreConfig;
  address: string | null;
  openingHours: OpeningHoursEntry[];
  socialLinks: SocialLink[];
  storeName: string;
}) {
  const t = useTranslations('home.showcase');
  const tFooter = useTranslations('footer');
  const today = todayOpeningHours(openingHours);
  const directionsUrl = store.mapsUrl
    || (address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${storeName}, ${address}`)}` : null);
  if (!address && openingHours.length === 0) return null;
  return (
    <ShowcaseSection cream testId="showcase-store" labelledBy="showcase-store-title">
      <SectionHeading id="showcase-store-title" eyebrow={t('storeEyebrow')} title={t('storeTitle')} />
      <div className={`grid gap-4 ${store.photoUrl ? 'md:grid-cols-2' : ''}`}>
        <div className="rounded-2xl border bg-white p-5 md:p-6" style={{ borderColor: 'var(--color-border)' }}>
          {today ? (
            <p
              className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
              style={today.open
                ? { backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)', color: 'var(--color-primary)' }
                : { backgroundColor: 'color-mix(in srgb, #D3121C 10%, transparent)', color: SHOWCASE_ACCENT }}
              data-testid="showcase-store-today"
            >
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {today.open ? t('openToday', { opens: today.opens ?? '', closes: today.closes ?? '' }) : t('closedToday')}
            </p>
          ) : null}
          <div className="grid gap-5 sm:grid-cols-2">
            {address ? (
              <div className="flex gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0" style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
                <div>
                  <p className="font-semibold" style={{ color: 'var(--color-foreground)' }}>{t('pickupPoint')}</p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted-foreground)' }}>{address}</p>
                </div>
              </div>
            ) : null}
            {openingHours.length > 0 ? (
              <div className="flex gap-3">
                <Clock className="mt-0.5 h-5 w-5 shrink-0" style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
                <dl className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                  <dt className="font-semibold" style={{ color: 'var(--color-foreground)' }}>{t('openingHours')}</dt>
                  {openingHours.map((entry) => (
                    <dd key={entry.label} className="flex gap-3">
                      <span className="min-w-[88px]">{entry.label}</span>
                      <span>{entry.opens && entry.closes ? `${entry.opens} – ${entry.closes}` : tFooter('closed')}</span>
                    </dd>
                  ))}
                </dl>
              </div>
            ) : null}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {directionsUrl ? (
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: 'var(--color-primary)' }}
                data-testid="showcase-store-directions"
              >
                <Navigation className="h-4 w-4" aria-hidden="true" />
                {t('directions')}
              </a>
            ) : null}
            {store.reviews ? (
              <a
                href={store.reviews.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
                data-testid="showcase-store-reviews"
              >
                <Star className="h-4 w-4 fill-current" style={{ color: '#F5A623' }} aria-hidden="true" />
                {t('reviews', { rating: store.reviews.rating.toFixed(1), count: store.reviews.count })}
              </a>
            ) : null}
          </div>
          {socialLinks.length > 0 ? (
            <div className="mt-4" data-testid="showcase-store-social">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted-foreground)' }}>{t('followUs')}</p>
              <SocialBar links={socialLinks} />
            </div>
          ) : null}
        </div>
        {store.photoUrl ? (
          <img src={store.photoUrl} alt={t('storePhotoAlt', { storeName })} loading="lazy" className="h-full min-h-[220px] w-full rounded-2xl object-cover" />
        ) : null}
      </div>
    </ShowcaseSection>
  );
}

export function BrandChips({ brands }: { brands: string[] }) {
  const t = useTranslations('home.showcase');
  const names = brands.map((brand) => brand.trim()).filter(Boolean);
  if (names.length === 0) return null;
  return (
    <ShowcaseSection testId="showcase-brands" labelledBy="showcase-brands-title">
      <SectionHeading id="showcase-brands-title" eyebrow={t('brandsEyebrow')} title={t('brandsTitle')} />
      <ul className="flex flex-wrap gap-2 md:gap-3">
        {names.map((brand) => (
          <li key={brand}>
            <Link
              href={`/products?search=${encodeURIComponent(brand)}`}
              className="inline-flex min-h-11 items-center rounded-full border bg-white px-4 text-sm font-semibold transition-colors hover:border-current md:px-5 md:text-base"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
              data-testid="showcase-brand-chip"
            >
              {brand}
            </Link>
          </li>
        ))}
      </ul>
    </ShowcaseSection>
  );
}

/** The SEO paragraphs stay in the HTML but fold behind "Czytaj więcej". */
export function AboutCollapsible({ seoText, english }: { seoText: HomepageSeoTextConfig | undefined; english: boolean }) {
  const t = useTranslations('home.showcase');
  if (!seoText?.enabled) return null;
  const headline = (english && seoText.headlineEn.trim()) || seoText.headline.trim();
  const paragraphs = (english && seoText.paragraphsEn.some((p) => p.trim()) ? seoText.paragraphsEn : seoText.paragraphs)
    .map((p) => p.trim())
    .filter(Boolean);
  if (!headline && paragraphs.length === 0) return null;
  const [lead, ...rest] = paragraphs;
  return (
    <section className="container-grocery py-8 md:py-10" data-testid="home-seo-text">
      <div className="max-w-3xl">
        {headline ? <h2 className="font-display text-lg font-bold md:text-xl" style={{ color: 'var(--color-foreground)' }}>{headline}</h2> : null}
        {lead ? <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-muted-foreground)' }}>{lead}</p> : null}
        {rest.length > 0 ? (
          <details className="group mt-2">
            <summary className="cursor-pointer list-none text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
              <span className="group-open:hidden">{t('readMore')}</span>
              <span className="hidden group-open:inline">{t('readLess')}</span>
            </summary>
            {rest.map((paragraph) => (
              <p key={paragraph} className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-muted-foreground)' }}>{paragraph}</p>
            ))}
          </details>
        ) : null}
      </div>
    </section>
  );
}
