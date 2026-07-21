'use client';

import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2 } from 'lucide-react';

import { FieldLabel } from '@/components/FieldLabel';
import { FormCard } from '@/components/FormCard';
import { CategoryHubConfigEditor } from '@/components/CategoryHubConfigEditor';
import { useLanguage } from '@/i18n';

import type {
  CommercialCollection,
  CommercialCollectionTile,
  CommercialConfig,
  CommercialQuickLink,
  CommercialSurfaceKind,
} from '@/types/config';

const INPUT_CLASS = 'w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none';
const MONO_INPUT_CLASS = `${INPUT_CLASS} font-mono`;
const ROW_CLASS = 'rounded-lg border border-gray-200 bg-gray-50 p-3';
const ICON_BUTTON_CLASS = 'p-1 rounded hover:bg-gray-200 disabled:opacity-30';
const DELETE_BUTTON_CLASS = 'p-1 rounded hover:bg-red-100 text-red-500';

const COMMERCIAL_KINDS: CommercialSurfaceKind[] = ['category', 'collection', 'outlet', 'external'];

function nullableValue(value: string): string | null {
  return value.trim() ? value : null;
}

function reorder<T extends { order: number }>(items: T[], index: number, dir: -1 | 1): T[] {
  const newIndex = index + dir;
  if (newIndex < 0 || newIndex >= items.length) return items;

  const next = [...items];
  [next[index], next[newIndex]] = [next[newIndex], next[index]];
  return next.map((item, order) => ({ ...item, order }));
}

function removeAt<T extends { order: number }>(items: T[], index: number): T[] {
  return items.filter((_, itemIndex) => itemIndex !== index).map((item, order) => ({ ...item, order }));
}

interface CommercialConfigEditorProps {
  commercial: CommercialConfig;
  onChange: (commercial: CommercialConfig) => void;
}

