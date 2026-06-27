'use client';

import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { BannerImageUploader } from '@/components/blocks/BannerImageUploader';
import { useLanguage } from '@/i18n';
import type { GridBannerBlock, GridItem } from '@/types/config';

interface GridBannerEditorProps {
  block: GridBannerBlock;
  onChange: (block: GridBannerBlock) => void;
}

function defaultItem(): GridItem {
  return {
    id: `grid-item-${Date.now()}`,
    imageUrl: null,
    title: '',
    href: '/products',
    enabled: true,
  };
}

export function GridBannerEditor({ block, onChange }: GridBannerEditorProps) {
  const { t } = useLanguage();

  function updateItem(index: number, partial: Partial<GridItem>) {
    const items = [...block.items];
    items[index] = { ...items[index], ...partial };
    onChange({ ...block, items });
  }

  function addItem() {
    if (block.items.length >= 3) return;
    onChange({ ...block, items: [...block.items, defaultItem()] });
  }

  function removeItem(index: number) {
    onChange({ ...block, items: block.items.filter((_, i) => i !== index) });
  }

  function moveItem(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= block.items.length) return;
    const items = [...block.items];
    [items[index], items[next]] = [items[next], items[index]];
    onChange({ ...block, items });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <span className="text-sm font-medium text-gray-700">{t('homepage.blocks.gridTiles')}</span>
        <span className="text-xs text-gray-400">
          {t('homepage.blocks.itemsSummary').replace('{count}', String(block.items.length))}
        </span>
      </div>

      <div className="space-y-3">
        {block.items.map((item, index) => (
          <div key={item.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    onChange={(e) => updateItem(index, { enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-gray-200 rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4" />
                </label>
                <span className="text-sm font-medium text-gray-700">
                  {t('homepage.blocks.itemLabel').replace('{n}', String(index + 1))}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => moveItem(index, -1)} disabled={index === 0} className="p-1 rounded hover:bg-gray-200 disabled:opacity-30">
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => moveItem(index, 1)} disabled={index === block.items.length - 1} className="p-1 rounded hover:bg-gray-200 disabled:opacity-30">
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => removeItem(index)} className="p-1 rounded hover:bg-red-100 text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <BannerImageUploader
              value={item.imageUrl}
              onChange={(url) => updateItem(index, { imageUrl: url })}
              requiredWidth={400}
              requiredHeight={400}
              label={t('homepage.blocks.tileImage')}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
              <input
                type="text"
                value={item.title}
                onChange={(e) => updateItem(index, { title: e.target.value })}
                placeholder={t('homepage.blocks.labelOptional')}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
              />
              <input
                type="text"
                value={item.href}
                onChange={(e) => updateItem(index, { href: e.target.value })}
                placeholder={t('homepage.blocks.linkUrlRequired')}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
              />
            </div>
          </div>
        ))}
      </div>

      {block.items.length < 3 && (
        <button
          type="button"
          onClick={addItem}
          className="inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
        >
          <Plus className="w-4 h-4" /> {t('homepage.blocks.addTile')}
        </button>
      )}
    </div>
  );
}
