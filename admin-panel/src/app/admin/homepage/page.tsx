'use client';

import { useConfig } from '@/hooks/use-config';
import { PageHeader } from '@/components/PageHeader';
import { FormCard } from '@/components/FormCard';
import { FieldLabel } from '@/components/FieldLabel';
import { SaveBar } from '@/components/SaveBar';
import { ImageUploader } from '@/components/ImageUploader';
import { BlockBuilder } from '@/components/blocks/BlockBuilder';
import { Loader2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import type { HomepageConfig, HomepageSectionItem, BannerBlock } from '@/types/config';
import { useLanguage } from '@/i18n';
import { toast } from 'sonner';

export default function HomepagePage() {
  const { config, loading, saving, publishing, isDirty, error, lastSaved, updateConfig, save, publish, canUndo, canRedo, undo, redo } = useConfig();
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 py-12 justify-center">
        <Loader2 className="w-5 h-5 animate-spin" /> {t('common.loading')}
      </div>
    );
  }

  const homepage = config.homepage;
  const SECTION_LABELS: {[key: string]: string} = {
    deals: t('homepage.sections.deals'),
    freshPicks: t('homepage.sections.freshPicks'),
    recipes: t('homepage.sections.recipes'),
    shopByZone: t('homepage.sections.shopByZone'),
  };

  function updateHomepage(partial: Partial<HomepageConfig>) {
    updateConfig(prev => ({
      ...prev,
      homepage: { ...prev.homepage, ...partial },
    }));
  }

  function updateHero(field: string, value: unknown) {
    updateConfig(prev => ({
      ...prev,
      homepage: {
        ...prev.homepage,
        hero: { ...prev.homepage.hero, [field]: value },
      },
    }));
  }

  function updateBlocks(blocks: BannerBlock[]) {
    updateHomepage({ blocks });
  }

  function getBlockImageErrors(blocks: BannerBlock[]): string[] {
    const errors: string[] = [];
    for (const block of blocks) {
      if (!block.enabled) continue;
      switch (block.type) {
        case 'hero':
          for (const slide of block.slides) {
            if (!slide.imageUrl) errors.push(`Hero slide "${slide.title || 'Untitled'}" is missing a desktop image`);
          }
          break;
        case 'horizontal':
          if (!block.imageUrl) errors.push('Horizontal banner is missing a desktop image');
          break;
        case 'grid':
          for (const item of block.items) {
            if (!item.imageUrl) errors.push(`Grid tile "${item.title || 'Untitled'}" is missing an image`);
          }
          break;
        case 'sidebar':
          if (!block.imageUrl) errors.push('Sidebar banner is missing an image');
          break;
        case 'small_sticky':
          if (!block.desktopImageUrl) errors.push('Sticky banner is missing a desktop image');
          if (!block.mobileImageUrl) errors.push('Sticky banner is missing a mobile image');
          break;
      }
    }
    return errors;
  }

  async function handleSave() {
    const errors = getBlockImageErrors(homepage.blocks ?? []);
    if (errors.length > 0) {
      toast.error('Cannot save — missing images', {
        description: errors[0] + (errors.length > 1 ? ` (+${errors.length - 1} more)` : ''),
      });
      return;
    }
    await save();
  }

  function updateSection(index: number, partial: Partial<HomepageSectionItem>) {
    const sections = [...homepage.sections];
    sections[index] = { ...sections[index], ...partial };
    updateHomepage({ sections });
  }

  function moveSection(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= homepage.sections.length) return;
    const sections = [...homepage.sections];
    [sections[index], sections[newIndex]] = [sections[newIndex], sections[index]];
    updateHomepage({ sections: sections.map((s, i) => ({ ...s, order: i })) });
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="flex-1 space-y-6 pb-28">
        <PageHeader title={t('homepage.title')} description={t('homepage.description')} />

        {/* Hero Banner */}
        <FormCard title={t('homepage.hero.title')}>
          <div className="flex items-center gap-3 mb-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={homepage.hero.enabled}
                onChange={(e) => updateHero('enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
            </label>
            <span className="text-sm text-gray-700">{homepage.hero.enabled ? t('common.enabled') : t('common.disabled')}</span>
          </div>

          {homepage.hero.enabled && (
            <div className="space-y-4">
              <FieldLabel label={t('homepage.hero.headline')}>
                <input
                  type="text"
                  value={homepage.hero.headline}
                  onChange={(e) => updateHero('headline', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
                />
              </FieldLabel>
              <FieldLabel label={t('homepage.hero.subtitle')}>
                <textarea
                  value={homepage.hero.subtitle}
                  onChange={(e) => updateHero('subtitle', e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none resize-none"
                />
              </FieldLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldLabel label={t('homepage.hero.ctaText')}>
                  <input
                    type="text"
                    value={homepage.hero.ctaText}
                    onChange={(e) => updateHero('ctaText', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
                  />
                </FieldLabel>
                <FieldLabel label={t('homepage.hero.ctaLink')}>
                  <input
                    type="text"
                    value={homepage.hero.ctaLink}
                    onChange={(e) => updateHero('ctaLink', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
                  />
                </FieldLabel>
              </div>
              <ImageUploader
                label={t('homepage.hero.backgroundImage')}
                value={homepage.hero.backgroundImageUrl}
                onChange={(url) => updateHero('backgroundImageUrl', url)}
              />
            </div>
          )}
        </FormCard>

        {/* Banner Blocks */}
        <FormCard
          title="Banner Blocks"
          description="Hero carousel, horizontal banners, grid tiles, sidebar banners, or sticky announcements. Each block enforces strict upload dimensions."
          overflow="visible"
        >
          <BlockBuilder
            blocks={homepage.blocks ?? []}
            onChange={updateBlocks}
          />
        </FormCard>

        {/* Homepage Sections */}
        <FormCard title={t('homepage.sections.title')} description={t('homepage.sections.description')}>
          <div className="space-y-2">
            {homepage.sections.map((section, index) => (
              <div
                key={section.id}
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
              >
                <GripVertical className="w-4 h-4 text-gray-400 shrink-0" />
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={section.enabled}
                    onChange={(e) => updateSection(index, { enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-gray-200 rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4"></div>
                </label>
                <span className={`text-sm flex-1 ${section.enabled ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                  {SECTION_LABELS[section.id] || section.id}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => moveSection(index, -1)}
                    disabled={index === 0}
                    className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSection(index, 1)}
                    disabled={index === homepage.sections.length - 1}
                    className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
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
        onSave={handleSave}
        onPublish={publish}
      />
    </div>
  );
}
