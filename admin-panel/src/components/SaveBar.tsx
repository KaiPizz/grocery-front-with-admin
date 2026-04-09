'use client';

import { Loader2, Save, Upload, Undo2, Redo2 } from 'lucide-react';
import { useLanguage } from '@/i18n';

interface SaveBarProps {
  isDirty: boolean;
  saving: boolean;
  publishing: boolean;
  lastSaved: string | null;
  error: string | null;
  onSave: () => void;
  onPublish: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export function SaveBar({ isDirty, saving, publishing, lastSaved, error, onSave, onPublish, canUndo, canRedo, onUndo, onRedo }: SaveBarProps) {
  const { t } = useLanguage();
  return (
    <div className="sticky bottom-0 z-20 border-t border-gray-200 bg-white px-4 py-3 flex items-center justify-between gap-4 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.05)]">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo || saving || publishing}
          title={t('common.undo')}
          className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white p-1.5 text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo || saving || publishing}
          title={t('common.redo')}
          className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white p-1.5 text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Redo2 className="w-4 h-4" />
        </button>
        <div className="text-xs text-gray-400 ml-2 min-w-0 truncate">
          {error && <span className="text-red-500 font-medium">{error}</span>}
          {!error && lastSaved && (
            <span>{t('common.lastSaved')} {new Date(lastSaved).toLocaleString()}</span>
          )}
          {!error && !lastSaved && <span>{t('common.noChanges')}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onSave}
          disabled={!isDirty || saving || publishing}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? t('common.saving') : t('common.saveDraft')}
        </button>
        <button
          type="button"
          onClick={onPublish}
          disabled={saving || publishing}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {publishing ? t('common.publishing') : t('common.publish')}
        </button>
      </div>
    </div>
  );
}
