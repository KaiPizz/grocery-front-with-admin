'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Trash2, Check, X, ImageIcon } from 'lucide-react';
import { useLanguage } from '@/i18n';

interface MediaItem {
  filename: string;
  url: string;
  size: number;
  modifiedAt: string;
}

const API_KEY = process.env.NEXT_PUBLIC_ADMIN_API_KEY || 'dev-admin-key-12345';

interface MediaLibraryProps {
  onSelect: (url: string) => void;
  onClose: () => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaLibrary({ onSelect, onClose }: MediaLibraryProps) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { t } = useLanguage();

  const fetchMedia = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/media', {
        headers: { 'x-api-key': API_KEY },
      });
      const json = await res.json();
      if (json.success) {
        setItems(json.data);
      } else {
        setError(json.error || t('mediaLibrary.loadError'));
      }
    } catch {
      setError(t('mediaLibrary.connectError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  async function handleDelete(filename: string) {
    if (!confirm(t('mediaLibrary.delete') + ` "${filename}"?`)) return;
    setDeleting(filename);
    try {
      await fetch(`/api/media?filename=${encodeURIComponent(filename)}`, {
        method: 'DELETE',
        headers: { 'x-api-key': API_KEY },
      });
      setItems(prev => prev.filter(i => i.filename !== filename));
      if (selected === items.find(i => i.filename === filename)?.url) {
        setSelected(null);
      }
    } catch {
      // ignore
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">{t('mediaLibrary.title')}</h2>
          <div className="flex items-center gap-2">
            {selected && (
              <button
                onClick={() => { onSelect(selected); onClose(); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700"
              >
                <Check className="w-3.5 h-3.5" /> {t('mediaLibrary.select')}
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> {t('mediaLibrary.loading')}
            </div>
          )}

          {error && (
            <div className="text-center py-12 text-sm text-red-500">{error}</div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="text-center py-12">
              <ImageIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">{t('mediaLibrary.empty')}</p>
              <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">{t('mediaLibrary.emptyHint')}</p>
            </div>
          )}

          {!loading && items.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {items.map((item) => (
                <div
                  key={item.filename}
                  className={`group relative rounded-xl border-2 overflow-hidden cursor-pointer transition-all ${
                    selected === item.url
                      ? 'border-indigo-500 ring-2 ring-indigo-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelected(item.url)}
                >
                  <div className="aspect-square bg-gray-50">
                    <img
                      src={item.url}
                      alt={item.filename}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 pt-6 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[9px] text-white truncate">{item.filename}</p>
                    <p className="text-[8px] text-white/70">{formatSize(item.size)}</p>
                  </div>
                  {selected === item.url && (
                    <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(item.filename); }}
                    disabled={deleting === item.filename}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                    title={t('mediaLibrary.delete')}
                  >
                    {deleting === item.filename ? (
                      <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                    ) : (
                      <Trash2 className="w-3 h-3 text-red-500" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 text-xs text-gray-400">
          {t('mediaLibrary.filesCount').replace('{count}', String(items.length))}
          {selected && (
            <span className="ml-2 text-indigo-500">
              • {t('mediaLibrary.selectedCount').replace('{count}', '1')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
