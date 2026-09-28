import type {
  HomepageShowcaseConfig,
  ShowcaseCuisineKey,
  ShowcaseHeroSlide,
  ShowcaseRail,
  ShowcaseReviews,
} from '@/types/config';

// Pure helpers behind components/ShowcaseEditor.tsx. The rules mirror
// homepageShowcaseSchema in validation.ts so the editor can name the broken
// field before the PUT comes back as a bare "Validation failed".

export const SHOWCASE_CUISINE_KEYS: ShowcaseCuisineKey[] = ['korean', 'japanese', 'chinese', 'thai', 'vietnamese'];
export const SHOWCASE_MAX_SLIDES = 8;
export const SHOWCASE_MAX_RAILS = 8;
export const SHOWCASE_MAX_BRANDS = 24;

export function createShowcase(): HomepageShowcaseConfig {
  return {
    enabled: false,
    heroSlides: [],
    cuisines: SHOWCASE_CUISINE_KEYS.map((key) => ({ key, imageUrl: null })),
    rails: [],
    brands: [],
    store: { mapsUrl: null, photoUrl: null, reviews: null },
  };
}

/** "a, b\nc," → ["a", "b", "c"]: commas or new lines, blanks dropped. */
export function parseList(text: string): string[] {
  return text.split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
}

export function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function uniqueId(prefix: string, taken: string[]): string {
  let id = `${prefix}-${Date.now().toString(36)}`;
  for (let n = 2; taken.includes(id); n += 1) id = `${prefix}-${Date.now().toString(36)}-${n}`;
  return id;
}

export function createSlide(existing: ShowcaseHeroSlide[]): ShowcaseHeroSlide {
  return {
    id: uniqueId('showcase-slide', existing.map((slide) => slide.id)),
    imageUrl: null,
    mobileImageUrl: null,
    eyebrow: '',
    headline: '',
    subline: '',
    ctaText: '',
    ctaLink: '',
    eyebrowEn: '',
    headlineEn: '',
    sublineEn: '',
    ctaTextEn: '',
    enabled: true,
  };
}

export function createRail(existing: ShowcaseRail[]): ShowcaseRail {
  return {
    id: uniqueId('rail', existing.map((rail) => rail.id)),
    eyebrow: '',
    eyebrowEn: '',
    title: '',
    titleEn: '',
    source: 'categories',
    values: [],
    limit: 12,
    enabled: true,
  };
}

/**
 * Reviews typed into three inputs: all blank = no reviews block; anything
 * typed keeps an object so the missing link is reported, not silently lost.
 */
export function reviewsFromInputs(rating: string, count: string, url: string): ShowcaseReviews | null {
  if (!rating.trim() && !count.trim() && !url.trim()) return null;
  const parsedRating = Number(rating.replace(',', '.'));
  const parsedCount = Number.parseInt(count, 10);
  return {
    rating: Number.isFinite(parsedRating) ? parsedRating : 0,
    count: Number.isFinite(parsedCount) ? parsedCount : 0,
    url: url.trim(),
  };
}

export type ShowcaseProblemCode =
  | 'slideImage'
  | 'slideHeadline'
  | 'slideCta'
  | 'slideLink'
  | 'railTitle'
  | 'railValues'
  | 'railLimit'
  | 'reviewsUrl'
  | 'reviewsRating'
  | 'mapsUrl';

export interface ShowcaseProblem {
  code: ShowcaseProblemCode;
  /** 1-based position of the slide / rail, for the message */
  position?: number;
}

const isHttpUrl = (value: string) => /^https?:\/\/[^\s]+$/i.test(value.trim());

/** Every rule the schema enforces on data the editor can produce, disabled items included. */
export function getShowcaseProblems(showcase: HomepageShowcaseConfig | undefined): ShowcaseProblem[] {
  if (!showcase) return [];
  const problems: ShowcaseProblem[] = [];
  showcase.heroSlides.forEach((slide, index) => {
    const position = index + 1;
    if (!slide.imageUrl?.trim()) problems.push({ code: 'slideImage', position });
    if (!slide.headline.trim()) problems.push({ code: 'slideHeadline', position });
    if (!slide.ctaText.trim()) problems.push({ code: 'slideCta', position });
    if (!slide.ctaLink.trim()) problems.push({ code: 'slideLink', position });
  });
  showcase.rails.forEach((rail, index) => {
    const position = index + 1;
    if (!rail.title.trim()) problems.push({ code: 'railTitle', position });
    if (rail.values.length === 0) problems.push({ code: 'railValues', position });
    if (!Number.isInteger(rail.limit) || rail.limit < 3 || rail.limit > 24) problems.push({ code: 'railLimit', position });
  });
  const { mapsUrl, reviews } = showcase.store;
  if (mapsUrl?.trim() && !isHttpUrl(mapsUrl)) problems.push({ code: 'mapsUrl' });
  if (reviews) {
    if (!isHttpUrl(reviews.url)) problems.push({ code: 'reviewsUrl' });
    if (reviews.rating < 0 || reviews.rating > 5) problems.push({ code: 'reviewsRating' });
  }
  return problems;
}
