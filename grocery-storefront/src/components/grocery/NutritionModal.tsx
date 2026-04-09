'use client';

import { useTranslations } from 'next-intl';
import { X, Info } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import type { NutritionFacts } from '@/types';

interface NutritionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  nutritionFacts?: NutritionFacts;
  ingredients?: string;
  allergens?: string[];
  dietaryTags?: string[];
  certifications?: string[];
  countryOfOrigin?: string;
}

function NutritionRow({ label, value, unit = 'g', indent = false }: { label: string; value?: number; unit?: string; indent?: boolean }) {
  if (value === undefined || value === null) return null;
  return (
    <tr>
      <td className={`py-1.5 text-sm ${indent ? 'pl-4' : 'font-medium'}`} style={{ color: indent ? 'var(--color-muted-foreground)' : 'var(--color-foreground)' }}>
        {label}
      </td>
      <td className="py-1.5 text-sm text-right tabular-nums font-medium" style={{ color: 'var(--color-foreground)' }}>
        {value.toFixed(1)}{unit}
      </td>
    </tr>
  );
}

export function NutritionModal({
  open,
  onOpenChange,
  productName,
  nutritionFacts,
  ingredients,
  allergens,
  dietaryTags,
  certifications,
  countryOfOrigin,
}: NutritionModalProps) {
  const t = useTranslations('product');
  const tAllergens = useTranslations('allergens');

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 animate-fade-in" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 max-h-[85vh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border p-5 animate-slide-up sm:w-full sm:p-6" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="heading-section text-lg" style={{ color: 'var(--color-foreground)' }}>
              {productName}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="w-10 h-10 flex items-center justify-center rounded-lg hover-surface" aria-label="Close">
                <X className="w-5 h-5" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          {/* Nutrition facts table */}
          {nutritionFacts && (
            <div className="mb-5">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5" style={{ color: 'var(--color-foreground)' }}>
                <Info className="w-4 h-4" style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
                {t('nutrition')}
              </h3>
              <p className="text-xs mb-2" style={{ color: 'var(--color-muted-foreground)' }}>
                {t('nutritionPer100')}
              </p>
              <table className="w-full nutrition-table">
                <thead>
                  <tr>
                    <th>{t('nutrient') || 'Nutrient'}</th>
                    <th className="text-right">{t('amount') || 'Amount'}</th>
                  </tr>
                </thead>
                <tbody>
                  <NutritionRow label={t('calories')} value={nutritionFacts.calories} unit=" kcal" />
                  <NutritionRow label={t('fat')} value={nutritionFacts.fat} />
                  <NutritionRow label={t('saturatedFat')} value={nutritionFacts.saturatedFat} indent />
                  <NutritionRow label={t('carbs')} value={nutritionFacts.carbs} />
                  <NutritionRow label={t('sugar')} value={nutritionFacts.sugar} indent />
                  <NutritionRow label={t('fiber')} value={nutritionFacts.fiber} />
                  <NutritionRow label={t('protein')} value={nutritionFacts.protein} />
                  <NutritionRow label={t('salt')} value={nutritionFacts.salt} />
                </tbody>
              </table>
              {nutritionFacts.servingSize && (
                <p className="text-xs mt-2" style={{ color: 'var(--color-muted-foreground)' }}>
                  {t('servingSize')}: {nutritionFacts.servingSize}
                </p>
              )}
            </div>
          )}

          {/* Ingredients */}
          {ingredients && (
            <div className="mb-5">
              <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--color-foreground)' }}>
                {t('ingredients')}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted-foreground)' }}>
                {ingredients}
              </p>
            </div>
          )}

          {/* Allergens */}
          {allergens && allergens.length > 0 && (
            <div className="mb-5">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5" style={{ color: 'var(--color-allergen)' }}>
                <span aria-hidden="true">&#9888;</span> {t('allergens')}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {allergens.map((code) => (
                  <span key={code} className="allergen-chip">
                    {tAllergens(code as any)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Dietary tags */}
          {dietaryTags && dietaryTags.length > 0 && (
            <div className="mb-5">
              <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-foreground)' }}>
                {t('dietary')}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {dietaryTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-foreground)' }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Certifications */}
          {certifications && certifications.length > 0 && (
            <div className="mb-5">
              <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-foreground)' }}>
                {t('certifications') || 'Certifications'}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {certifications.map((cert) => (
                  <span
                    key={cert}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
                    style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
                  >
                    {cert}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Country of origin */}
          {countryOfOrigin && (
            <div>
              <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--color-foreground)' }}>
                {t('origin')}
              </h3>
              <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                {countryOfOrigin}
              </p>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
