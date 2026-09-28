'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';

import { FieldLabel } from '@/components/FieldLabel';
import { FormCard } from '@/components/FormCard';
import { ImageUploader } from '@/components/ImageUploader';
import { BannerImageUploader } from '@/components/blocks/BannerImageUploader';
import { useLanguage } from '@/i18n';
import {
  SHOWCASE_CUISINE_KEYS,
  SHOWCASE_MAX_RAILS,
  SHOWCASE_MAX_SLIDES,
  createRail,
  createShowcase,
  createSlide,
  moveItem,
  parseList,
  reviewsFromInputs,
} from '@/lib/showcase-editor';
import type {
  HomepageShowcaseConfig,
  ShowcaseHeroSlide,
  ShowcaseRail,
  ShowcaseReviews,
  ShowcaseStoreConfig,
} from '@/types/config';

const INPUT_CLASS = 'min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100';
const ICON_BUTTON_CLASS = 'inline-flex h-11 w-11 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-30';
const DELETE_BUTTON_CLASS = 'inline-flex h-11 w-11 items-center justify-center rounded-md text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500';
const ADD_BUTTON_CLASS = 'inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:border-indigo-400 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-40';
const CHECKBOX_CLASS = 'h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500';

/**
 * Comma/new-line list typed as text. Keeps what the owner typed (a trailing
 * comma while typing the next slug) and hands the parent the parsed list.
 */
function ListInput({ id, value, onChange, rows, placeholder }: {
  id: string;
  value: string[];
  onChange: (list: string[]) => void;
  rows?: number;
  placeholder?: string;
}) {
  const [text, setText] = useState(() => value.join(', '));
  const [lastValue, setLastValue] = useState(value);
  // Undo/redo or a reload replaces the list from outside: show the new list.
  if (value !== lastValue) {
    setLastValue(value);
    if (parseList(text).join('\n') !== value.join('\n')) setText(value.join(', '));
  }
  const handle = (next: string) => {
    setText(next);
    onChange(parseList(next));
  };
  return rows ? (
    <textarea id={id} rows={rows} value={text} placeholder={placeholder} onChange={(e) => handle(e.target.value)} className={INPUT_CLASS} />
  ) : (
    <input id={id} type="text" value={text} placeholder={placeholder} onChange={(e) => handle(e.target.value)} className={`${INPUT_CLASS} font-mono`} autoComplete="off" />
  );
}

function ItemToolbar({ label, enabled, onToggle, onUp, onDown, onRemove, first, last }: {
  label: string;
  enabled?: boolean;
  onToggle?: (enabled: boolean) => void;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
  first: boolean;
  last: boolean;
}) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-4">
        <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
        {onToggle ? (
          <label className="flex min-h-11 items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={Boolean(enabled)} onChange={(e) => onToggle(e.target.checked)} className={CHECKBOX_CLASS} />
            <span>{t('homepage.showcase.enabled')}</span>
          </label>
        ) : null}
      </div>
      <div className="flex items-center gap-1">
        <button type="button" onClick={onUp} disabled={first} className={ICON_BUTTON_CLASS} aria-label={t('homepage.showcase.moveUp')} title={t('homepage.showcase.moveUp')}>
          <ChevronUp className="h-4 w-4" aria-hidden="true" />
        </button>
        <button type="button" onClick={onDown} disabled={last} className={ICON_BUTTON_CLASS} aria-label={t('homepage.showcase.moveDown')} title={t('homepage.showcase.moveDown')}>
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </button>
        <button type="button" onClick={onRemove} className={DELETE_BUTTON_CLASS} aria-label={t('homepage.showcase.remove')} title={t('homepage.showcase.remove')}>
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

const reviewsInputs = (reviews: ShowcaseReviews | null) => ({
  rating: reviews ? String(reviews.rating) : '',
  count: reviews ? String(reviews.count) : '',
  url: reviews?.url ?? '',
});

