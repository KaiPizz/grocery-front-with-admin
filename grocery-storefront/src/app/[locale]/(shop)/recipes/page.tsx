'use client';

import { useTranslations } from 'next-intl';
import { useQuery } from 'urql';
import { ChefHat } from 'lucide-react';
import { RECIPES_QUERY } from '@/lib/graphql/operations/grocery';
import { RecipeCard } from '@/components/grocery/RecipeCard';
import { useChannel } from '@/hooks/use-channel';

function RecipeSkeleton() {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
      <div className="aspect-[4/3] skeleton" />
      <div className="p-4 space-y-2">
        <div className="h-4 skeleton rounded w-3/4" />
        <div className="h-3 skeleton rounded w-full" />
        <div className="flex gap-3 mt-3">
          <div className="h-3 skeleton rounded w-12" />
          <div className="h-3 skeleton rounded w-8" />
        </div>
      </div>
    </div>
  );
}

export default function RecipesPage() {
  const t = useTranslations('recipes');
  const channel = useChannel();

  const [result] = useQuery({
    query: RECIPES_QUERY,
    variables: { channel, first: 24 },
  });

  const recipes = result.data?.recipes?.edges?.map((e: any) => e.node) || [];

  return (
    <div className="container-grocery py-8 md:py-12">
      <div className="flex items-center gap-3 mb-8">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          <ChefHat className="w-5 h-5" style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
        </div>
        <h1
          className="heading-display text-2xl md:text-3xl"
          style={{ color: 'var(--color-foreground)' }}
        >
          {t('title')}
        </h1>
      </div>

      {result.fetching ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <RecipeSkeleton key={i} />
          ))}
        </div>
      ) : recipes.length > 0 ? (
        <div className="product-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {recipes.map((recipe: any) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <ChefHat className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
          <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            No recipes available yet.
          </p>
        </div>
      )}
    </div>
  );
}
