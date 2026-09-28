'use client';

import { useConfig } from '@/hooks/use-config';
import { PageHeader } from '@/components/PageHeader';
import { FormCard } from '@/components/FormCard';
import { FieldLabel } from '@/components/FieldLabel';
import { SaveBar } from '@/components/SaveBar';
import { ImageUploader } from '@/components/ImageUploader';
import { BlockBuilder } from '@/components/blocks/BlockBuilder';
import { ShowcaseEditor } from '@/components/ShowcaseEditor';
import { getShowcaseProblems } from '@/lib/showcase-editor';
import { Loader2, GripVertical, ChevronDown, ChevronUp, EyeOff } from 'lucide-react';
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
  const showcaseOn = Boolean(homepage.showcase?.enabled);
  // With the showcase landing on, these legacy cards (mostly) stop reaching the site.
  const legacyNotice = (text: string) => showcaseOn ? (
    <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" data-testid="showcase-legacy-notice">
      <EyeOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span><strong className="font-semibold">{t('homepage.showcase.legacyBadge')}.</strong> {text}</span>
    </p>
  ) : null;
  const seoText = homepage.seoText ?? { enabled: false, headline: '', paragraphs: [], headlineEn: '', paragraphsEn: [] };
  // One paragraph per blank-line-separated block; a single newline stays inside its paragraph.
  const splitParagraphs = (value: string) => value.split(/\n[ \t]*\n/);
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
    const fillTitle = (template: string, title?: string) =>
      template.replace('{title}', title || t('homepage.blocks.untitled'));
    for (const block of blocks) {
      if (!block.enabled) continue;
      switch (block.type) {
        case 'hero':
          for (const slide of block.slides) {
            if (!slide.imageUrl) errors.push(fillTitle(t('homepage.blocks.missingHeroDesktop'), slide.title));
          }
          break;
        case 'horizontal':
          if (!block.imageUrl) errors.push(t('homepage.blocks.missingHorizontalDesktop'));
          break;
        case 'grid':
          for (const item of block.items) {
            if (!item.imageUrl) errors.push(fillTitle(t('homepage.blocks.missingGridTile'), item.title));
          }
          break;
        case 'round_grid':
          for (const item of block.items) {
            if (!item.imageUrl) errors.push(fillTitle(t('homepage.blocks.missingRoundGridTile'), item.title));
          }
          break;
        case 'sidebar':
          if (!block.imageUrl) errors.push(t('homepage.blocks.missingSidebarImage'));
          break;
        case 'small_sticky':
          if (!block.desktopImageUrl) errors.push(t('homepage.blocks.missingStickyDesktop'));
          if (!block.mobileImageUrl) errors.push(t('homepage.blocks.missingStickyMobile'));
          break;
      }
    }
    return errors;
  }

  async function handleSave() {
    const problems = getShowcaseProblems(homepage.showcase).map((problem) =>
      t(`homepage.showcase.problems.${problem.code}`).replace('{n}', String(problem.position ?? '')));
    if (problems.length > 0) {
      toast.error(t('homepage.showcase.cannotSave'), {
        description: problems[0] + (problems.length > 1 ? ` (${t('homepage.showcase.moreErrors').replace('{count}', String(problems.length - 1))})` : ''),
      });
      return;
    }
    const errors = getBlockImageErrors(homepage.blocks ?? []);
    if (errors.length > 0) {
      toast.error(t('homepage.blocks.cannotSaveMissingImages'), {
        description: errors[0] + (errors.length > 1 ? ` (${t('homepage.blocks.moreErrors').replace('{count}', String(errors.length - 1))})` : ''),
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

        <ShowcaseEditor showcase={homepage.showcase} onChange={(showcase) => updateHomepage({ showcase })} />

        {/* Hero Banner */}
        <FormCard title={t('homepage.hero.title')}>
          {legacyNotice(t('homepage.showcase.legacyHero'))}
          <div className={`flex items-center gap-3 mb-3${showcaseOn ? ' hidden' : ''}`}>
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

          {showcaseOn ? (
            <FieldLabel label={t('homepage.hero.headline')} htmlFor="homepage-hero-headline">
              <input
                id="homepage-hero-headline"
                type="text"
                value={homepage.hero.headline}
                onChange={(e) => updateHero('headline', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
              />
            </FieldLabel>
          ) : homepage.hero.enabled && (
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
          title={t('homepage.blocks.title')}
          description={t('homepage.blocks.description')}
          overflow="visible"
        >
          {legacyNotice(t('homepage.showcase.legacyBlocks'))}
          <BlockBuilder
            blocks={homepage.blocks ?? []}
            onChange={updateBlocks}
          />
        </FormCard>

        {/* Homepage Sections */}
        <FormCard title={t('homepage.sections.title')} description={t('homepage.sections.description')}>
          {legacyNotice(t('homepage.showcase.legacySections'))}
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

        {/* "Polecane" shelf: leaf category slugs */}
        <FormCard title={t('homepage.featured.title')} description={t('homepage.featured.hint')}>
          {legacyNotice(t('homepage.showcase.legacyFeatured'))}
          <FieldLabel label={t('homepage.featured.slugs')} htmlFor="homepage-featured-slugs">
            <input
              id="homepage-featured-slugs"
              type="text"
              value={(homepage.featured?.categorySlugs ?? []).join(', ')}
              onChange={(e) => updateHomepage({
                featured: { categorySlugs: e.target.value.split(',').map((slug) => slug.trim()) },
              })}
              className="w-full min-h-11 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-mono text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              placeholder="buldak-i-ramyun-ostre, kimchi, pocky-pepero-i-czekolada"
              autoComplete="off"
            />
          </FieldLabel>
        </FormCard>

        {/* SEO text at the bottom of the landing page */}
        <FormCard title={t('homepage.seoText.title')}>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={homepage.seoText?.enabled ?? false}
              onChange={(e) => updateHomepage({ seoText: { ...seoText, enabled: e.target.checked } })}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700">{t('homepage.seoText.enable')}</span>
          </label>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <FieldLabel label={t('homepage.seoText.headlinePl')} htmlFor="homepage-seo-headline-pl">
              <input
                id="homepage-seo-headline-pl"
                type="text"
                value={seoText.headline}
                onChange={(e) => updateHomepage({ seoText: { ...seoText, headline: e.target.value } })}
                className="w-full min-h-11 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </FieldLabel>
            <FieldLabel label={t('homepage.seoText.headlineEn')} htmlFor="homepage-seo-headline-en">
              <input
                id="homepage-seo-headline-en"
                type="text"
                value={seoText.headlineEn}
                onChange={(e) => updateHomepage({ seoText: { ...seoText, headlineEn: e.target.value } })}
                className="w-full min-h-11 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </FieldLabel>
            <FieldLabel label={t('homepage.seoText.paragraphsPl')} htmlFor="homepage-seo-paragraphs-pl">
              <textarea
                id="homepage-seo-paragraphs-pl"
                rows={8}
                value={seoText.paragraphs.join('\n\n')}
                onChange={(e) => updateHomepage({ seoText: { ...seoText, paragraphs: splitParagraphs(e.target.value) } })}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </FieldLabel>
            <FieldLabel label={t('homepage.seoText.paragraphsEn')} htmlFor="homepage-seo-paragraphs-en">
              <textarea
                id="homepage-seo-paragraphs-en"
                rows={8}
                value={seoText.paragraphsEn.join('\n\n')}
                onChange={(e) => updateHomepage({ seoText: { ...seoText, paragraphsEn: splitParagraphs(e.target.value) } })}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </FieldLabel>
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
