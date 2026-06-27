import type { GroceryProduct } from '@/types';

type ProductTranslation = NonNullable<GroceryProduct['translation']>;

function isEnglishLocale(locale: string | null | undefined): boolean {
  return locale?.toLowerCase().startsWith('en') ?? false;
}

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function getEnglishProductTranslation(product: Pick<GroceryProduct, 'translation'>): ProductTranslation | null {
  const translation = product.translation;
  if (!translation || translation.language?.toLowerCase() !== 'en') return null;
  return translation;
}

export function getLocalizedProductName(product: Pick<GroceryProduct, 'name' | 'translation'>, locale: string): string {
  if (!isEnglishLocale(locale)) return product.name;
  return clean(getEnglishProductTranslation(product)?.name) ?? product.name;
}

export function getLocalizedProductDescription(
  product: Pick<GroceryProduct, 'description' | 'translation'>,
  locale: string,
): string | undefined {
  if (!isEnglishLocale(locale)) return product.description;
  return clean(getEnglishProductTranslation(product)?.description)
    ?? clean(getEnglishProductTranslation(product)?.shortDescription)
    ?? product.description;
}
