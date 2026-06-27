'use client';

import { useState, useRef } from 'react';
import { Upload, X, Loader2, FolderOpen, AlertCircle } from 'lucide-react';
import { uploadMedia } from '@/lib/api-client';
import { MediaLibrary } from '@/components/MediaLibrary';
import { useLanguage } from '@/i18n';

interface BannerImageUploaderProps {
  value: string | null;
  onChange: (url: string | null) => void;
  requiredWidth: number;
  requiredHeight: number;
  label?: string;
  required?: boolean;
}

type Translate = (key: string) => string;

function formatDimensionError(
  t: Translate,
  width: number,
  height: number,
  requiredWidth: number,
  requiredHeight: number
) {
  return t('homepage.blocks.dimensionError')
    .replace('{width}', String(width))
    .replace('{height}', String(height))
    .replace('{requiredWidth}', String(requiredWidth))
    .replace('{requiredHeight}', String(requiredHeight));
}

function checkDimensionsFromFile(
  t: Translate,
  file: File,
  reqW: number,
  reqH: number
): Promise<string | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const tolerance = 0.05;
      const wOk = img.width >= reqW * (1 - tolerance) && img.width <= reqW * (1 + tolerance);
      const hOk = img.height >= reqH * (1 - tolerance) && img.height <= reqH * (1 + tolerance);
      if (!wOk || !hOk) {
        resolve(
          formatDimensionError(t, img.width, img.height, reqW, reqH)
        );
      } else {
        resolve(null);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

function checkDimensionsFromUrl(
  t: Translate,
  src: string,
  reqW: number,
  reqH: number
): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const tolerance = 0.05;
      const wOk = img.width >= reqW * (1 - tolerance) && img.width <= reqW * (1 + tolerance);
      const hOk = img.height >= reqH * (1 - tolerance) && img.height <= reqH * (1 + tolerance);
      if (!wOk || !hOk) {
        resolve(
          formatDimensionError(t, img.width, img.height, reqW, reqH)
        );
      } else {
        resolve(null);
      }
    };
    img.onerror = () => resolve(t('homepage.blocks.dimensionLoadError'));
    img.src = src;
  });
}

export function BannerImageUploader({
  value,
  onChange,
  requiredWidth,
  requiredHeight,
  label,
  required,
}: BannerImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  async function handleFile(file: File) {
    setError(null);

    const dimError = await checkDimensionsFromFile(t, file, requiredWidth, requiredHeight);
    if (dimError) {
      setError(dimError);
      return;
    }

    try {
      setUploading(true);
      const result = await uploadMedia(file, {
        expectedWidth: requiredWidth,
        expectedHeight: requiredHeight,
      });
      onChange(result.url);
    } catch (err) {
      const message = err instanceof Error && err.message !== 'Upload failed'
        ? err.message
        : t('homepage.blocks.uploadFailed');
      setError(message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        {label && <p className="text-sm font-medium text-gray-700">{label}</p>}
        <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-xs font-mono text-indigo-600">
          {requiredWidth} × {requiredHeight} px
        </span>
      </div>

      {validating && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" /> {t('homepage.blocks.checkingDimensions')}
        </div>
      )}

      {value ? (
        <div className="relative inline-block">
          <img
            src={value}
            alt={t('homepage.blocks.uploadedBannerAlt')}
            className="h-20 w-auto max-w-xs rounded-lg border border-gray-200 object-contain bg-gray-50"
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
            title={t('homepage.blocks.removeImage')}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : !validating && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className={`flex items-center gap-2 rounded-lg border-2 border-dashed px-4 py-2.5 text-sm transition-colors disabled:opacity-50 ${
                required && !value
                  ? 'border-red-300 text-red-400 hover:border-red-400 hover:text-red-500'
                  : 'border-gray-300 text-gray-500 hover:border-indigo-400 hover:text-indigo-600'
              }`}
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {uploading ? t('common.uploading') : t('common.uploadImage')}
            </button>
            <button
              type="button"
              onClick={() => setShowLibrary(true)}
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
            >
              <FolderOpen className="w-4 h-4" />
              {t('common.library')}
            </button>
          </div>
          {required && (
            <p className="text-xs text-red-500">{t('homepage.blocks.imageRequired')}</p>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-1.5 text-xs text-red-600">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />

      {showLibrary && (
        <MediaLibrary
          onSelect={async (url) => {
            setShowLibrary(false);
            setError(null);
            setValidating(true);
            try {
              const dimError = await checkDimensionsFromUrl(t, url, requiredWidth, requiredHeight);
              if (dimError) {
                setError(dimError);
              } else {
                onChange(url);
              }
            } catch {
              setError(t('homepage.blocks.dimensionValidationFailed'));
            } finally {
              setValidating(false);
            }
          }}
          onClose={() => setShowLibrary(false)}
        />
      )}
    </div>
  );
}
