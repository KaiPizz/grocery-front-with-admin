'use client';

import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2 } from 'lucide-react';

import { FieldLabel } from '@/components/FieldLabel';
import { ImageUploader } from '@/components/ImageUploader';
import { useLanguage } from '@/i18n';

import type {
  CommercialCategoryHubConfig,
  CommercialCategoryHubItem,
} from '@/types/config';

const INPUT_CLASS = 'min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-mono text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100';
const ICON_BUTTON_CLASS = 'inline-flex h-11 w-11 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-30';
const DELETE_BUTTON_CLASS = 'inline-flex h-11 w-11 items-center justify-center rounded-md text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500';

interface CategoryHubConfigEditorProps {
  categoryHub: CommercialCategoryHubConfig;
  onChange: (categoryHub: CommercialCategoryHubConfig) => void;
}

function normalizeOrder(items: CommercialCategoryHubItem[]) {
  return items.map((item, order) => ({ ...item, order }));
}

function reorder(
  items: CommercialCategoryHubItem[],
  index: number,
  direction: -1 | 1,
) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= items.length) return items;

  const next = [...items];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  return normalizeOrder(next);
}

export function CategoryHubConfigEditor({
  categoryHub,
  onChange,
}: CategoryHubConfigEditorProps) {
  const { t } = useLanguage();

  function updateItem(index: number, partial: Partial<CommercialCategoryHubItem>) {
    const items = [...categoryHub.items];
    items[index] = { ...items[index], ...partial };
    onChange({ ...categoryHub, items });
  }

  function addItem() {
    const timestamp = Date.now();
    onChange({
      ...categoryHub,
      items: [
        ...categoryHub.items,
        {
          id: `category-hub-${timestamp}`,
          categorySlug: `category-${timestamp}`,
          imageUrl: null,
          enabled: true,
          order: categoryHub.items.length,
        },
      ],
    });
  }

  function removeItem(index: number) {
    onChange({
      ...categoryHub,
      items: normalizeOrder(categoryHub.items.filter((_, itemIndex) => itemIndex !== index)),
    });
  }

  return (
    <section className="space-y-4 border-t border-slate-100 pt-4" aria-labelledby="category-hub-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 id="category-hub-heading" className="text-sm font-semibold text-slate-950">
              {t('layout.commercial.categoryHub.title')}
            </h3>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              {categoryHub.items.length} {t('layout.commercial.categoryHub.itemsCount')}
            </span>
          </div>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
            {t('layout.commercial.categoryHub.description')}
          </p>
        </div>
        <button
          type="button"
          onClick={addItem}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:border-indigo-400 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t('layout.commercial.categoryHub.addItem')}
        </button>
      </div>

      <label className="flex min-h-11 items-center gap-2 rounded-lg bg-slate-50 px-3 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={categoryHub.enabled}
          onChange={(event) => onChange({ ...categoryHub, enabled: event.target.checked })}
          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span>{t('layout.commercial.categoryHub.enable')}</span>
      </label>

      {categoryHub.items.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-4 py-6 text-center">
          <p className="text-sm font-medium text-slate-700">{t('layout.commercial.categoryHub.emptyTitle')}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{t('layout.commercial.categoryHub.emptyDescription')}</p>
        </div>
      )}

      <div className="space-y-3">
        {categoryHub.items.map((item, index) => (
          <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,22rem)_auto] lg:items-start">
              <div className="flex min-w-0 gap-3">
                <GripVertical className="mt-8 h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <FieldLabel
                    label={t('layout.commercial.categoryHub.categorySlug')}
                    htmlFor={`category-hub-slug-${index}`}
                    hint={t('layout.commercial.categoryHub.categorySlugHint')}
                  >
                    <input
                      id={`category-hub-slug-${index}`}
                      type="text"
                      value={item.categorySlug}
                      onChange={(event) => updateItem(index, { categorySlug: event.target.value })}
                      className={INPUT_CLASS}
                      placeholder="makaron-i-noodle"
                      autoComplete="off"
                    />
                  </FieldLabel>
                  <label className="mt-3 flex min-h-11 items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={item.enabled}
                      onChange={(event) => updateItem(index, { enabled: event.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>{t('layout.commercial.categoryHub.itemEnabled')}</span>
                  </label>
                </div>
              </div>

              <ImageUploader
                value={item.imageUrl}
                onChange={(imageUrl) => updateItem(index, { imageUrl })}
                label={t('layout.commercial.categoryHub.image')}
              />

              <div className="flex items-center justify-end gap-1 lg:pt-6">
                <button
                  type="button"
                  onClick={() => onChange({ ...categoryHub, items: reorder(categoryHub.items, index, -1) })}
                  disabled={index === 0}
                  className={ICON_BUTTON_CLASS}
                  aria-label={t('layout.commercial.categoryHub.moveUp')}
                  title={t('layout.commercial.categoryHub.moveUp')}
                >
                  <ChevronUp className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ ...categoryHub, items: reorder(categoryHub.items, index, 1) })}
                  disabled={index === categoryHub.items.length - 1}
                  className={ICON_BUTTON_CLASS}
                  aria-label={t('layout.commercial.categoryHub.moveDown')}
                  title={t('layout.commercial.categoryHub.moveDown')}
                >
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className={DELETE_BUTTON_CLASS}
                  aria-label={t('layout.commercial.categoryHub.removeItem')}
                  title={t('layout.commercial.categoryHub.removeItem')}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
