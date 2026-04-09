'use client';

import { useConfig } from '@/hooks/use-config';
import { PageHeader } from '@/components/PageHeader';
import { FormCard } from '@/components/FormCard';
import { SaveBar } from '@/components/SaveBar';
import { Loader2 } from 'lucide-react';
import type { TrackingConfig } from '@/types/config';
import { useLanguage } from '@/i18n';

interface TrackingCardProps {
  title: string;
  description: string;
  enabled: boolean;
  idValue: string;
  idLabel: string;
  idPlaceholder: string;
  onToggle: (enabled: boolean) => void;
  onIdChange: (value: string) => void;
}

function TrackingCard({ title, description, enabled, idValue, idLabel, idPlaceholder, onToggle, onIdChange }: TrackingCardProps) {
  return (
    <div className={`rounded-xl border p-5 transition-colors ${enabled ? 'border-indigo-200 bg-indigo-50/30' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
        </label>
      </div>
      {enabled && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">{idLabel}</label>
          <input
            type="text"
            value={idValue}
            onChange={(e) => onIdChange(e.target.value)}
            placeholder={idPlaceholder}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
          />
        </div>
      )}
    </div>
  );
}

export default function TrackingPage() {
  const { config, loading, saving, publishing, isDirty, error, lastSaved, updateConfig, save, publish, canUndo, canRedo, undo, redo } = useConfig();
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 py-12 justify-center">
        <Loader2 className="w-5 h-5 animate-spin" /> {t('common.loading')}
      </div>
    );
  }

  const tracking = config.tracking;

  function updateTracking(partial: Partial<TrackingConfig>) {
    updateConfig(prev => ({ ...prev, tracking: { ...prev.tracking, ...partial } }));
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="flex-1 space-y-6 pb-6">
        <PageHeader title={t('tracking.title')} description={t('tracking.description')} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TrackingCard
            title={t('tracking.fbPixel.title')}
            description={t('tracking.fbPixel.description')}
            enabled={tracking.facebookPixel.enabled}
            idValue={tracking.facebookPixel.pixelId}
            idLabel={t('tracking.fbPixel.idLabel')}
            idPlaceholder="123456789012345"
            onToggle={(enabled) => updateTracking({ facebookPixel: { ...tracking.facebookPixel, enabled } })}
            onIdChange={(pixelId) => updateTracking({ facebookPixel: { ...tracking.facebookPixel, pixelId } })}
          />

          <TrackingCard
            title={t('tracking.ga4.title')}
            description={t('tracking.ga4.description')}
            enabled={tracking.googleAnalytics.enabled}
            idValue={tracking.googleAnalytics.measurementId}
            idLabel={t('tracking.ga4.idLabel')}
            idPlaceholder="G-XXXXXXXXXX"
            onToggle={(enabled) => updateTracking({ googleAnalytics: { ...tracking.googleAnalytics, enabled } })}
            onIdChange={(measurementId) => updateTracking({ googleAnalytics: { ...tracking.googleAnalytics, measurementId } })}
          />

          <TrackingCard
            title={t('tracking.gtm.title')}
            description={t('tracking.gtm.description')}
            enabled={tracking.googleTagManager.enabled}
            idValue={tracking.googleTagManager.containerId}
            idLabel={t('tracking.gtm.idLabel')}
            idPlaceholder="GTM-XXXXXXX"
            onToggle={(enabled) => updateTracking({ googleTagManager: { ...tracking.googleTagManager, enabled } })}
            onIdChange={(containerId) => updateTracking({ googleTagManager: { ...tracking.googleTagManager, containerId } })}
          />

          <TrackingCard
            title={t('tracking.hotjar.title')}
            description={t('tracking.hotjar.description')}
            enabled={tracking.hotjar.enabled}
            idValue={tracking.hotjar.siteId}
            idLabel={t('tracking.hotjar.idLabel')}
            idPlaceholder="1234567"
            onToggle={(enabled) => updateTracking({ hotjar: { ...tracking.hotjar, enabled } })}
            onIdChange={(siteId) => updateTracking({ hotjar: { ...tracking.hotjar, siteId } })}
          />
        </div>

        <FormCard title={t('tracking.notes.title')}>
          <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
            <li>{t('tracking.notes.line1')}</li>
            <li><code className="text-indigo-600">afterInteractive</code> — {t('tracking.notes.line2')}</li>
            <li>{t('tracking.notes.line3')}</li>
          </ul>
        </FormCard>
      </div>

      <SaveBar isDirty={isDirty} saving={saving} publishing={publishing} lastSaved={lastSaved} error={error} onSave={save} onPublish={publish} canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo} />
    </div>
  );
}