export function CommercialConfigEditor({ commercial, onChange }: CommercialConfigEditorProps) {
  const { t } = useLanguage();

  function updateCommercial(partial: Partial<CommercialConfig>) {
    onChange({ ...commercial, ...partial });
  }

  function updateQuickLink(index: number, partial: Partial<CommercialQuickLink>) {
    const quickLinks = [...commercial.quickLinks];
    quickLinks[index] = { ...quickLinks[index], ...partial };
    updateCommercial({ quickLinks });
  }

  function addQuickLink() {
    updateCommercial({
      quickLinks: [
        ...commercial.quickLinks,
        {
          id: `quick-${Date.now()}`,
          label: t('layout.commercial.newQuickLink'),
          href: '/products',
          kind: 'collection',
          description: null,
          imageUrl: null,
          enabled: true,
          order: commercial.quickLinks.length,
        },
      ],
    });
  }

  function updateCollection(index: number, partial: Partial<CommercialCollection>) {
    const collections = [...commercial.collections];
    collections[index] = { ...collections[index], ...partial };
    updateCommercial({ collections });
  }

  function addCollection() {
    updateCommercial({
      collections: [
        ...commercial.collections,
        {
          slug: `collection-${commercial.collections.length + 1}`,
          title: t('layout.commercial.newCollection'),
          subtitle: null,
          heroImageUrl: null,
          enabled: true,
          order: commercial.collections.length,
          tiles: [],
        },
      ],
    });
  }

  function updateTile(collectionIndex: number, tileIndex: number, partial: Partial<CommercialCollectionTile>) {
    const collections = [...commercial.collections];
    const collection = collections[collectionIndex];
    const tiles = [...collection.tiles];
    tiles[tileIndex] = { ...tiles[tileIndex], ...partial };
    collections[collectionIndex] = { ...collection, tiles };
    updateCommercial({ collections });
  }

  function addTile(collectionIndex: number) {
    const collections = [...commercial.collections];
    const collection = collections[collectionIndex];
    collections[collectionIndex] = {
      ...collection,
      tiles: [
        ...collection.tiles,
        {
          id: `tile-${Date.now()}`,
          title: t('layout.commercial.newTile'),
          href: '/products',
          description: null,
          imageUrl: null,
          enabled: true,
          order: collection.tiles.length,
        },
      ],
    };
    updateCommercial({ collections });
  }

  function removeTile(collectionIndex: number, tileIndex: number) {
    const collections = [...commercial.collections];
    const collection = collections[collectionIndex];
    collections[collectionIndex] = {
      ...collection,
      tiles: removeAt(collection.tiles, tileIndex),
    };
    updateCommercial({ collections });
  }

  function moveTile(collectionIndex: number, tileIndex: number, dir: -1 | 1) {
    const collections = [...commercial.collections];
    const collection = collections[collectionIndex];
    collections[collectionIndex] = {
      ...collection,
      tiles: reorder(collection.tiles, tileIndex, dir),
    };
    updateCommercial({ collections });
  }

  const outletCollectionMissing = commercial.outlet.enabled && !commercial.outlet.collectionSlug;

  return (
    <FormCard title={t('layout.commercial.title')} description={t('layout.commercial.description')}>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={commercial.enabled}
          onChange={(event) => updateCommercial({ enabled: event.target.checked })}
          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span className="text-sm text-gray-700">{t('layout.commercial.enable')}</span>
      </label>

      <CategoryHubConfigEditor
        categoryHub={commercial.categoryHub}
        onChange={(categoryHub) => updateCommercial({ categoryHub })}
      />

      <section className="space-y-2 border-t border-gray-100 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{t('layout.commercial.quickLinks')}</h3>
            <p className="text-xs text-gray-500">{t('layout.commercial.quickLinksHint')}</p>
          </div>
          <button type="button" onClick={addQuickLink} className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800">
            <Plus className="w-4 h-4" /> {t('layout.commercial.addQuickLink')}
          </button>
        </div>

        {commercial.quickLinks.map((item, index) => (
          <div key={item.id} className={ROW_CLASS}>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[auto_auto_1fr_1fr_150px_auto] lg:items-center">
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-gray-400" />
                <input
                  type="checkbox"
                  checked={item.enabled}
                  onChange={(event) => updateQuickLink(index, { enabled: event.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600"
                  aria-label={t('layout.commercial.enabled')}
                />
              </div>
              <select
                value={item.kind}
                onChange={(event) => updateQuickLink(index, { kind: event.target.value as CommercialSurfaceKind })}
                className={INPUT_CLASS}
                aria-label={t('layout.commercial.kind')}
              >
                {COMMERCIAL_KINDS.map((kind) => (
                  <option key={kind} value={kind}>{t(`layout.commercial.kinds.${kind}`)}</option>
                ))}
              </select>
              <input
                type="text"
                value={item.label}
                onChange={(event) => updateQuickLink(index, { label: event.target.value })}
                placeholder={t('layout.commercial.label')}
                className={INPUT_CLASS}
              />
              <input
                type="text"
                value={item.href}
                onChange={(event) => updateQuickLink(index, { href: event.target.value })}
                placeholder="/outlet"
                className={MONO_INPUT_CLASS}
              />
              <input
                type="text"
                value={item.imageUrl ?? ''}
                onChange={(event) => updateQuickLink(index, { imageUrl: nullableValue(event.target.value) })}
                placeholder={t('layout.commercial.imageUrl')}
                className={MONO_INPUT_CLASS}
              />
              <div className="flex items-center gap-0.5">
                <button type="button" onClick={() => updateCommercial({ quickLinks: reorder(commercial.quickLinks, index, -1) })} disabled={index === 0} className={ICON_BUTTON_CLASS}><ChevronUp className="w-3.5 h-3.5" /></button>
                <button type="button" onClick={() => updateCommercial({ quickLinks: reorder(commercial.quickLinks, index, 1) })} disabled={index === commercial.quickLinks.length - 1} className={ICON_BUTTON_CLASS}><ChevronDown className="w-3.5 h-3.5" /></button>
                <button type="button" onClick={() => updateCommercial({ quickLinks: removeAt(commercial.quickLinks, index) })} className={DELETE_BUTTON_CLASS}><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <input
              type="text"
              value={item.description ?? ''}
              onChange={(event) => updateQuickLink(index, { description: nullableValue(event.target.value) })}
              placeholder={t('layout.commercial.descriptionPlaceholder')}
              className={`${INPUT_CLASS} mt-2`}
            />
          </div>
        ))}
      </section>

      <section className="space-y-3 border-t border-gray-100 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{t('layout.commercial.collections')}</h3>
            <p className="text-xs text-gray-500">{t('layout.commercial.collectionsHint')}</p>
          </div>
          <button type="button" onClick={addCollection} className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800">
            <Plus className="w-4 h-4" /> {t('layout.commercial.addCollection')}
          </button>
        </div>

        {commercial.collections.map((collection, collectionIndex) => (
          <div key={collection.slug} className={ROW_CLASS}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={collection.enabled}
                  onChange={(event) => updateCollection(collectionIndex, { enabled: event.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600"
                />
                <span className="text-sm text-gray-700">{t('layout.commercial.collectionEnabled')}</span>
              </label>
              <div className="flex items-center gap-0.5">
                <button type="button" onClick={() => updateCommercial({ collections: reorder(commercial.collections, collectionIndex, -1) })} disabled={collectionIndex === 0} className={ICON_BUTTON_CLASS}><ChevronUp className="w-3.5 h-3.5" /></button>
                <button type="button" onClick={() => updateCommercial({ collections: reorder(commercial.collections, collectionIndex, 1) })} disabled={collectionIndex === commercial.collections.length - 1} className={ICON_BUTTON_CLASS}><ChevronDown className="w-3.5 h-3.5" /></button>
                <button type="button" onClick={() => updateCommercial({ collections: removeAt(commercial.collections, collectionIndex) })} className={DELETE_BUTTON_CLASS}><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FieldLabel label={t('layout.commercial.collectionTitle')}>
                <input type="text" value={collection.title} onChange={(event) => updateCollection(collectionIndex, { title: event.target.value })} className={INPUT_CLASS} />
              </FieldLabel>
              <FieldLabel label={t('layout.commercial.slug')} hint={t('layout.commercial.slugHint')}>
                <input type="text" value={collection.slug} onChange={(event) => updateCollection(collectionIndex, { slug: event.target.value })} className={MONO_INPUT_CLASS} />
              </FieldLabel>
              <FieldLabel label={t('layout.commercial.subtitle')}>
                <input type="text" value={collection.subtitle ?? ''} onChange={(event) => updateCollection(collectionIndex, { subtitle: nullableValue(event.target.value) })} className={INPUT_CLASS} />
              </FieldLabel>
              <FieldLabel label={t('layout.commercial.heroImageUrl')}>
                <input type="text" value={collection.heroImageUrl ?? ''} onChange={(event) => updateCollection(collectionIndex, { heroImageUrl: nullableValue(event.target.value) })} className={MONO_INPUT_CLASS} />
              </FieldLabel>
            </div>

            <div className="mt-4 space-y-2 border-t border-gray-200 pt-3">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('layout.commercial.tiles')}</h4>
                <button type="button" onClick={() => addTile(collectionIndex)} className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800">
                  <Plus className="w-3.5 h-3.5" /> {t('layout.commercial.addTile')}
                </button>
              </div>
              {collection.tiles.map((tile, tileIndex) => (
                <div key={tile.id} className="grid grid-cols-1 gap-2 rounded-md bg-white p-2 sm:grid-cols-[auto_1fr_1fr_auto] sm:items-center">
                  <input
                    type="checkbox"
                    checked={tile.enabled}
                    onChange={(event) => updateTile(collectionIndex, tileIndex, { enabled: event.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600"
                    aria-label={t('layout.commercial.enabled')}
                  />
                  <input type="text" value={tile.title} onChange={(event) => updateTile(collectionIndex, tileIndex, { title: event.target.value })} placeholder={t('layout.commercial.tileTitle')} className={INPUT_CLASS} />
                  <input type="text" value={tile.href} onChange={(event) => updateTile(collectionIndex, tileIndex, { href: event.target.value })} placeholder="/categories/kimchi" className={MONO_INPUT_CLASS} />
                  <div className="flex items-center gap-0.5">
                    <button type="button" onClick={() => moveTile(collectionIndex, tileIndex, -1)} disabled={tileIndex === 0} className={ICON_BUTTON_CLASS}><ChevronUp className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={() => moveTile(collectionIndex, tileIndex, 1)} disabled={tileIndex === collection.tiles.length - 1} className={ICON_BUTTON_CLASS}><ChevronDown className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={() => removeTile(collectionIndex, tileIndex)} className={DELETE_BUTTON_CLASS}><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  <input type="text" value={tile.imageUrl ?? ''} onChange={(event) => updateTile(collectionIndex, tileIndex, { imageUrl: nullableValue(event.target.value) })} placeholder={t('layout.commercial.imageUrl')} className={`${MONO_INPUT_CLASS} sm:col-span-2`} />
                  <input type="text" value={tile.description ?? ''} onChange={(event) => updateTile(collectionIndex, tileIndex, { description: nullableValue(event.target.value) })} placeholder={t('layout.commercial.descriptionPlaceholder')} className={`${INPUT_CLASS} sm:col-span-2`} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-3 border-t border-gray-100 pt-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{t('layout.commercial.outlet')}</h3>
          <p className="text-xs text-gray-500">{t('layout.commercial.outletHint')}</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr_1fr] sm:items-end">
          <label className="flex items-center gap-2 cursor-pointer pb-2">
            <input
              type="checkbox"
              checked={commercial.outlet.enabled}
              onChange={(event) => updateCommercial({ outlet: { ...commercial.outlet, enabled: event.target.checked } })}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600"
            />
            <span className="text-sm text-gray-700">{t('layout.commercial.outletEnabled')}</span>
          </label>
          <FieldLabel label={t('layout.commercial.outletLabel')}>
            <input
              type="text"
              value={commercial.outlet.label}
              onChange={(event) => updateCommercial({ outlet: { ...commercial.outlet, label: event.target.value } })}
              className={INPUT_CLASS}
            />
          </FieldLabel>
          <FieldLabel label={t('layout.commercial.outletCollection')}>
            <select
              value={commercial.outlet.collectionSlug ?? ''}
              onChange={(event) => updateCommercial({ outlet: { ...commercial.outlet, collectionSlug: nullableValue(event.target.value) } })}
              className={INPUT_CLASS}
            >
              <option value="">{t('layout.commercial.noCollection')}</option>
              {commercial.collections.map((collection) => (
                <option key={collection.slug} value={collection.slug}>{collection.title}</option>
              ))}
            </select>
          </FieldLabel>
        </div>

        {outletCollectionMissing && (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {t('layout.commercial.outletMissingCollection')}
          </p>
        )}
      </section>
    </FormCard>
  );
}
