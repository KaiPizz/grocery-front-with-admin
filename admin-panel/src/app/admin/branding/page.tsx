'use client';

import { useState } from 'react';
import { useConfig } from '@/hooks/use-config';
import { PageHeader } from '@/components/PageHeader';
import { FormCard } from '@/components/FormCard';
import { FieldLabel } from '@/components/FieldLabel';
import { SaveBar } from '@/components/SaveBar';
import { ImageUploader } from '@/components/ImageUploader';
import { ColorPicker } from '@/components/ColorPicker';
import { resolvePreviewImageUrl } from '@/lib/preview-image-url';
import { Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import type { BrandingConfig } from '@/types/config';
import { useLanguage } from '@/i18n';

type ColorKey = keyof BrandingConfig['colors'];
interface ColorDef { key: ColorKey; label: string; hint: string; usedIn: string }

export default function BrandingPage() {
  const { config, loading, saving, publishing, isDirty, error, lastSaved, updateConfig, save, publish, canUndo, canRedo, undo, redo } = useConfig();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);
  const { t } = useLanguage();

  const BRAND_COLORS: ColorDef[] = [
    { key: 'primary', label: t('branding.colors.primary.label'), hint: t('branding.colors.primary.hint'), usedIn: t('branding.colors.primary.usedIn') },
    { key: 'primaryHover', label: t('branding.colors.primaryHover.label'), hint: t('branding.colors.primaryHover.hint'), usedIn: t('branding.colors.primaryHover.usedIn') },
  ];
  const BUTTON_COLORS: ColorDef[] = [
    { key: 'checkoutBtnColor', label: t('branding.colors.checkoutBtnColor.label'), hint: t('branding.colors.checkoutBtnColor.hint'), usedIn: t('branding.colors.checkoutBtnColor.usedIn') },
    { key: 'checkoutBtnHoverColor', label: t('branding.colors.checkoutBtnHoverColor.label'), hint: t('branding.colors.checkoutBtnHoverColor.hint'), usedIn: t('branding.colors.checkoutBtnHoverColor.usedIn') },
  ];
  const PAGE_COLORS: ColorDef[] = [
    { key: 'background', label: t('branding.colors.background.label'), hint: t('branding.colors.background.hint'), usedIn: t('branding.colors.background.usedIn') },
    { key: 'foreground', label: t('branding.colors.foreground.label'), hint: t('branding.colors.foreground.hint'), usedIn: t('branding.colors.foreground.usedIn') },
    { key: 'accent', label: t('branding.colors.accent.label'), hint: t('branding.colors.accent.hint'), usedIn: t('branding.colors.accent.usedIn') },
    { key: 'accentForeground', label: t('branding.colors.accentForeground.label'), hint: t('branding.colors.accentForeground.hint'), usedIn: t('branding.colors.accentForeground.usedIn') },
  ];
  const COMPONENT_COLORS: ColorDef[] = [
    { key: 'muted', label: t('branding.colors.muted.label'), hint: t('branding.colors.muted.hint'), usedIn: t('branding.colors.muted.usedIn') },
    { key: 'mutedForeground', label: t('branding.colors.mutedForeground.label'), hint: t('branding.colors.mutedForeground.hint'), usedIn: t('branding.colors.mutedForeground.usedIn') },
    { key: 'border', label: t('branding.colors.border.label'), hint: t('branding.colors.border.hint'), usedIn: t('branding.colors.border.usedIn') },
    { key: 'card', label: t('branding.colors.card.label'), hint: t('branding.colors.card.hint'), usedIn: t('branding.colors.card.usedIn') },
    { key: 'cardForeground', label: t('branding.colors.cardForeground.label'), hint: t('branding.colors.cardForeground.hint'), usedIn: t('branding.colors.cardForeground.usedIn') },
    { key: 'destructive', label: t('branding.colors.destructive.label'), hint: t('branding.colors.destructive.hint'), usedIn: t('branding.colors.destructive.usedIn') },
    { key: 'ring', label: t('branding.colors.ring.label'), hint: t('branding.colors.ring.hint'), usedIn: t('branding.colors.ring.usedIn') },
  ];

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 py-12 justify-center">
        <Loader2 className="w-5 h-5 animate-spin" /> {t('common.loading')}
      </div>
    );
  }

  const branding = config.branding;
  const logoPreviewUrl = resolvePreviewImageUrl(branding.logoUrl);

  function updateBranding(partial: Partial<BrandingConfig>) {
    updateConfig(prev => ({
      ...prev,
      branding: { ...prev.branding, ...partial },
    }));
  }

  function updateColor(key: keyof BrandingConfig['colors'], value: string) {
    updateConfig(prev => ({
      ...prev,
      branding: {
        ...prev.branding,
        colors: { ...prev.branding.colors, [key]: value },
      },
    }));
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="flex-1 space-y-6 pb-6">
        <PageHeader title={t('branding.title')} description={t('branding.description')} />

        <FormCard title={t('branding.identity.title')}>
          <FieldLabel label={t('branding.identity.storeName')}>
            <input
              type="text"
              value={branding.storeName}
                  onChange={(e) => updateBranding({ storeName: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
                  placeholder={t('branding.identity.storeNamePlaceholder')}
                />
              </FieldLabel>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ImageUploader
              label={t('branding.identity.logo')}
              value={branding.logoUrl}
              onChange={(url) => updateBranding({ logoUrl: url })}
            />
            <ImageUploader
              label={t('branding.identity.favicon')}
              value={branding.faviconUrl}
              onChange={(url) => updateBranding({ faviconUrl: url })}
            />
          </div>
        </FormCard>

        {/* Brand Colors */}
        <FormCard title={t('branding.brandColors.title')} description={t('branding.brandColors.description')}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {BRAND_COLORS.map(({ key, label, hint, usedIn }) => (
              <div key={key} className="space-y-1.5">
                <ColorPicker label={label} value={branding.colors[key] ?? '#16a34a'} onChange={(v) => updateColor(key, v)} />
                <p className="text-[10px] text-gray-400 leading-relaxed">{hint}</p>
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[9px] font-semibold text-gray-300 uppercase tracking-wide">·</span>
                  {usedIn.split(' · ').map(tag => (
                    <span key={tag} className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-100 text-gray-500">{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </FormCard>

        {/* Button Colors — dedicated card, clearly separate from brand */}
        <FormCard title={t('branding.buttonColors.title')} description={t('branding.buttonColors.description')}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {BUTTON_COLORS.map(({ key, label, hint, usedIn }) => (
              <div key={key} className="space-y-1.5">
                <ColorPicker label={label} value={branding.colors[key] ?? (key === 'checkoutBtnHoverColor' ? '#75c547' : '#16a34a')} onChange={(v) => updateColor(key, v)} />
                <p className="text-[10px] text-gray-400 leading-relaxed">{hint}</p>
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[9px] font-semibold text-gray-300 uppercase tracking-wide">·</span>
                  {usedIn.split(' · ').map(tag => (
                    <span key={tag} className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-100 text-gray-500">{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {/* Mini button preview */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-2">{t('branding.buttonColors.previewLabel')}</p>
            <div className="flex items-center gap-3">
              <button
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-semibold"
                style={{ backgroundColor: branding.colors.checkoutBtnColor ?? branding.colors.primary, boxShadow: `0 10px 30px -12px ${branding.colors.checkoutBtnColor ?? branding.colors.primary}88` }}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
                {t('branding.buttonColors.normal')}
              </button>
              <button
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-semibold"
                style={{ backgroundColor: branding.colors.checkoutBtnHoverColor ?? '#75c547', filter: 'brightness(1.1)', transform: 'translateY(-1px) scale(1.02)', boxShadow: '0 4px 14px rgba(0,0,0,0.15)' }}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
                {t('branding.buttonColors.hovered')}
              </button>
            </div>
          </div>
        </FormCard>

        {/* Page Colors */}
        <FormCard title={t('branding.pageColors.title')} description={t('branding.pageColors.description')}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PAGE_COLORS.map(({ key, label, hint, usedIn }) => (
              <div key={key} className="space-y-1.5">
                <ColorPicker label={label} value={branding.colors[key] ?? '#ffffff'} onChange={(v) => updateColor(key, v)} />
                <p className="text-[10px] text-gray-400 leading-relaxed">{hint}</p>
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[9px] font-semibold text-gray-300 uppercase tracking-wide">·</span>
                  {usedIn.split(' · ').map(tag => (
                    <span key={tag} className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-100 text-gray-500">{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </FormCard>

        {/* Component Colors — collapsible */}
        <FormCard title={t('branding.componentColors.title')} description={t('branding.componentColors.description')}>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-4"
          >
            {showAdvanced ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            {showAdvanced
              ? t('branding.componentColors.hide').replace('{n}', String(COMPONENT_COLORS.length))
              : t('branding.componentColors.show').replace('{n}', String(COMPONENT_COLORS.length))}
          </button>
          {showAdvanced && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {COMPONENT_COLORS.map(({ key, label, hint, usedIn }) => (
                <div key={key} className="space-y-1.5">
                  <ColorPicker label={label} value={branding.colors[key] ?? '#ffffff'} onChange={(v) => updateColor(key, v)} />
                  <p className="text-[10px] text-gray-400 leading-relaxed">{hint}</p>
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[9px] font-semibold text-gray-300 uppercase tracking-wide">·</span>
                    {usedIn.split(' · ').map(tag => (
                      <span key={tag} className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-100 text-gray-500">{tag}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </FormCard>

        {/* Live Preview — faithful miniature of actual storefront */}
        <FormCard title={t('branding.livePreview.title')} description={t('branding.livePreview.description')}>
          <div
            className="rounded-xl overflow-hidden border-2 transition-colors"
            style={{
              backgroundColor: branding.colors.background,
              color: branding.colors.foreground,
              borderColor: branding.colors.border,
            }}
          >
            {/* Header — glass effect, logo, nav, search, icons */}
            <div
              className="flex items-center justify-between px-3 border-b"
              style={{
                height: '40px',
                borderColor: branding.colors.border,
                backgroundColor: `color-mix(in srgb, ${branding.colors.background} 92%, transparent)`,
                backdropFilter: 'blur(12px)',
              }}
            >
              <div className="flex items-center gap-1.5">
                {logoPreviewUrl ? (
                  <img src={logoPreviewUrl} alt="" className="h-6 w-auto rounded-md" />
                ) : (
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: branding.colors.primary }}>
                    <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75" /></svg>
                  </div>
                )}
                <span className="font-bold text-[11px] tracking-tight" style={{ color: branding.colors.foreground, fontFamily: 'Georgia, serif' }}>{branding.storeName}</span>
                {[
                  { id: 'home', label: t('branding.livePreview.navHome') },
                  { id: 'products', label: t('branding.livePreview.navProducts') },
                  { id: 'recipes', label: t('branding.livePreview.navRecipes') },
                ].map((item) => (
                  <span key={item.id} className="px-1.5 py-0.5 rounded text-[8px] font-medium cursor-default transition-colors" style={{ color: branding.colors.foreground, backgroundColor: hoveredBtn === `nav-${item.id}` ? `color-mix(in srgb, ${branding.colors.foreground} 5%, transparent)` : 'transparent' }} onMouseEnter={() => setHoveredBtn(`nav-${item.id}`)} onMouseLeave={() => setHoveredBtn(null)}>{item.label}</span>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1 rounded-lg border px-2 py-1" style={{ borderColor: branding.colors.border }}>
                  <svg className="w-3 h-3" style={{ color: branding.colors.mutedForeground }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                  <span className="text-[7px]" style={{ color: branding.colors.mutedForeground }}>{t('branding.livePreview.searchPlaceholder')}</span>
                </div>
                <svg className="w-3.5 h-3.5" style={{ color: branding.colors.foreground }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                <svg className="w-3.5 h-3.5" style={{ color: branding.colors.foreground }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                <div className="relative">
                  <svg className="w-3.5 h-3.5" style={{ color: branding.colors.foreground }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full text-[5px] font-bold text-white flex items-center justify-center" style={{ backgroundColor: branding.colors.primary }}>2</span>
                </div>
              </div>
            </div>

            {/* Hero — accent bg, icon, display heading, CTA with opacity hover */}
            <div className="px-6 py-8 text-center" style={{ backgroundColor: branding.colors.accent }}>
              <div className="mb-2.5 flex items-center justify-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: branding.colors.primary }}>
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75" /></svg>
                </div>
              </div>
              <h2 className="text-lg font-bold mb-1.5 tracking-tight leading-tight" style={{ color: branding.colors.foreground, fontFamily: 'Georgia, serif' }}>{t('branding.livePreview.heroTitle')}</h2>
              <p className="text-[10px] mb-3 max-w-xs mx-auto leading-relaxed" style={{ color: branding.colors.mutedForeground }}>{t('branding.livePreview.heroSubtitle')}</p>
              <button
                className="inline-flex items-center gap-1 px-4 py-1.5 rounded-xl text-white text-[10px] font-semibold transition-all cursor-default"
                style={{
                  backgroundColor: branding.colors.primary,
                  opacity: hoveredBtn === 'hero-cta' ? 0.9 : 1,
                  transform: hoveredBtn === 'hero-cta' ? 'scale(0.95)' : 'none',
                }}
                onMouseEnter={() => setHoveredBtn('hero-cta')}
                onMouseLeave={() => setHoveredBtn(null)}
              >
                {t('branding.livePreview.productsCta')}
                <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><path d="M9 5l7 7-7 7"/></svg>
              </button>
            </div>

            {/* Product cards — wishlist heart, quantity +-1, cart icon, checkout-btn hover */}
            <div className="px-3 py-4">
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-[11px] font-semibold" style={{ color: branding.colors.foreground, fontFamily: 'Georgia, serif' }}>{t('branding.livePreview.newArrivals')}</h3>
                <span className="text-[8px] font-medium" style={{ color: branding.colors.primary }}>{t('branding.livePreview.viewAll')}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { name: 'Banany 1kg', price: '5,00 zł' },
                  { name: 'Bánh Bao x6', price: '28,00 zł' },
                  { name: 'Bánh Flan 150g', price: '12,00 zł' },
                ].map((item, idx) => (
                  <div
                    key={item.name}
                    className="rounded-xl border overflow-hidden transition-all cursor-default"
                    style={{
                      borderColor: branding.colors.border,
                      backgroundColor: branding.colors.card,
                      transform: hoveredBtn === `card-${idx}` ? 'translateY(-2px)' : 'none',
                      boxShadow: hoveredBtn === `card-${idx}` ? `0 8px 25px -5px color-mix(in srgb, ${branding.colors.foreground} 8%, transparent)` : 'none',
                    }}
                    onMouseEnter={() => setHoveredBtn(`card-${idx}`)}
                    onMouseLeave={() => setHoveredBtn(null)}
                  >
                    {/* Image area with wishlist heart */}
                    <div className="aspect-square relative" style={{ backgroundColor: branding.colors.muted }}>
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full border flex items-center justify-center" style={{ backgroundColor: `color-mix(in srgb, ${branding.colors.card} 90%, transparent)`, borderColor: branding.colors.border }}>
                        <svg className="w-2.5 h-2.5" style={{ color: branding.colors.foreground }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                      </div>
                    </div>
                    {/* Card content */}
                    <div className="px-2 py-2" style={{ backgroundColor: branding.colors.card }}>
                      <p className="text-[9px] font-semibold truncate leading-snug" style={{ color: branding.colors.foreground }}>{item.name}</p>
                      <p className="text-[9px] font-bold mt-0.5 tabular-nums" style={{ color: branding.colors.foreground }}>{item.price}</p>
                      {/* Quantity + Add to Cart row */}
                      <div className="mt-1.5 grid grid-cols-[auto,1fr] gap-1">
                        <div className="grid grid-cols-3 h-5 rounded-md border overflow-hidden" style={{ borderColor: branding.colors.border, backgroundColor: branding.colors.card }}>
                          <span className="flex items-center justify-center text-[7px]" style={{ color: branding.colors.foreground }}>−</span>
                          <span className="flex items-center justify-center text-[7px] font-semibold" style={{ color: branding.colors.foreground }}>1</span>
                          <span className="flex items-center justify-center text-[7px]" style={{ color: branding.colors.foreground }}>+</span>
                        </div>
                        <button
                          className="h-5 rounded-md text-white text-[7px] font-semibold flex items-center justify-center gap-0.5 transition-all cursor-default"
                          style={{
                            backgroundColor: hoveredBtn === `cart-${idx}`
                              ? (branding.colors.checkoutBtnHoverColor ?? '#75c547')
                              : (branding.colors.checkoutBtnColor ?? branding.colors.primary),
                            filter: hoveredBtn === `cart-${idx}` ? 'brightness(1.1)' : 'none',
                            transform: hoveredBtn === `cart-${idx}` ? 'translateY(-1px) scale(1.02)' : 'none',
                            boxShadow: hoveredBtn === `cart-${idx}` ? '0 4px 14px rgba(0,0,0,0.15)' : `0 3px 8px -3px ${(branding.colors.checkoutBtnColor ?? branding.colors.primary)}88`,
                          }}
                          onMouseEnter={() => setHoveredBtn(`cart-${idx}`)}
                          onMouseLeave={() => setHoveredBtn(null)}
                        >
                          <svg className="w-2 h-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
                          {t('branding.livePreview.addToCart')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t px-3 py-3" style={{ borderColor: branding.colors.border, backgroundColor: branding.colors.card }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                {logoPreviewUrl ? (
                  <img src={logoPreviewUrl} alt="" className="h-4 w-auto rounded" />
                ) : (
                  <div className="w-4 h-4 rounded flex items-center justify-center" style={{ backgroundColor: branding.colors.primary }}>
                    <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75" /></svg>
                  </div>
                )}
                <span className="text-[8px] font-bold" style={{ color: branding.colors.foreground, fontFamily: 'Georgia, serif' }}>{branding.storeName}</span>
              </div>
              <div className="flex gap-5 mb-2">
                {[
                  t('branding.livePreview.footerShop'),
                  t('branding.livePreview.footerInfo'),
                  t('branding.livePreview.footerLegal'),
                ].map((col) => (
                  <div key={col}>
                    <p className="text-[7px] font-semibold mb-0.5" style={{ color: branding.colors.foreground, fontFamily: 'Georgia, serif' }}>{col}</p>
                    <p className="text-[6px]" style={{ color: branding.colors.mutedForeground }}>{t('branding.livePreview.navProducts')}</p>
                    <p className="text-[6px]" style={{ color: branding.colors.mutedForeground }}>{t('branding.livePreview.navRecipes')}</p>
                  </div>
                ))}
              </div>
              <div className="border-t pt-1.5 text-center" style={{ borderColor: branding.colors.border }}>
                <p className="text-[6px]" style={{ color: branding.colors.mutedForeground }}>&copy; 2025 {branding.storeName}. {t('branding.livePreview.poweredBy')}.</p>
              </div>
            </div>
          </div>
        </FormCard>
      </div>

      <SaveBar
        isDirty={isDirty}
        saving={saving}
        publishing={publishing}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        lastSaved={lastSaved}
        error={error}
        onSave={save}
        onPublish={publish}
      />
    </div>
  );
}
