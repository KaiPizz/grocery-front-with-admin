'use client';

import { BannerImageUploader } from '@/components/blocks/BannerImageUploader';
import { useLanguage } from '@/i18n';
import type { SidebarBannerBlock } from '@/types/config';

interface SidebarBannerEditorProps {
  block: SidebarBannerBlock;
  onChange: (block: SidebarBannerBlock) => void;
}

export function SidebarBannerEditor({ block, onChange }: SidebarBannerEditorProps) {
  const { t } = useLanguage();

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        {t('homepage.blocks.sidebarHint')}
      </p>
      <BannerImageUploader
        value={block.imageUrl}
        onChange={(url) => onChange({ ...block, imageUrl: url })}
        requiredWidth={300}
        requiredHeight={600}
        label={t('homepage.blocks.sidebarImage')}
        required
      />
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
    </div>
  );
}
