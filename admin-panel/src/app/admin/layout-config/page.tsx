'use client';

import { useConfig } from '@/hooks/use-config';
import { PageHeader } from '@/components/PageHeader';
import { FormCard } from '@/components/FormCard';
import { FieldLabel } from '@/components/FieldLabel';
import { SaveBar } from '@/components/SaveBar';
import { CommercialConfigEditor } from '@/components/CommercialConfigEditor';
import { Loader2, Plus, Trash2, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';
import type { CommercialConfig, LayoutConfig, NavItem, FooterColumn } from '@/types/config';
import { useLanguage } from '@/i18n';

export default function LayoutConfigPage() {
  const { config, loading, saving, publishing, isDirty, error, lastSaved, updateConfig, save, publish, canUndo, canRedo, undo, redo } = useConfig();
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 py-12 justify-center">
        <Loader2 className="w-5 h-5 animate-spin" /> {t('common.loading')}
      </div>
    );
  }

  const layout = config.layout;

  function updateLayout(partial: Partial<LayoutConfig>) {
    updateConfig(prev => ({ ...prev, layout: { ...prev.layout, ...partial } }));
  }

  function updateCommercial(commercial: CommercialConfig) {
    updateConfig(prev => ({ ...prev, commercial }));
  }

  // --- Header Nav ---
  function updateNavItem(index: number, partial: Partial<NavItem>) {
    const navItems = [...layout.header.navItems];
    navItems[index] = { ...navItems[index], ...partial };
    updateLayout({ header: { ...layout.header, navItems } });
  }

  function addNavItem() {
    const navItems = [...layout.header.navItems, {
      label: 'New Link',
      href: '/',
      enabled: true,
      order: layout.header.navItems.length,
    }];
    updateLayout({ header: { ...layout.header, navItems } });
  }

  function removeNavItem(index: number) {
    const navItems = layout.header.navItems.filter((_, i) => i !== index).map((item, i) => ({ ...item, order: i }));
    updateLayout({ header: { ...layout.header, navItems } });
  }

  function moveNavItem(index: number, dir: -1 | 1) {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= layout.header.navItems.length) return;
    const navItems = [...layout.header.navItems];
    [navItems[index], navItems[newIndex]] = [navItems[newIndex], navItems[index]];
    updateLayout({ header: { ...layout.header, navItems: navItems.map((n, i) => ({ ...n, order: i })) } });
  }

  // --- Footer ---
  function updateFooterField(field: string, value: string) {
    updateLayout({ footer: { ...layout.footer, [field]: value } });
  }

  function updateFooterColumn(colIndex: number, partial: Partial<FooterColumn>) {
    const columns = [...layout.footer.columns];
    columns[colIndex] = { ...columns[colIndex], ...partial };
    updateLayout({ footer: { ...layout.footer, columns } });
  }

  function addFooterColumn() {
    const columns = [...layout.footer.columns, { title: 'New Column', links: [] }];
    updateLayout({ footer: { ...layout.footer, columns } });
  }

  function removeFooterColumn(colIndex: number) {
    const columns = layout.footer.columns.filter((_, i) => i !== colIndex);
    updateLayout({ footer: { ...layout.footer, columns } });
  }

  function addFooterLink(colIndex: number) {
    const columns = [...layout.footer.columns];
    columns[colIndex] = {
      ...columns[colIndex],
      links: [...columns[colIndex].links, { label: 'New Link', href: '#' }],
    };
    updateLayout({ footer: { ...layout.footer, columns } });
  }

  function updateFooterLink(colIndex: number, linkIndex: number, field: 'label' | 'href', value: string) {
    const columns = [...layout.footer.columns];
    const links = [...columns[colIndex].links];
    links[linkIndex] = { ...links[linkIndex], [field]: value };
    columns[colIndex] = { ...columns[colIndex], links };
    updateLayout({ footer: { ...layout.footer, columns } });
  }

  function removeFooterLink(colIndex: number, linkIndex: number) {
    const columns = [...layout.footer.columns];
    columns[colIndex] = {
      ...columns[colIndex],
      links: columns[colIndex].links.filter((_, i) => i !== linkIndex),
    };
    updateLayout({ footer: { ...layout.footer, columns } });
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="flex-1 space-y-6 pb-6">
        <PageHeader title={t('layout.title')} description={t('layout.description')} />

        {/* Header Toggles */}
        <FormCard title={t('layout.header.title')}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {([
              ['showSearch', t('layout.header.showSearch')],
              ['showWishlist', t('layout.header.showWishlist')],
              ['showLanguageSwitcher', t('layout.header.showLanguage')],
              ['showThemeToggle', t('layout.header.showTheme')],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={layout.header[key]}
                  onChange={(e) => updateLayout({ header: { ...layout.header, [key]: e.target.checked } })}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </FormCard>

        {/* Nav Items */}
        <FormCard title={t('layout.header.navTitle')} description={t('layout.header.navDescription')}>
          <div className="space-y-2">
            {layout.header.navItems.map((item, index) => (
              <div key={index} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <GripVertical className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type="checkbox"
                  checked={item.enabled}
                  onChange={(e) => updateNavItem(index, { enabled: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 shrink-0"
                />
                <input
                  type="text"
                  value={item.label}
                  onChange={(e) => updateNavItem(index, { label: e.target.value })}
                  placeholder={t('layout.header.navLabelPlaceholder')}
                  className="flex-1 min-w-0 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-indigo-400 outline-none"
                />
                <input
                  type="text"
                  value={item.href}
                  onChange={(e) => updateNavItem(index, { href: e.target.value })}
                  placeholder={t('layout.header.navPathPlaceholder')}
                  className="flex-1 min-w-0 rounded-md border border-gray-300 px-2 py-1 text-sm font-mono focus:border-indigo-400 outline-none"
                />
                <div className="flex items-center gap-0.5 shrink-0">
                  <button type="button" onClick={() => moveNavItem(index, -1)} disabled={index === 0} className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"><ChevronUp className="w-3.5 h-3.5" /></button>
                  <button type="button" onClick={() => moveNavItem(index, 1)} disabled={index === layout.header.navItems.length - 1} className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"><ChevronDown className="w-3.5 h-3.5" /></button>
                  <button type="button" onClick={() => removeNavItem(index)} className="p-1 rounded hover:bg-red-100 text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={addNavItem} className="mt-2 inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800">
            <Plus className="w-4 h-4" /> {t('layout.header.addNavItem')}
          </button>
        </FormCard>

        <CommercialConfigEditor commercial={config.commercial} onChange={updateCommercial} />

        {/* Header CTA Button */}
        <FormCard title={t('layout.header.ctaTitle')} description={t('layout.header.ctaDescription')}>
          <div className="flex items-center gap-3 mb-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={layout.header.cta?.enabled ?? false}
                onChange={(e) => updateLayout({ header: { ...layout.header, cta: { text: '', link: '', ...layout.header.cta, enabled: e.target.checked } } })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
            </label>
            <span className="text-sm text-gray-700">{layout.header.cta?.enabled ? t('common.enabled') : t('common.disabled')}</span>
          </div>
          {layout.header.cta?.enabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldLabel label={t('layout.header.ctaButtonText')}>
                <input
                  type="text"
                  value={layout.header.cta?.text ?? ''}
                  onChange={(e) => updateLayout({ header: { ...layout.header, cta: { link: '', enabled: false, ...layout.header.cta, text: e.target.value } } })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
                  placeholder="Shop Now"
                />
              </FieldLabel>
              <FieldLabel label={t('layout.header.ctaButtonLink')}>
                <input
                  type="text"
                  value={layout.header.cta?.link ?? ''}
                  onChange={(e) => updateLayout({ header: { ...layout.header, cta: { text: '', enabled: false, ...layout.header.cta, link: e.target.value } } })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
                  placeholder="/products"
                />
              </FieldLabel>
            </div>
          )}
        </FormCard>

        {/* Display Positions & Price Config */}
        <FormCard title={t('layout.display.title')}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <FieldLabel label={t('layout.display.pricePosition')} hint={t('layout.display.pricePositionHint')}>
              <div className="space-y-2">
                {(['below-image', 'overlay', 'inline'] as const).map(opt => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="pricePosition"
                      value={opt}
                      checked={(layout.priceDisplay?.position ?? 'below-image') === opt}
                      onChange={() => updateLayout({ priceDisplay: { showDiscountBadge: true, showOriginalPrice: true, ...layout.priceDisplay, position: opt } })}
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700 capitalize">{t(`layout.display.${opt.replace('-', '')}` as string) || opt.replace('-', ' ')}</span>
                  </label>
                ))}
              </div>
            </FieldLabel>
            <FieldLabel label={t('layout.display.bannerPosition')} hint={t('layout.display.bannerPositionHint')}>
              <div className="space-y-2">
                {(['below-hero', 'above-products'] as const).map(opt => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="bannerPosition"
                      value={opt}
                      checked={layout.bannerPosition === opt}
                      onChange={() => updateLayout({ bannerPosition: opt })}
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700 capitalize">{opt === 'below-hero' ? t('layout.display.belowHero') : t('layout.display.aboveProducts')}</span>
                  </label>
                ))}
              </div>
            </FieldLabel>
          </div>
          <div className="mt-5 pt-4 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-700 mb-3">{t('layout.display.priceOptions')}</p>
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={layout.priceDisplay?.showDiscountBadge ?? true}
                  onChange={(e) => updateLayout({ priceDisplay: { position: 'below-image', showOriginalPrice: true, ...layout.priceDisplay, showDiscountBadge: e.target.checked } })}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">{t('layout.display.showDiscount')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={layout.priceDisplay?.showOriginalPrice ?? true}
                  onChange={(e) => updateLayout({ priceDisplay: { position: 'below-image', showDiscountBadge: true, ...layout.priceDisplay, showOriginalPrice: e.target.checked } })}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">{t('layout.display.showOriginalPrice')}</span>
              </label>
            </div>
          </div>
        </FormCard>

        {/* Footer */}
        <FormCard title={t('layout.footer.title')}>
          <FieldLabel label={t('layout.footer.tagline')}>
            <input
              type="text"
              value={layout.footer.tagline}
              onChange={(e) => updateFooterField('tagline', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
            />
          </FieldLabel>
          <FieldLabel label={t('layout.footer.copyrightText')} hint={t('layout.footer.copyrightHint')}>
            <input
              type="text"
              value={layout.footer.copyrightText}
              onChange={(e) => updateFooterField('copyrightText', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
            />
          </FieldLabel>
        </FormCard>

        {/* Footer Columns */}
        <FormCard title={t('layout.footer.columnsTitle')} description={t('layout.footer.columnsDescription')}>
          <div className="space-y-4">
            {layout.footer.columns.map((col, colIndex) => (
              <div key={colIndex} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <input
                    type="text"
                    value={col.title}
                    onChange={(e) => updateFooterColumn(colIndex, { title: e.target.value })}
                    className="rounded-md border border-gray-300 px-2 py-1 text-sm font-medium focus:border-indigo-400 outline-none"
                    placeholder={t('layout.footer.columnPlaceholder')}
                  />
                  <button type="button" onClick={() => removeFooterColumn(colIndex)} className="p-1 rounded hover:bg-red-100 text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="space-y-1.5">
                  {col.links.map((link, linkIndex) => (
                    <div key={linkIndex} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={link.label}
                        onChange={(e) => updateFooterLink(colIndex, linkIndex, 'label', e.target.value)}
                        placeholder={t('layout.footer.labelPlaceholder')}
                        className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-indigo-400 outline-none"
                      />
                      <input
                        type="text"
                        value={link.href}
                        onChange={(e) => updateFooterLink(colIndex, linkIndex, 'href', e.target.value)}
                        placeholder={t('layout.footer.pathPlaceholder')}
                        className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm font-mono focus:border-indigo-400 outline-none"
                      />
                      <button type="button" onClick={() => removeFooterLink(colIndex, linkIndex)} className="p-1 rounded hover:bg-red-100 text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => addFooterLink(colIndex)} className="mt-2 inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800">
                  <Plus className="w-3.5 h-3.5" /> {t('layout.footer.addLink')}
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addFooterColumn} className="mt-3 inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800">
            <Plus className="w-4 h-4" /> {t('layout.footer.addColumn')}
          </button>
        </FormCard>
      </div>

      <SaveBar isDirty={isDirty} saving={saving} publishing={publishing} lastSaved={lastSaved} error={error} onSave={save} onPublish={publish} canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo} />
    </div>
  );
}
