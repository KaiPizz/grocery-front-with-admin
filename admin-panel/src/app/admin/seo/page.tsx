'use client';

import { useConfig } from '@/hooks/use-config';
import { PageHeader } from '@/components/PageHeader';
import { FormCard } from '@/components/FormCard';
import { FieldLabel } from '@/components/FieldLabel';
import { SaveBar } from '@/components/SaveBar';
import { ImageUploader } from '@/components/ImageUploader';
import { Loader2 } from 'lucide-react';
import type { SeoConfig } from '@/types/config';
import { useLanguage } from '@/i18n';

export default function SeoPage() {
  const { config, loading, saving, publishing, isDirty, error, lastSaved, updateConfig, save, publish, canUndo, canRedo, undo, redo } = useConfig();
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 py-12 justify-center">
        <Loader2 className="w-5 h-5 animate-spin" /> {t('common.loading')}
      </div>
    );
  }

  const seo = config.seo;

  function updateSeo(partial: Partial<SeoConfig>) {
    updateConfig(prev => ({ ...prev, seo: { ...prev.seo, ...partial } }));
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="flex-1 space-y-6 pb-6">
        <PageHeader title={t('seo.title')} description={t('seo.description')} />

        <FormCard title={t('seo.metaTitle')} description={t('seo.metaDescription')}>
          <FieldLabel label={t('seo.defaultTitle')} hint={t('seo.defaultTitleHint')}>
            <input
              type="text"
              value={seo.defaultTitle}
              onChange={(e) => updateSeo({ defaultTitle: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
              placeholder="My Grocery Store"
            />
          </FieldLabel>

          <FieldLabel label={t('seo.defaultDescription')} hint={t('seo.defaultDescriptionHint')}>
            <textarea
              value={seo.defaultDescription}
              onChange={(e) => updateSeo({ defaultDescription: e.target.value })}
              rows={3}
              maxLength={500}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none resize-none"
              placeholder="Fresh groceries delivered to your door..."
            />
            <p className="mt-1 text-xs text-gray-400">{seo.defaultDescription.length}/500</p>
          </FieldLabel>

          <FieldLabel label={t('seo.canonical')} hint={t('seo.canonicalHint')}>
            <input
              type="text"
              value={seo.canonical}
              onChange={(e) => updateSeo({ canonical: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
              placeholder="https://mystore.com"
            />
          </FieldLabel>
        </FormCard>

        <FormCard title={t('seo.ogImageTitle')} description={t('seo.ogImageDescription')}>
          <ImageUploader
            value={seo.ogImageUrl}
            onChange={(url) => updateSeo({ ogImageUrl: url })}
          />
          <p className="text-xs text-gray-400 mt-2">{t('seo.ogImageHint')}</p>
        </FormCard>

        {/* Preview */}
        <FormCard title={t('seo.searchPreviewTitle')}>
          <div className="rounded-lg border border-gray-200 bg-white p-4 max-w-lg">
            <p className="text-sm text-indigo-700 truncate">{seo.canonical || 'https://mystore.com'}</p>
            <p className="text-lg text-blue-800 font-medium mt-0.5 truncate">
              {seo.defaultTitle || t('seo.pageTitle')}
            </p>
            <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
              {seo.defaultDescription || t('seo.pageDescription')}
            </p>
          </div>
        </FormCard>
      </div>

      <SaveBar isDirty={isDirty} saving={saving} publishing={publishing} lastSaved={lastSaved} error={error} onSave={save} onPublish={publish} canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo} />
    </div>
  );
}
