'use client';

import { useConfig } from '@/hooks/use-config';
import { PageHeader } from '@/components/PageHeader';
import { FormCard } from '@/components/FormCard';
import { FieldLabel } from '@/components/FieldLabel';
import { SaveBar } from '@/components/SaveBar';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import type { GeneralConfig, SocialLink } from '@/types/config';
import { useLanguage } from '@/i18n';

const PLATFORM_OPTIONS = ['Facebook', 'Instagram', 'Twitter/X', 'TikTok', 'YouTube', 'LINE', 'WhatsApp', 'Telegram', 'LinkedIn', 'Pinterest'];

export default function GeneralPage() {
  const { config, loading, saving, publishing, isDirty, error, lastSaved, updateConfig, save, publish, canUndo, canRedo, undo, redo } = useConfig();
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 py-12 justify-center">
        <Loader2 className="w-5 h-5 animate-spin" /> {t('common.loading')}
      </div>
    );
  }

  const general = config.general;

  function updateGeneral(partial: Partial<GeneralConfig>) {
    updateConfig(prev => ({ ...prev, general: { ...prev.general, ...partial } }));
  }

  function updateSocialLink(index: number, partial: Partial<SocialLink>) {
    const socialLinks = [...general.socialLinks];
    socialLinks[index] = { ...socialLinks[index], ...partial };
    updateGeneral({ socialLinks });
  }

  function addSocialLink() {
    updateGeneral({ socialLinks: [...general.socialLinks, { platform: 'Facebook', url: '' }] });
  }

  function removeSocialLink(index: number) {
    updateGeneral({ socialLinks: general.socialLinks.filter((_, i) => i !== index) });
  }

  function updatePolicyLink(key: 'privacy' | 'terms' | 'about', value: string) {
    updateGeneral({ policyLinks: { ...general.policyLinks, [key]: value } });
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="flex-1 space-y-6 pb-6">
        <PageHeader title={t('general.title')} description={t('general.description')} />

        <FormCard title={t('general.shopInfo')}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldLabel label={t('general.phone')}>
              <input
                type="text"
                value={general.phone}
                onChange={(e) => updateGeneral({ phone: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
                placeholder="+66 2 123 4567"
              />
            </FieldLabel>
            <FieldLabel label={t('general.email')}>
              <input
                type="email"
                value={general.email}
                onChange={(e) => updateGeneral({ email: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
                placeholder="contact@mystore.com"
              />
            </FieldLabel>
          </div>
          <FieldLabel label={t('general.address')}>
            <textarea
              value={general.address}
              onChange={(e) => updateGeneral({ address: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none resize-none"
              placeholder="123 Main St, Bangkok, Thailand"
            />
          </FieldLabel>
        </FormCard>

        <FormCard title={t('general.socialLinks')}>
          <div className="space-y-2">
            {general.socialLinks.map((link, index) => (
              <div key={index} className="flex items-center gap-2">
                <select
                  value={link.platform}
                  onChange={(e) => updateSocialLink(index, { platform: e.target.value })}
                  className="w-36 shrink-0 rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-indigo-400 outline-none bg-white"
                >
                  {PLATFORM_OPTIONS.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <input
                  type="url"
                  value={link.url}
                  onChange={(e) => updateSocialLink(index, { url: e.target.value })}
                  placeholder="https://..."
                  className="flex-1 min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeSocialLink(index)}
                  className="p-2 rounded hover:bg-red-100 text-red-500 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addSocialLink}
            className="mt-3 inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800"
          >
            <Plus className="w-4 h-4" /> {t('general.addSocialLink')}
          </button>
        </FormCard>

        <FormCard title={t('general.policyPages')} description={t('general.policyPagesDescription')}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FieldLabel label={t('general.privacyPolicy')}>
              <input
                type="text"
                value={general.policyLinks.privacy}
                onChange={(e) => updatePolicyLink('privacy', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
                placeholder="/privacy"
              />
            </FieldLabel>
            <FieldLabel label={t('general.termsOfService')}>
              <input
                type="text"
                value={general.policyLinks.terms}
                onChange={(e) => updatePolicyLink('terms', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
                placeholder="/terms"
              />
            </FieldLabel>
            <FieldLabel label={t('general.aboutPage')}>
              <input
                type="text"
                value={general.policyLinks.about}
                onChange={(e) => updatePolicyLink('about', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
                placeholder="/about"
              />
            </FieldLabel>
          </div>
        </FormCard>
      </div>

      <SaveBar isDirty={isDirty} saving={saving} publishing={publishing} lastSaved={lastSaved} error={error} onSave={save} onPublish={publish} canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo} />
    </div>
  );
}
