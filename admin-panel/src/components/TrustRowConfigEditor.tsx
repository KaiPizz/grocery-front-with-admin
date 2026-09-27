'use client';

import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2 } from 'lucide-react';

import { FieldLabel } from '@/components/FieldLabel';
import { useLanguage } from '@/i18n';

import type {
  CommercialTrustRowConfig,
  CommercialTrustRowItem,
  TrustRowIcon,
} from '@/types/config';

const INPUT_CLASS = 'min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100';
const ICON_BUTTON_CLASS = 'inline-flex h-11 w-11 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-30';
const DELETE_BUTTON_CLASS = 'inline-flex h-11 w-11 items-center justify-center rounded-md text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500';

const TRUST_ROW_ICONS: TrustRowIcon[] = ['map-pin', 'check-circle', 'credit-card', 'package'];

interface TrustRowConfigEditorProps {
  trustRow: CommercialTrustRowConfig;
  onChange: (trustRow: CommercialTrustRowConfig) => void;
}

function normalizeOrder(items: CommercialTrustRowItem[]) {
  return items.map((item, order) => ({ ...item, order }));
}

function reorder(items: CommercialTrustRowItem[], index: number, direction: -1 | 1) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= items.length) return items;

  const next = [...items];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  return normalizeOrder(next);
}

export function TrustRowConfigEditor({ trustRow, onChange }: TrustRowConfigEditorProps) {
  const { t } = useLanguage();

  function updateItem(index: number, partial: Partial<CommercialTrustRowItem>) {
    const items = [...trustRow.items];
    items[index] = { ...items[index], ...partial };
    onChange({ ...trustRow, items });
  }

  function addItem() {
    onChange({
      ...trustRow,
      items: [
        ...trustRow.items,
        {
          id: `trust-${Date.now()}`,
          icon: 'package',
          title: '',
          description: '',
          titleEn: '',
          descriptionEn: '',
          enabled: true,
          order: trustRow.items.length,
        },
      ],
    });
  }

  function removeItem(index: number) {
    onChange({
      ...trustRow,
      items: normalizeOrder(trustRow.items.filter((_, itemIndex) => itemIndex !== index)),
    });
  }

  const textField = (
    index: number,
    field: 'title' | 'description' | 'titleEn' | 'descriptionEn',
    label: string,
  ) => (
    <FieldLabel label={label} htmlFor={`trust-row-${field}-${index}`}>
      <input
        id={`trust-row-${field}-${index}`}
        type="text"
        value={trustRow.items[index][field]}
        onChange={(event) => updateItem(index, { [field]: event.target.value })}
        className={INPUT_CLASS}
        autoComplete="off"
      />
    </FieldLabel>
  );

  return (
    <section className="space-y-4 border-t border-slate-100 pt-4" aria-labelledby="trust-row-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 id="trust-row-heading" className="text-sm font-semibold text-slate-950">
            {t('layout.commercial.trustRow.title')}
          </h3>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
            {t('layout.commercial.trustRow.hint')}
          </p>
        </div>
        <button
          type="button"
          onClick={addItem}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:border-indigo-400 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t('layout.commercial.trustRow.addItem')}
        </button>
      </div>

      <label className="flex min-h-11 items-center gap-2 rounded-lg bg-slate-50 px-3 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={trustRow.enabled}
          onChange={(event) => onChange({ ...trustRow, enabled: event.target.checked })}
          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span>{t('layout.commercial.trustRow.enable')}</span>
      </label>

      <div className="space-y-3">
        {trustRow.items.map((item, index) => (
          <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-start">
              <GripVertical className="mt-8 hidden h-5 w-5 shrink-0 text-slate-400 lg:block" aria-hidden="true" />
              <div className="grid gap-3 md:grid-cols-2">
                <FieldLabel label={t('layout.commercial.trustRow.icon')} htmlFor={`trust-row-icon-${index}`}>
                  <select
                    id={`trust-row-icon-${index}`}
                    value={item.icon}
                    onChange={(event) => updateItem(index, { icon: event.target.value as TrustRowIcon })}
                    className={INPUT_CLASS}
                  >
                    {TRUST_ROW_ICONS.map((icon) => (
                      <option key={icon} value={icon}>{icon}</option>
                    ))}
                  </select>
                </FieldLabel>
                <label className="flex min-h-11 items-center gap-2 text-sm text-slate-700 md:mt-7">
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    onChange={(event) => updateItem(index, { enabled: event.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>{t('layout.commercial.categoryHub.itemEnabled')}</span>
                </label>
                {textField(index, 'title', t('layout.commercial.trustRow.titlePl'))}
                {textField(index, 'description', t('layout.commercial.trustRow.descriptionPl'))}
                {textField(index, 'titleEn', t('layout.commercial.trustRow.titleEn'))}
                {textField(index, 'descriptionEn', t('layout.commercial.trustRow.descriptionEn'))}
              </div>

              <div className="flex items-center justify-end gap-1 lg:pt-6">
                <button
                  type="button"
                  onClick={() => onChange({ ...trustRow, items: reorder(trustRow.items, index, -1) })}
                  disabled={index === 0}
                  className={ICON_BUTTON_CLASS}
                  aria-label={t('layout.commercial.categoryHub.moveUp')}
                  title={t('layout.commercial.categoryHub.moveUp')}
                >
                  <ChevronUp className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ ...trustRow, items: reorder(trustRow.items, index, 1) })}
                  disabled={index === trustRow.items.length - 1}
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
