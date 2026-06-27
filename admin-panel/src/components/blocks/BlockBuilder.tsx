'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, Monitor, LayoutTemplate, Grid2x2, Circle, PanelRight, Bell } from 'lucide-react';
import { HeroBannerEditor } from '@/components/blocks/HeroBannerEditor';
import { HorizontalBannerEditor } from '@/components/blocks/HorizontalBannerEditor';
import { GridBannerEditor } from '@/components/blocks/GridBannerEditor';
import { RoundGridBannerEditor } from '@/components/blocks/RoundGridBannerEditor';
import { SidebarBannerEditor } from '@/components/blocks/SidebarBannerEditor';
import { SmallStickyBannerEditor } from '@/components/blocks/SmallStickyBannerEditor';
import { useLanguage } from '@/i18n';
import type {
  BannerBlock,
  HeroBannerBlock,
  HorizontalBannerBlock,
  GridBannerBlock,
  RoundGridBannerBlock,
  SidebarBannerBlock,
  SmallStickyBannerBlock,
} from '@/types/config';

interface BlockBuilderProps {
  blocks: BannerBlock[];
  onChange: (blocks: BannerBlock[]) => void;
}

const BLOCK_META: Record<BannerBlock['type'], { labelKey: string; descriptionKey: string; hint: string; icon: React.ReactNode }> = {
  hero: {
    labelKey: 'homepage.blocks.meta.hero.label',
    descriptionKey: 'homepage.blocks.meta.hero.description',
    hint: '1920 × 600 px',
    icon: <Monitor className="w-5 h-5" />,
  },
  horizontal: {
    labelKey: 'homepage.blocks.meta.horizontal.label',
    descriptionKey: 'homepage.blocks.meta.horizontal.description',
    hint: '1200 × 300 px',
    icon: <LayoutTemplate className="w-5 h-5" />,
  },
  grid: {
    labelKey: 'homepage.blocks.meta.grid.label',
    descriptionKey: 'homepage.blocks.meta.grid.description',
    hint: '400 × 400 px per tile',
    icon: <Grid2x2 className="w-5 h-5" />,
  },
  round_grid: {
    labelKey: 'homepage.blocks.meta.roundGrid.label',
    descriptionKey: 'homepage.blocks.meta.roundGrid.description',
    hint: '400 × 400 px per tile (circle crop)',
    icon: <Circle className="w-5 h-5" />,
  },
  sidebar: {
    labelKey: 'homepage.blocks.meta.sidebar.label',
    descriptionKey: 'homepage.blocks.meta.sidebar.description',
    hint: '300 × 600 px',
    icon: <PanelRight className="w-5 h-5" />,
  },
  small_sticky: {
    labelKey: 'homepage.blocks.meta.smallSticky.label',
    descriptionKey: 'homepage.blocks.meta.smallSticky.description',
    hint: '728×90 px desktop · 320×50 px mobile',
    icon: <Bell className="w-5 h-5" />,
  },
};

function createBlock(type: BannerBlock['type'], order: number, defaultCtaText: string): BannerBlock {
  const id = `block-${type}-${Date.now()}`;
  if (type === 'hero') {
    return {
      id, type: 'hero', enabled: true, order, autoPlay: true, autoPlayInterval: 4000,
      slides: [{ id: `slide-${Date.now()}`, imageUrl: null, mobileImageUrl: null, title: '', ctaText: defaultCtaText, ctaLink: '/products', enabled: true }],
    } satisfies HeroBannerBlock;
  }
  if (type === 'horizontal') {
    return { id, type: 'horizontal', enabled: true, order, imageUrl: null, mobileImageUrl: null, title: '', ctaText: '', ctaLink: '' } satisfies HorizontalBannerBlock;
  }
  if (type === 'grid') {
    return { id, type: 'grid', enabled: true, order, columns: 3, items: [] } satisfies GridBannerBlock;
  }
  if (type === 'round_grid') {
    return { id, type: 'round_grid', enabled: true, order, columns: 3, items: [] } satisfies RoundGridBannerBlock;
  }
  if (type === 'sidebar') {
    return { id, type: 'sidebar', enabled: true, order, imageUrl: null, title: '', ctaText: '', ctaLink: '' } satisfies SidebarBannerBlock;
  }
  return {
    id, type: 'small_sticky', enabled: true, order,
    desktopImageUrl: null, mobileImageUrl: null,
    title: '', ctaText: '', ctaLink: '',
    position: 'top', dismissible: true,
  } satisfies SmallStickyBannerBlock;
}

const KNOWN_TYPES = new Set<string>(['hero', 'horizontal', 'grid', 'round_grid', 'sidebar', 'small_sticky']);

