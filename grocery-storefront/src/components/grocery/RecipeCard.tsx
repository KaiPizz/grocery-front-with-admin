'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Clock, ChefHat, Users } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { getImageSrc, isImageProxySrc } from '@/lib/utils';
import type { Recipe } from '@/types';

interface RecipeCardProps {
  recipe: Recipe;
}

const DIFFICULTY_STYLES: Record<string, { bg: string; text: string }> = {
  EASY: { bg: 'var(--color-fresh)', text: 'white' },
  MEDIUM: { bg: 'var(--color-expiring-text)', text: 'white' },
  HARD: { bg: 'var(--color-last-chance)', text: 'white' },
};

export function RecipeCard({ recipe }: RecipeCardProps) {
  const t = useTranslations('recipes');

  const diffStyle = recipe.difficulty
    ? DIFFICULTY_STYLES[recipe.difficulty] || { bg: 'var(--color-muted-foreground)', text: 'white' }
    : null;

  const imageUrl = getImageSrc(recipe.thumbnail?.url);

  return (
    <Link
      href={`/recipes/${recipe.slug}`}
      className="group block rounded-xl border overflow-hidden card-hover"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
      aria-label={`${recipe.name}${recipe.totalTime ? `, ${recipe.totalTime} minutes` : ''}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden" style={{ backgroundColor: 'var(--color-muted)' }}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt=""
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-slow"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            unoptimized={isImageProxySrc(imageUrl)}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <ChefHat className="w-10 h-10 opacity-30" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
          </div>
        )}
        {recipe.difficulty && diffStyle && (
          <span
            className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase"
            style={{ backgroundColor: diffStyle.bg, color: diffStyle.text }}
          >
            {t(recipe.difficulty.toLowerCase() as 'easy' | 'medium' | 'hard')}
          </span>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-sm line-clamp-2 mb-2 leading-snug group-hover:text-primary transition-colors duration-fast" style={{ color: 'var(--color-foreground)' }}>
          {recipe.name}
        </h3>

        {recipe.description && (
          <p className="text-xs line-clamp-2 mb-3 leading-relaxed" style={{ color: 'var(--color-muted-foreground)' }}>
            {recipe.description}
          </p>
        )}

        <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
          {recipe.totalTime && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{recipe.totalTime} min</span>
            </span>
          )}
          {recipe.servings && (
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{recipe.servings}</span>
            </span>
          )}
          {recipe.ingredients?.length > 0 && (
            <span>{recipe.ingredients.length} ing.</span>
          )}
        </div>
      </div>
    </Link>
  );
}