/** Rating/count/link typed as text ("4,8" while typing), all blank = no reviews. */
function ReviewsFields({ reviews, onChange }: { reviews: ShowcaseReviews | null; onChange: (reviews: ShowcaseReviews | null) => void }) {
  const { t } = useLanguage();
  const [inputs, setInputs] = useState(() => reviewsInputs(reviews));
  const [lastReviews, setLastReviews] = useState(reviews);
  if (reviews !== lastReviews) {
    setLastReviews(reviews);
    const typed = reviewsFromInputs(inputs.rating, inputs.count, inputs.url);
    if (JSON.stringify(typed) !== JSON.stringify(reviews)) setInputs(reviewsInputs(reviews));
  }
  const set = (field: keyof typeof inputs, value: string) => {
    const next = { ...inputs, [field]: value };
    setInputs(next);
    onChange(reviewsFromInputs(next.rating, next.count, next.url));
  };
  return (
    <section className="space-y-3 border-t border-slate-100 pt-4" aria-labelledby="showcase-reviews-heading">
      <div className="flex items-center justify-between gap-2">
        <h3 id="showcase-reviews-heading" className="text-sm font-semibold text-slate-900">{t('homepage.showcase.reviewsTitle')}</h3>
        {reviews ? (
          <button type="button" onClick={() => onChange(null)} className="min-h-11 rounded-md px-3 text-sm text-red-600 hover:bg-red-50">
            {t('homepage.showcase.clearReviews')}
          </button>
        ) : null}
      </div>
      <div className="grid gap-3 md:grid-cols-[8rem_10rem_minmax(0,1fr)]">
        <FieldLabel label={t('homepage.showcase.rating')} htmlFor="showcase-reviews-rating">
          <input id="showcase-reviews-rating" type="text" inputMode="decimal" value={inputs.rating} onChange={(e) => set('rating', e.target.value)} className={INPUT_CLASS} placeholder="4,8" autoComplete="off" />
        </FieldLabel>
        <FieldLabel label={t('homepage.showcase.reviewsCount')} htmlFor="showcase-reviews-count">
          <input id="showcase-reviews-count" type="text" inputMode="numeric" value={inputs.count} onChange={(e) => set('count', e.target.value)} className={INPUT_CLASS} placeholder="37" autoComplete="off" />
        </FieldLabel>
        <FieldLabel label={t('homepage.showcase.reviewsUrl')} htmlFor="showcase-reviews-url">
          <input id="showcase-reviews-url" type="url" value={inputs.url} onChange={(e) => set('url', e.target.value)} className={INPUT_CLASS} placeholder="https://g.page/r/…/review" autoComplete="off" />
        </FieldLabel>
      </div>
    </section>
  );
}

interface ShowcaseEditorProps {
  showcase: HomepageShowcaseConfig | undefined;
  onChange: (showcase: HomepageShowcaseConfig) => void;
}

