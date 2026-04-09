'use client';

import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { BannerImageUploader } from '@/components/blocks/BannerImageUploader';
import type { HeroBannerBlock, HeroSlide } from '@/types/config';

interface HeroBannerEditorProps {
  block: HeroBannerBlock;
  onChange: (block: HeroBannerBlock) => void;
}

function defaultSlide(): HeroSlide {
  return {
    id: `hero-slide-${Date.now()}`,
    imageUrl: null,
    mobileImageUrl: null,
    title: '',
    ctaText: 'Shop Now',
    ctaLink: '/products',
    enabled: true,
  };
}

export function HeroBannerEditor({ block, onChange }: HeroBannerEditorProps) {
  function updateSlide(index: number, partial: Partial<HeroSlide>) {
    const slides = [...block.slides];
    slides[index] = { ...slides[index], ...partial };
    onChange({ ...block, slides });
  }

  function addSlide() {
    if (block.slides.length >= 5) return;
    onChange({ ...block, slides: [...block.slides, defaultSlide()] });
  }

  function removeSlide(index: number) {
    if (block.slides.length <= 1) return;
    onChange({ ...block, slides: block.slides.filter((_, i) => i !== index) });
  }

  function moveSlide(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= block.slides.length) return;
    const slides = [...block.slides];
    [slides[index], slides[next]] = [slides[next], slides[index]];
    onChange({ ...block, slides });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
          <input
            type="checkbox"
            checked={block.autoPlay}
            onChange={(e) => onChange({ ...block, autoPlay: e.target.checked })}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          Auto-play slides
        </label>
        {block.autoPlay && (
          <select
            value={block.autoPlayInterval}
            onChange={(e) => onChange({ ...block, autoPlayInterval: Number(e.target.value) })}
            className="rounded-md border border-gray-300 px-2.5 py-1 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
          >
            <option value={3000}>3 s</option>
            <option value={4000}>4 s</option>
            <option value={5000}>5 s</option>
            <option value={7000}>7 s</option>
          </select>
        )}
        <span className="ml-auto text-xs text-gray-400">{block.slides.length} / 5 slides</span>
      </div>

      <div className="space-y-3">
        {block.slides.map((slide, index) => (
          <div key={slide.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={slide.enabled}
                    onChange={(e) => updateSlide(index, { enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-gray-200 rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4" />
                </label>
                <span className="text-sm font-medium text-gray-700">Slide {index + 1}</span>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => moveSlide(index, -1)} disabled={index === 0} className="p-1 rounded hover:bg-gray-200 disabled:opacity-30">
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => moveSlide(index, 1)} disabled={index === block.slides.length - 1} className="p-1 rounded hover:bg-gray-200 disabled:opacity-30">
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => removeSlide(index)} disabled={block.slides.length <= 1} className="p-1 rounded hover:bg-red-100 text-red-500 disabled:opacity-30">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <BannerImageUploader
                value={slide.imageUrl}
                onChange={(url) => updateSlide(index, { imageUrl: url })}
                requiredWidth={1920}
                requiredHeight={600}
                label="Desktop image"
                required
              />
              <BannerImageUploader
                value={slide.mobileImageUrl}
                onChange={(url) => updateSlide(index, { mobileImageUrl: url })}
                requiredWidth={768}
                requiredHeight={480}
                label="Mobile image"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
              <input
                type="text"
                value={slide.title}
                onChange={(e) => updateSlide(index, { title: e.target.value })}
                placeholder="Title (optional)"
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
              />
              <input
                type="text"
                value={slide.ctaText}
                onChange={(e) => updateSlide(index, { ctaText: e.target.value })}
                placeholder="Button text"
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
              />
              <input
                type="text"
                value={slide.ctaLink}
                onChange={(e) => updateSlide(index, { ctaLink: e.target.value })}
                placeholder="/products"
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
              />
            </div>
          </div>
        ))}
      </div>

      {block.slides.length < 5 && (
        <button
          type="button"
          onClick={addSlide}
          className="inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add slide
        </button>
      )}
    </div>
  );
}
