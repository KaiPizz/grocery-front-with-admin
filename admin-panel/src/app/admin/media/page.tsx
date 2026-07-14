'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Loader2, Trash2, Upload, ImageIcon, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { uploadMedia } from '@/lib/api-client';
import { useLanguage } from '@/i18n';

interface MediaItem {
  filename: string;
  url: string;
  size: number;
  modifiedAt: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  const fetchMedia = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/media', {
        credentials: 'same-origin',
        cache: 'no-store',
      });
      const json = await res.json();
      if (json.success) setItems(json.data);
    } catch {
      toast.error(t('media.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { fetchMedia(); }, [fetchMedia]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      await uploadMedia(file);
      toast.success(t('media.uploadSuccess'));
      fetchMedia();
    } catch (err) {
      const message = err instanceof Error && err.message !== 'Upload failed'
        ? err.message
        : t('imageUploader.uploadFailed');
      toast.error(message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function handleDelete(filename: string) {
    if (!confirm(t('media.deleteConfirm').replace('{filename}', filename))) return;
    setDeleting(filename);
    try {
      const response = await fetch(`/api/media?filename=${encodeURIComponent(filename)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      if (!response.ok) throw new Error('Delete failed');
      setItems(prev => prev.filter(i => i.filename !== filename));
      toast.success(t('media.deleteSuccess'));
    } catch {
      toast.error(t('media.deleteError'));
    } finally {
      setDeleting(null);
    }
  }

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    toast.success(t('media.copyUrlSuccess'));
    setTimeout(() => setCopiedUrl(null), 2000);
  }

  const totalSize = items.reduce((sum, i) => sum + i.size, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageHeader title={t('media.title')} description={t('media.description')} />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shrink-0"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? t('common.uploading') : t('media.uploadButton')}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/x-icon"
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
        <span>{items.length} file{items.length !== 1 ? 's' : ''}</span>
        <span>•</span>
        <span>{formatSize(totalSize)} {t('media.totalSize')}</span>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> {t('common.loading')}
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="text-center py-16 rounded-xl border border-dashed border-gray-300 bg-gray-50">
          <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 mb-1">{t('media.emptyTitle')}</p>
          <p className="text-xs text-gray-400">{t('media.emptySubtitle')}</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {items.map((item) => (
            <div
              key={item.filename}
              className="group rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="aspect-square bg-gray-50 relative">
                <img
                  src={item.url}
                  alt={item.filename}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => copyUrl(item.url)}
                    className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center hover:bg-white shadow-sm"
                    title={t('common.copyUrl')}
                  >
                    {copiedUrl === item.url ? (
                      <Check className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-gray-600" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(item.filename)}
                    disabled={deleting === item.filename}
                    className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center hover:bg-red-50 shadow-sm"
                    title={t('common.delete')}
                  >
                    {deleting === item.filename ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    )}
                  </button>
                </div>
              </div>
              <div className="px-3 py-2">
                <p className="text-[11px] font-medium text-gray-700 truncate" title={item.filename}>{item.filename}</p>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-[10px] text-gray-400">{formatSize(item.size)}</p>
                  <p className="text-[10px] text-gray-400">{new Date(item.modifiedAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