export function ShowcaseEditor({ showcase, onChange }: ShowcaseEditorProps) {
  const { t } = useLanguage();
  const numbered = (key: string, n: number) => t(key).replace('{n}', String(n));

  if (!showcase) {
    return (
      <FormCard title={t('homepage.showcase.title')} description={t('homepage.showcase.createHint')}>
        <button type="button" onClick={() => onChange(createShowcase())} className={ADD_BUTTON_CLASS}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t('homepage.showcase.create')}
        </button>
      </FormCard>
    );
  }

  const update = (partial: Partial<HomepageShowcaseConfig>) => onChange({ ...showcase, ...partial });

  // --- slides ---
  const slides = showcase.heroSlides;
  const updateSlide = (index: number, partial: Partial<ShowcaseHeroSlide>) =>
    update({ heroSlides: slides.map((slide, i) => (i === index ? { ...slide, ...partial } : slide)) });
  const slideText = (index: number, field: keyof ShowcaseHeroSlide, label: string, multiline = false) => {
    const id = `showcase-slide-${field}-${index}`;
    const value = String(slides[index][field] ?? '');
    return (
      <FieldLabel label={label} htmlFor={id}>
        {multiline ? (
          <textarea id={id} rows={2} value={value} onChange={(e) => updateSlide(index, { [field]: e.target.value })} className={INPUT_CLASS} />
        ) : (
          <input id={id} type="text" value={value} onChange={(e) => updateSlide(index, { [field]: e.target.value })} className={INPUT_CLASS} autoComplete="off" />
        )}
      </FieldLabel>
    );
  };

  // --- rails ---
  const rails = showcase.rails;
  const updateRail = (index: number, partial: Partial<ShowcaseRail>) =>
    update({ rails: rails.map((rail, i) => (i === index ? { ...rail, ...partial } : rail)) });
  const railText = (index: number, field: 'eyebrow' | 'eyebrowEn' | 'title' | 'titleEn' | 'href', label: string) => {
    const id = `showcase-rail-${field}-${index}`;
    return (
      <FieldLabel label={label} htmlFor={id}>
        <input id={id} type="text" value={rails[index][field] ?? ''} onChange={(e) => updateRail(index, { [field]: e.target.value })} className={INPUT_CLASS} autoComplete="off" />
      </FieldLabel>
    );
  };

  // --- cuisines: shown ones in their order, then the hidden ones ---
  const hiddenCuisines = SHOWCASE_CUISINE_KEYS.filter((key) => !showcase.cuisines.some((cuisine) => cuisine.key === key));

  // --- store ---
  const store = showcase.store;
  const updateStore = (partial: Partial<ShowcaseStoreConfig>) => update({ store: { ...store, ...partial } });

  return (
    <div className="space-y-6" data-testid="showcase-editor">
      <FormCard title={t('homepage.showcase.title')} description={t('homepage.showcase.description')}>
        <label className="flex min-h-11 items-center gap-2 rounded-lg bg-slate-50 px-3 text-sm font-medium text-slate-800">
          <input type="checkbox" checked={showcase.enabled} onChange={(e) => update({ enabled: e.target.checked })} className={CHECKBOX_CLASS} />
          <span>{t('homepage.showcase.enable')}</span>
        </label>
      </FormCard>

      <FormCard title={t('homepage.showcase.slidesTitle')} description={t('homepage.showcase.slidesHint')} overflow="visible">
        {slides.length === 0 ? <p className="text-sm text-slate-500">{t('homepage.showcase.noSlides')}</p> : null}
        {slides.map((slide, index) => (
          <article key={slide.id} className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <ItemToolbar
              label={numbered('homepage.showcase.slideItem', index + 1)}
              enabled={slide.enabled}
              onToggle={(enabled) => updateSlide(index, { enabled })}
              onUp={() => update({ heroSlides: moveItem(slides, index, -1) })}
              onDown={() => update({ heroSlides: moveItem(slides, index, 1) })}
              onRemove={() => update({ heroSlides: slides.filter((_, i) => i !== index) })}
              first={index === 0}
              last={index === slides.length - 1}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <BannerImageUploader
                value={slide.imageUrl}
                onChange={(url) => updateSlide(index, { imageUrl: url })}
                requiredWidth={1280}
                requiredHeight={800}
                label={t('homepage.showcase.desktopImage')}
                previewFit="contain"
                required
              />
              <BannerImageUploader
                value={slide.mobileImageUrl}
                fallbackValue={slide.imageUrl}
                fallbackLabel={t('homepage.showcase.mobileFallback')}
                onChange={(url) => updateSlide(index, { mobileImageUrl: url })}
                requiredWidth={960}
                requiredHeight={600}
                label={t('homepage.showcase.mobileImage')}
                previewFit="contain"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {slideText(index, 'eyebrow', t('homepage.showcase.eyebrowPl'))}
              {slideText(index, 'eyebrowEn', t('homepage.showcase.eyebrowEn'))}
              {slideText(index, 'headline', t('homepage.showcase.headlinePl'))}
              {slideText(index, 'headlineEn', t('homepage.showcase.headlineEn'))}
              {slideText(index, 'subline', t('homepage.showcase.sublinePl'), true)}
              {slideText(index, 'sublineEn', t('homepage.showcase.sublineEn'), true)}
              {slideText(index, 'ctaText', t('homepage.showcase.ctaTextPl'))}
              {slideText(index, 'ctaTextEn', t('homepage.showcase.ctaTextEn'))}
            </div>
            <FieldLabel label={t('homepage.showcase.ctaLink')} htmlFor={`showcase-slide-ctaLink-${index}`} hint={t('homepage.showcase.ctaLinkHint')}>
              <input
                id={`showcase-slide-ctaLink-${index}`}
                type="text"
                value={slide.ctaLink}
                onChange={(e) => updateSlide(index, { ctaLink: e.target.value })}
                className={`${INPUT_CLASS} font-mono`}
                placeholder="/categories/kimchi"
                autoComplete="off"
              />
            </FieldLabel>
          </article>
        ))}
        <button
          type="button"
          onClick={() => update({ heroSlides: [...slides, createSlide(slides)] })}
          disabled={slides.length >= SHOWCASE_MAX_SLIDES}
          className={ADD_BUTTON_CLASS}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t('homepage.showcase.addSlide')}
        </button>
      </FormCard>

      <FormCard title={t('homepage.showcase.railsTitle')} description={t('homepage.showcase.railsHint')}>
        {rails.length === 0 ? <p className="text-sm text-slate-500">{t('homepage.showcase.noRails')}</p> : null}
        {rails.map((rail, index) => (
          <article key={rail.id} className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <ItemToolbar
              label={`${numbered('homepage.showcase.railItem', index + 1)}${rail.title ? ` · ${rail.title}` : ''}`}
              enabled={rail.enabled}
              onToggle={(enabled) => updateRail(index, { enabled })}
              onUp={() => update({ rails: moveItem(rails, index, -1) })}
              onDown={() => update({ rails: moveItem(rails, index, 1) })}
              onRemove={() => update({ rails: rails.filter((_, i) => i !== index) })}
              first={index === 0}
              last={index === rails.length - 1}
            />
            <div className="grid gap-3 md:grid-cols-2">
              {railText(index, 'eyebrow', t('homepage.showcase.railEyebrowPl'))}
              {railText(index, 'eyebrowEn', t('homepage.showcase.railEyebrowEn'))}
              {railText(index, 'title', t('homepage.showcase.railTitlePl'))}
              {railText(index, 'titleEn', t('homepage.showcase.railTitleEn'))}
              <FieldLabel label={t('homepage.showcase.source')} htmlFor={`showcase-rail-source-${index}`}>
                <select
                  id={`showcase-rail-source-${index}`}
                  value={rail.source}
                  onChange={(e) => updateRail(index, { source: e.target.value as ShowcaseRail['source'] })}
                  className={INPUT_CLASS}
                >
                  <option value="categories">{t('homepage.showcase.sourceCategories')}</option>
                  <option value="country">{t('homepage.showcase.sourceCountry')}</option>
                </select>
              </FieldLabel>
              <FieldLabel label={t('homepage.showcase.limit')} htmlFor={`showcase-rail-limit-${index}`}>
                <input
                  id={`showcase-rail-limit-${index}`}
                  type="number"
                  min={3}
                  max={24}
                  value={rail.limit}
                  onChange={(e) => updateRail(index, { limit: Number.parseInt(e.target.value, 10) || 0 })}
                  className={INPUT_CLASS}
                />
              </FieldLabel>
            </div>
            <FieldLabel
              label={rail.source === 'country' ? t('homepage.showcase.valuesCountry') : t('homepage.showcase.valuesCategories')}
              htmlFor={`showcase-rail-values-${index}`}
            >
              <ListInput
                key={`${rail.id}-${rail.source}`}
                id={`showcase-rail-values-${index}`}
                value={rail.values}
                onChange={(values) => updateRail(index, { values })}
                placeholder={rail.source === 'country' ? 'Japonia' : 'kimchi, sos-sojowy'}
              />
            </FieldLabel>
            {rail.source === 'country' ? (
              <FieldLabel label={t('homepage.showcase.railCategories')} htmlFor={`showcase-rail-categories-${index}`}>
                <ListInput
                  id={`showcase-rail-categories-${index}`}
                  value={rail.categories ?? []}
                  onChange={(categories) => updateRail(index, { categories })}
                />
              </FieldLabel>
            ) : null}
            {railText(index, 'href', t('homepage.showcase.railHref'))}
          </article>
        ))}
        <button
          type="button"
          onClick={() => update({ rails: [...rails, createRail(rails)] })}
          disabled={rails.length >= SHOWCASE_MAX_RAILS}
          className={ADD_BUTTON_CLASS}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t('homepage.showcase.addRail')}
        </button>
      </FormCard>

      <FormCard title={t('homepage.showcase.cuisinesTitle')} description={t('homepage.showcase.cuisinesHint')}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {showcase.cuisines.map((cuisine, index) => (
            <article key={cuisine.key} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-center justify-between gap-2">
                <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-900">
                  <input
                    type="checkbox"
                    checked
                    onChange={() => update({ cuisines: showcase.cuisines.filter((_, i) => i !== index) })}
                    className={CHECKBOX_CLASS}
                  />
                  {t(`homepage.showcase.cuisineNames.${cuisine.key}`)}
                </label>
                <div className="flex items-center">
                  <button type="button" onClick={() => update({ cuisines: moveItem(showcase.cuisines, index, -1) })} disabled={index === 0} className={ICON_BUTTON_CLASS} aria-label={t('homepage.showcase.moveUp')} title={t('homepage.showcase.moveUp')}>
                    <ChevronUp className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => update({ cuisines: moveItem(showcase.cuisines, index, 1) })} disabled={index === showcase.cuisines.length - 1} className={ICON_BUTTON_CLASS} aria-label={t('homepage.showcase.moveDown')} title={t('homepage.showcase.moveDown')}>
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <ImageUploader
                label={t('homepage.showcase.cuisineImage')}
                value={cuisine.imageUrl}
                onChange={(imageUrl) => update({ cuisines: showcase.cuisines.map((c, i) => (i === index ? { ...c, imageUrl } : c)) })}
              />
            </article>
          ))}
          {hiddenCuisines.map((key) => (
            <label key={key} className="flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 text-sm text-slate-500">
              <input
                type="checkbox"
                checked={false}
                onChange={() => update({ cuisines: [...showcase.cuisines, { key, imageUrl: null }] })}
                className={CHECKBOX_CLASS}
              />
              {t(`homepage.showcase.cuisineNames.${key}`)}
            </label>
          ))}
        </div>
      </FormCard>

      <FormCard title={t('homepage.showcase.brandsTitle')} description={t('homepage.showcase.brandsHint')}>
        <FieldLabel label={t('homepage.showcase.brandsLabel')} htmlFor="showcase-brands">
          <ListInput id="showcase-brands" rows={3} value={showcase.brands} onChange={(brands) => update({ brands })} placeholder="Samyang, Nongshim, Ottogi" />
        </FieldLabel>
      </FormCard>

      <FormCard title={t('homepage.showcase.storeTitle')} description={t('homepage.showcase.storeHint')}>
        <div className="grid gap-4 md:grid-cols-2">
          <FieldLabel label={t('homepage.showcase.mapsUrl')} htmlFor="showcase-store-maps" hint={t('homepage.showcase.mapsHint')}>
            <input
              id="showcase-store-maps"
              type="url"
              value={store.mapsUrl ?? ''}
              onChange={(e) => updateStore({ mapsUrl: e.target.value.trim() ? e.target.value : null })}
              className={INPUT_CLASS}
              placeholder="https://maps.app.goo.gl/…"
              autoComplete="off"
            />
          </FieldLabel>
          <ImageUploader label={t('homepage.showcase.storePhoto')} value={store.photoUrl} onChange={(photoUrl) => updateStore({ photoUrl })} />
        </div>

        <ReviewsFields reviews={store.reviews} onChange={(reviews) => updateStore({ reviews })} />

        <p className="border-t border-slate-100 pt-4 text-sm text-slate-600">
          {t('homepage.showcase.socialHint')}{' '}
          <Link href="/admin/general" className="font-medium text-indigo-700 underline underline-offset-2 hover:text-indigo-900">
            {t('homepage.showcase.socialLink')}
          </Link>
        </p>
      </FormCard>
    </div>
  );
}