export function BlockBuilder({ blocks, onChange }: BlockBuilderProps) {
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const { t } = useLanguage();

  useEffect(() => {
    const filtered = blocks.filter((b) => KNOWN_TYPES.has(b.type));
    if (filtered.length !== blocks.length) {
      onChange(filtered as BannerBlock[]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addBlock(type: BannerBlock['type']) {
    onChange([...blocks, createBlock(type, blocks.length, t('homepage.blocks.defaultCtaText'))].map((b, i) => ({ ...b, order: i })));
    setShowTypePicker(false);
  }

  function removeBlock(id: string) {
    onChange(blocks.filter((b) => b.id !== id).map((b, i) => ({ ...b, order: i })));
  }

  function moveBlock(index: number, dir: -1 | 1) {
    const ni = index + dir;
    if (ni < 0 || ni >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[ni]] = [next[ni], next[index]];
    onChange(next.map((b, i) => ({ ...b, order: i })));
  }

  function updateBlock(updated: BannerBlock) {
    onChange(blocks.map((b) => (b.id === updated.id ? updated : b)));
  }

  function toggleEnabled(id: string) {
    onChange(blocks.map((b) => (b.id === id ? { ...b, enabled: !b.enabled } : b)));
  }

  return (
    <div className="space-y-3">
      {blocks.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 py-10 text-center text-sm text-gray-500">
          {t('homepage.blocks.empty')}
        </div>
      )}

      {blocks.map((block, index) => {
        const meta = BLOCK_META[block.type];
        if (!meta) return null;
        const isCollapsed = collapsed[block.id] ?? false;
        return (
          <div
            key={block.id}
            className={`rounded-xl border bg-white shadow-sm ${block.enabled ? 'border-gray-200' : 'border-gray-200 opacity-60'}`}
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
              <button
                type="button"
                onClick={() => setCollapsed((p) => ({ ...p, [block.id]: !p[block.id] }))}
                className="flex-1 flex items-center gap-3 text-left min-w-0"
                aria-expanded={!isCollapsed}
              >
                <span className="text-indigo-500 shrink-0">{meta.icon}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{t(meta.labelKey)}</p>
                  <p className="text-xs text-gray-400 font-mono">{meta.hint}</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 ml-auto shrink-0 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} />
              </button>

              <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-1">
                <input type="checkbox" checked={block.enabled} onChange={() => toggleEnabled(block.id)} className="sr-only peer" />
                <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
              </label>

              <div className="flex items-center gap-0.5 shrink-0">
                <button type="button" onClick={() => moveBlock(index, -1)} disabled={index === 0} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30" title={t('common.moveUp')}><ChevronUp className="w-4 h-4 text-gray-500" /></button>
                <button type="button" onClick={() => moveBlock(index, 1)} disabled={index === blocks.length - 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30" title={t('common.moveDown')}><ChevronDown className="w-4 h-4 text-gray-500" /></button>
                <button type="button" onClick={() => removeBlock(block.id)} className="p-1 rounded hover:bg-red-50 text-red-500" title={t('common.delete')}><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>

            {!isCollapsed && (
              <div className="p-4">
                {block.type === 'hero' && <HeroBannerEditor block={block} onChange={updateBlock} />}
                {block.type === 'horizontal' && <HorizontalBannerEditor block={block} onChange={updateBlock} />}
                {block.type === 'grid' && <GridBannerEditor block={block} onChange={updateBlock} />}
                {block.type === 'round_grid' && <RoundGridBannerEditor block={block} onChange={updateBlock} />}
                {block.type === 'sidebar' && <SidebarBannerEditor block={block} onChange={updateBlock} />}
                {block.type === 'small_sticky' && <SmallStickyBannerEditor block={block} onChange={updateBlock} />}
              </div>
            )}
          </div>
        );
      })}

      <div className="relative">
        <button
          type="button"
          onClick={() => setShowTypePicker((v) => !v)}
          className="inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2.5 text-sm text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
        >
          <Plus className="w-4 h-4" /> {t('homepage.blocks.addBlock')}
        </button>

        {showTypePicker && (
          <div className="mt-3 grid gap-2 rounded-xl border border-gray-200 bg-white p-2 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
            {(Object.entries(BLOCK_META) as [BannerBlock['type'], typeof BLOCK_META[BannerBlock['type']]][]).map(([type, meta]) => (
              <button
                key={type}
                type="button"
                onClick={() => addBlock(type)}
                className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-colors"
              >
                <span className="mt-0.5 text-indigo-500 shrink-0">{meta.icon}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{t(meta.labelKey)}</p>
                  <p className="text-xs text-gray-500">{t(meta.descriptionKey)}</p>
                  <p className="text-xs text-indigo-500 font-mono mt-0.5">{meta.hint}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
