import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache, type ReactNode } from 'react';

import { resolveChannel } from '@/lib/channel';
import { RECIPE_BY_SLUG_QUERY } from '@/lib/graphql/operations/grocery';
import { serverGraphqlRequest } from '@/lib/graphql/server-request';
import {
  buildPublicPageMetadata,
  fetchSeoStorefrontConfig,
  getLocalizedSeoUrl,
  getSeoOrigin,
  normalizeSeoLocale,
  serializeJsonLd,
} from '@/lib/seo-metadata';
import type { StorefrontConfig } from '@/types/storefront-config';

interface RecipeSeoData {
  name: string;
  slug: string;
  description?: string | null;
  thumbnail?: { url?: string | null } | null;
  servings?: number | null;
  prepTime?: number | null;
  cookTime?: number | null;
  totalTime?: number | null;
  steps?: Array<{
    stepNumber?: number | null;
    instruction?: string | null;
  }> | null;
  ingredients?: Array<{
    quantity?: number | null;
    unit?: string | null;
    displayName?: string | null;
    variant?: { name?: string | null } | null;
  }> | null;
}

interface RecipeSeoResponse {
  recipe?: RecipeSeoData | null;
}

interface RecipeRouteParams {
  locale: string;
  slug: string;
}

const getRecipeForSeo = cache(async (slug: string) => {
  const result = await serverGraphqlRequest<RecipeSeoResponse>(
    RECIPE_BY_SLUG_QUERY,
    { channel: resolveChannel(process.env.NEXT_PUBLIC_SALON_SLUG), slug },
    { next: { revalidate: 300, tags: [`recipe:${slug}`] } },
  );

  return result.errorMessage ? null : result.data?.recipe ?? null;
});

function getRecipePath(slug: string) {
  return `/recipes/${encodeURIComponent(slug)}`;
}

function getRecipeDescription(recipe: RecipeSeoData, locale: string) {
  const description = recipe.description?.replace(/\s+/g, ' ').trim();
  if (description) return description;

  return normalizeSeoLocale(locale) === 'pl'
    ? `Przepis ${recipe.name}: składniki i sposób przygotowania.`
    : `${recipe.name} recipe with ingredients and preparation steps.`;
}

function toIsoDuration(minutes: number | null | undefined) {
  return typeof minutes === 'number' && minutes > 0 ? `PT${Math.round(minutes)}M` : undefined;
}

function getAbsoluteImageUrl(value: string | null | undefined, origin: string | null) {
  if (!value) return undefined;

  try {
    return new URL(value, origin ? `${origin}/` : undefined).toString();
  } catch {
    return undefined;
  }
}

function buildRecipeJsonLd(
  recipe: RecipeSeoData,
  locale: string,
  siteConfig: StorefrontConfig | null,
) {
  const origin = getSeoOrigin(siteConfig?.seo.canonical);
  const url = getLocalizedSeoUrl(origin, locale, getRecipePath(recipe.slug));
  const image = getAbsoluteImageUrl(recipe.thumbnail?.url, origin);
  const ingredients = (recipe.ingredients ?? [])
    .map((ingredient) => {
      const name = ingredient.displayName?.trim() || ingredient.variant?.name?.trim();
      if (!name) return null;
      return [ingredient.quantity, ingredient.unit?.trim(), name].filter(Boolean).join(' ');
    })
    .filter((ingredient): ingredient is string => Boolean(ingredient));
  const instructions = (recipe.steps ?? [])
    .filter((step) => step.instruction?.trim())
    .sort((left, right) => (left.stepNumber ?? 0) - (right.stepNumber ?? 0))
    .map((step) => ({
      '@type': 'HowToStep',
      position: step.stepNumber,
      text: step.instruction?.trim(),
    }));

  return {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.name,
    description: getRecipeDescription(recipe, locale),
    image: image ? [image] : undefined,
    url,
    inLanguage: normalizeSeoLocale(locale),
    prepTime: toIsoDuration(recipe.prepTime),
    cookTime: toIsoDuration(recipe.cookTime),
    totalTime: toIsoDuration(recipe.totalTime),
    recipeYield: recipe.servings ? String(recipe.servings) : undefined,
    recipeIngredient: ingredients.length > 0 ? ingredients : undefined,
    recipeInstructions: instructions.length > 0 ? instructions : undefined,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RecipeRouteParams>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const [recipe, siteConfig] = await Promise.all([
    getRecipeForSeo(slug),
    fetchSeoStorefrontConfig(),
  ]);

  if (!recipe) return { robots: { index: false, follow: false } };

  return buildPublicPageMetadata({
    locale,
    pathname: getRecipePath(recipe.slug),
    title: recipe.name,
    description: getRecipeDescription(recipe, locale),
    imageUrl: recipe.thumbnail?.url,
    siteConfig,
  });
}

export default async function RecipeDetailLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<RecipeRouteParams>;
}) {
  const { locale, slug } = await params;
  const [recipe, siteConfig] = await Promise.all([
    getRecipeForSeo(slug),
    fetchSeoStorefrontConfig(),
  ]);

  if (!recipe) notFound();

  const jsonLd = buildRecipeJsonLd(recipe, locale, siteConfig);

  return (
    <>
      <script
        id="recipe-json-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      {children}
    </>
  );
}
