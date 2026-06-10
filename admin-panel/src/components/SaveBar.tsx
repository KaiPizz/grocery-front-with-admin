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
    <div className="sticky bottom-0 z-20 border-t border-slate-200 bg-white/95 px-3 py-3 shadow-[0_-12px_28px_-22px_rgba(15,23,42,0.35)] backdrop-blur sm:px-4">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo || saving || publishing}
              title={t('common.undo')}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo || saving || publishing}
              title={t('common.redo')}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Redo2 className="h-4 w-4" />
            </button>
          </div>
          <div className="min-w-0 truncate text-xs text-slate-500">
            {error && <span className="font-medium text-red-600">{error}</span>}
            {!error && lastSaved && (
              <span>{t('common.lastSaved')} {new Date(lastSaved).toLocaleString()}</span>
            )}
            {!error && !lastSaved && <span>{t('common.noChanges')}</span>}
          </div>
        </div>
        <div className="grid w-full shrink-0 grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
          <button
            type="button"
            onClick={onSave}
            disabled={!isDirty || saving || publishing}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span className="truncate">{saving ? t('common.saving') : t('common.saveDraft')}</span>
          </button>
          <button
            type="button"
            onClick={onPublish}
            disabled={saving || publishing}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            <span className="truncate">{publishing ? t('common.publishing') : t('common.publish')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
