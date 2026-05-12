'use client';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery } from 'urql';
import Image from 'next/image';
import { Clock, Users, ChefHat, ShoppingCart, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { RECIPE_BY_SLUG_QUERY } from '@/lib/graphql/operations/grocery';
import { Breadcrumb } from '@/components/grocery/Breadcrumb';
import { Link } from '@/i18n/navigation';
import { useCartStore } from '@/stores/cart-store';
import { formatPrice, getImageSrc, isImageProxySrc } from '@/lib/utils';
import { useChannel } from '@/hooks/use-channel';

const DIFFICULTY_STYLES: Record<string, string> = {
  EASY: 'var(--color-fresh)',
  MEDIUM: 'var(--color-expiring-text)',
  HARD: 'var(--color-last-chance)',
};

function RecipeDetailSkeleton() {
  return (
    <div className="container-grocery py-8">
      <div className="h-4 skeleton rounded w-16 mb-6" />
      <div className="grid md:grid-cols-5 gap-8">
        <div className="md:col-span-3 space-y-6">
          <div className="aspect-video skeleton rounded-xl" />
          <div className="h-8 skeleton rounded w-2/3" />
          <div className="h-4 skeleton rounded w-full" />
          <div className="flex gap-4">
            <div className="h-4 skeleton rounded w-20" />
            <div className="h-4 skeleton rounded w-16" />
          </div>
        </div>
        <div className="md:col-span-2">
          <div className="rounded-xl border p-5 space-y-3" style={{ borderColor: 'var(--color-border)' }}>
            <div className="h-6 skeleton rounded w-1/2" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-4 skeleton rounded w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RecipeDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const t = useTranslations('recipes');
  const tCommon = useTranslations('common');
  const addItem = useCartStore((s) => s.addItem);
  const channel = useChannel();

  const [result] = useQuery({
    query: RECIPE_BY_SLUG_QUERY,
    variables: { channel, slug },
  });

  const recipe = result.data?.recipe;

  if (result.fetching) {
    return <RecipeDetailSkeleton />;
  }

  if (!recipe) {
    return (
      <div className="container-grocery py-16 text-center">
        <ChefHat className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
        <p className="text-sm mb-2" style={{ color: 'var(--color-muted-foreground)' }}>Recipe not found</p>
        <Link href="/recipes" className="text-sm font-medium inline-block transition-opacity hover:opacity-80" style={{ color: 'var(--color-primary)' }}>
          Back to recipes
        </Link>
      </div>
    );
  }

  const availableIngredients = recipe.ingredients?.filter((i: any) => i.variant && i.inStock) || [];
  const imageUrl = getImageSrc(recipe.thumbnail?.url);

  function addAllToCart() {
    void (async () => {
      let successCount = 0;

      for (const ingredient of availableIngredients) {
        const variantPrice = ingredient.variant.pricing?.price?.gross;

        const success = await addItem({
          productId: ingredient.product?.id || ingredient.variant.id,
          variantId: ingredient.variant.id,
          slug: ingredient.product?.slug,
          name: ingredient.variant.name || ingredient.displayName,
          thumbnail: getImageSrc(ingredient.product?.thumbnail?.url) || undefined,
          price: variantPrice?.amount ?? ingredient.variant.price ?? 0,
          currency: variantPrice?.currency ?? ingredient.variant.currency ?? 'PLN',
          quantity: Math.ceil(ingredient.quantity),
        });

        if (success) {
          successCount += 1;
        }
      }

      if (successCount === 0) {
        toast.error(tCommon('error'));
        return;
      }

      if (successCount < availableIngredients.length) {
        toast.error(`Only ${successCount} of ${availableIngredients.length} items were added.`);
        return;
      }

      toast.success(`Added ${availableIngredients.length} items to cart`);
    })();
  }

  return (
    <article className="container-grocery py-8 md:py-12">
      <Breadcrumb items={[
        { label: tCommon('back').replace('Back', 'Home'), href: '/' },
        { label: t('title'), href: '/recipes' },
        { label: recipe.name },
      ]} />

      <div className="grid md:grid-cols-5 gap-8 lg:gap-12">
        {/* Left: Image + Steps */}
        <div className="md:col-span-3">
          {/* Hero */}
          <div className="relative aspect-video rounded-xl overflow-hidden mb-6" style={{ backgroundColor: 'var(--color-muted)' }}>
            {imageUrl ? (
              <Image src={imageUrl} alt={recipe.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 60vw" priority unoptimized={isImageProxySrc(imageUrl)} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <ChefHat className="w-16 h-16 opacity-20" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
              </div>
            )}
          </div>

          <h1
            className="heading-display text-2xl md:text-3xl mb-3"
            style={{ color: 'var(--color-foreground)' }}
          >
            {recipe.name}
          </h1>

          {recipe.description && (
            <p className="text-sm leading-relaxed mb-6 max-w-prose" style={{ color: 'var(--color-muted-foreground)' }}>
              {recipe.description}
            </p>
          )}

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 mb-10">
            {recipe.totalTime && (
              <span className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                <Clock className="w-4 h-4" aria-hidden="true" />
                {t('totalTime', { min: recipe.totalTime })}
              </span>
            )}
            {recipe.servings && (
              <span className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                <Users className="w-4 h-4" aria-hidden="true" />
                {t('servings', { count: recipe.servings })}
              </span>
            )}
            {recipe.difficulty && (
              <span
                className="px-2.5 py-0.5 rounded-full text-xs font-bold text-white uppercase"
                style={{ backgroundColor: DIFFICULTY_STYLES[recipe.difficulty] || 'var(--color-muted-foreground)' }}
              >
                {t(recipe.difficulty.toLowerCase() as 'easy' | 'medium' | 'hard')}
              </span>
            )}
          </div>

          {/* Steps */}
          {recipe.steps?.length > 0 && (
            <section aria-label="Cooking steps">
              <h2 className="heading-section text-lg mb-6" style={{ color: 'var(--color-foreground)' }}>
                {t('steps')}
              </h2>
              <ol className="space-y-8" role="list">
                {recipe.steps.map((step: any) => {
                  const stepImage = getImageSrc(step.image?.url);

                  return (
                  <li key={step.stepNumber} className="flex gap-4" role="listitem">
                    <div
                      className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                      style={{ backgroundColor: 'var(--color-primary)' }}
                      aria-hidden="true"
                    >
                      {step.stepNumber}
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-foreground)' }}>
                        {step.instruction}
                      </p>
                      {stepImage && (
                        <div className="mt-3 relative aspect-video rounded-lg overflow-hidden max-w-sm">
                          <Image src={stepImage} alt={`Step ${step.stepNumber}`} fill className="object-cover" sizes="400px" unoptimized={isImageProxySrc(stepImage)} />
                        </div>
                      )}
                    </div>
                  </li>
                  );
                })}
              </ol>
            </section>
          )}
        </div>

        {/* Right: Ingredients sidebar */}
        <aside className="md:col-span-2" aria-label="Recipe ingredients">
          <div className="sticky top-20 rounded-xl border p-5" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}>
            <h2 className="heading-section text-lg mb-4" style={{ color: 'var(--color-foreground)' }}>
              {t('ingredients')}
            </h2>

            {recipe.ingredients?.length > 0 ? (
              <ul className="space-y-3 mb-6" role="list">
                {recipe.ingredients.map((ing: any) => (
                  <li key={ing.id} className="flex items-start gap-2" role="listitem">
                    {/* Stock indicator */}
                    <div className="shrink-0 mt-0.5">
                      {ing.inStock ? (
                        <Check className="w-4 h-4" style={{ color: 'var(--color-fresh)' }} aria-label="In stock" />
                      ) : ing.variant ? (
                        <X className="w-4 h-4" style={{ color: 'var(--color-last-chance)' }} aria-label="Out of stock" />
                      ) : (
                        <span className="w-4 h-4 block" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm" style={{ color: 'var(--color-foreground)' }}>
                        <span className="font-medium tabular-nums">{ing.quantity} {ing.unit}</span>{' '}
                        {ing.displayName || ing.variant?.name || 'Unknown ingredient'}
                        {ing.isOptional && (
                          <span className="text-xs ml-1" style={{ color: 'var(--color-muted-foreground)' }}>
                            ({t('optional')})
                          </span>
                        )}
                      </p>
                      {ing.variant?.pricing?.price?.gross && (
                        <p className="text-xs tabular-nums" style={{ color: 'var(--color-muted-foreground)' }}>
                          {formatPrice(ing.variant.pricing.price.gross.amount, ing.variant.pricing.price.gross.currency)}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm mb-6" style={{ color: 'var(--color-muted-foreground)' }}>
                No ingredients listed.
              </p>
            )}

            {/* Add all to cart */}
            {availableIngredients.length > 0 && (
              <button
                type="button"
                onClick={addAllToCart}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-white transition-all duration-fast active:scale-[0.98]"
                style={{ backgroundColor: 'var(--color-primary)' }}
                aria-label={`${t('addAllToCart')} — ${availableIngredients.length} items`}
              >
                <ShoppingCart className="w-5 h-5" aria-hidden="true" />
                {t('addAllToCart')} ({availableIngredients.length})
              </button>
            )}
          </div>
        </aside>
      </div>
    </article>
  );
}
