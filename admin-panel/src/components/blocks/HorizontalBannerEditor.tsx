'use client';

import { BannerImageUploader } from '@/components/blocks/BannerImageUploader';
import type { HorizontalBannerBlock } from '@/types/config';

interface HorizontalBannerEditorProps {
  block: HorizontalBannerBlock;
  onChange: (block: HorizontalBannerBlock) => void;
}

export function HorizontalBannerEditor({ block, onChange }: HorizontalBannerEditorProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <BannerImageUploader
          value={block.imageUrl}
          onChange={(url) => onChange({ ...block, imageUrl: url })}
          requiredWidth={1200}
          requiredHeight={300}
          label="Desktop image"
          required
        />
        <BannerImageUploader
          value={block.mobileImageUrl}
          onChange={(url) => onChange({ ...block, mobileImageUrl: url })}
          requiredWidth={768}
          requiredHeight={240}
          label="Mobile image"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input
          type="text"
          value={block.title}
          onChange={(e) => onChange({ ...block, title: e.target.value })}
          placeholder="Title (optional)"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
        />
        <input
          type="text"
          value={block.ctaText}
          onChange={(e) => onChange({ ...block, ctaText: e.target.value })}
          placeholder="Button text (optional)"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
        />
        <input
          type="text"
          value={block.ctaLink}
          onChange={(e) => onChange({ ...block, ctaLink: e.target.value })}
          placeholder="Link URL (optional)"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
        />
      </div>
    </div>
  );
}
