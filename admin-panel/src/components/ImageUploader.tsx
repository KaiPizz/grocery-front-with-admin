'use client';

import { useState, useRef } from 'react';
import { Upload, X, Loader2, FolderOpen } from 'lucide-react';
import { uploadMedia } from '@/lib/api-client';
import { resolvePreviewImageUrl } from '@/lib/preview-image-url';
import { MediaLibrary } from './MediaLibrary';
import { useLanguage } from '@/i18n';

interface ImageUploaderProps {
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
}

export function ImageUploader({ value, onChange, label }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();
  const previewUrl = resolvePreviewImageUrl(value);

  async function handleFile(file: File) {
    try {
      setUploading(true);
      setError(null);
      const result = await uploadMedia(file);
      onChange(result.url);
    } catch (err) {
      const message = err instanceof Error && err.message !== 'Upload failed'
        ? err.message
        : t('imageUploader.uploadFailed');
      setError(message);
    } finally {
      setUploading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div>
      {label && <p className="text-sm font-medium text-gray-700 mb-1.5">{label}</p>}
      {value ? (
        <div className="relative inline-block">
          <img
            src={previewUrl ?? value}
            alt={t('imageUploader.uploadedAlt')}
            className="h-20 w-auto rounded-lg border border-gray-200 object-contain bg-gray-50"
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
            title={t('imageUploader.remove')}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-50 transition-colors"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? t('common.uploading') : t('imageUploader.upload')}
          </button>
          <button
            type="button"
            onClick={() => setShowLibrary(true)}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
          >
            <FolderOpen className="w-4 h-4" />
            {t('imageUploader.library')}
          </button>
        </div>
      )}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
      {showLibrary && (
        <MediaLibrary
          onSelect={(url) => onChange(url)}
          onClose={() => setShowLibrary(false)}
        />
      )}
    </div>
  );
}
