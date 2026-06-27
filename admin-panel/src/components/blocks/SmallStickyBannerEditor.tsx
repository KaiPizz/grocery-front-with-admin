'use client';

import { BannerImageUploader } from '@/components/blocks/BannerImageUploader';
import { useLanguage } from '@/i18n';
import type { SmallStickyBannerBlock } from '@/types/config';

interface SmallStickyBannerEditorProps {
  block: SmallStickyBannerBlock;
  onChange: (block: SmallStickyBannerBlock) => void;
}

export function SmallStickyBannerEditor({ block, onChange }: SmallStickyBannerEditorProps) {
  const { t } = useLanguage();

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        {t('homepage.blocks.stickyHint')}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <BannerImageUploader
          value={block.desktopImageUrl}
          onChange={(url) => onChange({ ...block, desktopImageUrl: url })}
          requiredWidth={728}
          requiredHeight={90}
          label={t('homepage.blocks.desktopImage')}
          required
        />
        <BannerImageUploader
          value={block.mobileImageUrl}
          onChange={(url) => onChange({ ...block, mobileImageUrl: url })}
          requiredWidth={320}
          requiredHeight={50}
          label={t('homepage.blocks.mobileImage')}
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input
          type="text"
          value={block.title}
          onChange={(e) => onChange({ ...block, title: e.target.value })}
          placeholder={t('homepage.blocks.titleOptional')}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
        />
        <input
          type="text"
          value={block.ctaText}
          onChange={(e) => onChange({ ...block, ctaText: e.target.value })}
          placeholder={t('homepage.blocks.buttonTextOptional')}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
        />
        <input
          type="text"
          value={block.ctaLink}
          onChange={(e) => onChange({ ...block, ctaLink: e.target.value })}
          placeholder={t('homepage.blocks.linkUrlOptional')}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
        />
      </div>

      <div className="flex items-center gap-6 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1.5">{t('homepage.blocks.position')}</p>
          <div className="flex gap-2">
            {(['top', 'bottom'] as const).map((pos) => (
              <button
                key={pos}
                type="button"
                onClick={() => onChange({ ...block, position: pos })}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                  block.position === pos
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-300 text-gray-600 hover:border-indigo-300'
                }`}
              >
                {pos === 'top' ? t('homepage.blocks.positionTop') : t('homepage.blocks.positionBottom')}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 ml-auto">
          <input
            type="checkbox"
            checked={block.dismissible}
            onChange={(e) => onChange({ ...block, dismissible: e.target.checked })}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          {t('homepage.blocks.dismissible')}
        </label>
      </div>
    </div>
  );
}
