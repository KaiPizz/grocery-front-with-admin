'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import type { StorefrontConfig } from '@/types/config';
import { fetchDraftConfig, saveDraft, publishConfig as publishConfigApi } from '@/lib/api-client';
import { DEFAULT_CONFIG } from '@/lib/defaults';
import { getAdminReadiness, type ReadinessIssue } from '@/lib/admin-readiness';
import { useLanguage } from '@/i18n';
import { getClientSalonSlug } from '@/lib/client-config';

const SLUG = getClientSalonSlug();
const HISTORY_LIMIT = 50;

const PUBLISH_BLOCKER_TRANSLATION_KEYS: Record<string, string> = {
  'homepage.hero-slide-image-missing': 'toast.publishBlockers.heroSlideImageMissing',
  'homepage.horizontal-image-missing': 'toast.publishBlockers.horizontalImageMissing',
  'homepage.grid-item-image-missing': 'toast.publishBlockers.gridItemImageMissing',
  'homepage.round-grid-item-image-missing': 'toast.publishBlockers.roundGridItemImageMissing',
  'homepage.sidebar-image-missing': 'toast.publishBlockers.sidebarImageMissing',
  'homepage.sticky-desktop-image-missing': 'toast.publishBlockers.stickyDesktopImageMissing',
  'homepage.sticky-mobile-image-missing': 'toast.publishBlockers.stickyMobileImageMissing',
  'tracking.facebook-pixel-id-missing': 'toast.publishBlockers.facebookPixelIdMissing',
  'tracking.google-analytics-id-missing': 'toast.publishBlockers.googleAnalyticsIdMissing',
  'tracking.google-tag-manager-id-missing': 'toast.publishBlockers.googleTagManagerIdMissing',
  'tracking.hotjar-id-missing': 'toast.publishBlockers.hotjarIdMissing',
};

function getTranslatedPublishBlockerMessage(t: (key: string) => string, issue: ReadinessIssue | undefined): string {
  if (!issue) return t('toast.publishBlockedDefault');
  const key = PUBLISH_BLOCKER_TRANSLATION_KEYS[issue.id];
  return key ? t(key) : t('toast.publishBlockedDefault');
}

interface UseConfigReturn {
  config: StorefrontConfig;
  loading: boolean;
  saving: boolean;
  publishing: boolean;
  error: string | null;
  lastSaved: string | null;
  isDirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  updateConfig: (updater: (prev: StorefrontConfig) => StorefrontConfig) => void;
  updateSection: <K extends keyof StorefrontConfig>(key: K, value: StorefrontConfig[K]) => void;
  save: () => Promise<void>;
  publish: () => Promise<void>;
  reload: () => Promise<void>;
  undo: () => void;
  redo: () => void;
}

export function useConfig(): UseConfigReturn {
  const { t } = useLanguage();
  const [config, setConfig] = useState<StorefrontConfig>(DEFAULT_CONFIG);
  const [savedConfig, setSavedConfig] = useState<StorefrontConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const mountedRef = useRef(true);
  const historyRef = useRef<StorefrontConfig[]>([DEFAULT_CONFIG]);
  const historyIndexRef = useRef<number>(0);

  const syncHistoryFlags = useCallback(() => {
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, []);

  const pushToHistory = useCallback((newConfig: StorefrontConfig) => {
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    if (historyRef.current.length >= HISTORY_LIMIT) {
      historyRef.current = historyRef.current.slice(historyRef.current.length - HISTORY_LIMIT + 1);
    }
    historyRef.current.push(newConfig);
    historyIndexRef.current = historyRef.current.length - 1;
    syncHistoryFlags();
  }, [syncHistoryFlags]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const envelope = await fetchDraftConfig(SLUG);
      if (mountedRef.current) {
        setConfig(envelope.config);
        setSavedConfig(envelope.config);
        setLastSaved(envelope.updatedAt);
        historyRef.current = [envelope.config];
        historyIndexRef.current = 0;
        setCanUndo(false);
        setCanRedo(false);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : t('toast.loadConfigFailed'));
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => { mountedRef.current = false; };
  }, [load]);

  const updateConfig = useCallback((updater: (prev: StorefrontConfig) => StorefrontConfig) => {
    let next: StorefrontConfig | undefined;
    setConfig(prev => {
      next = updater(prev);
      return next;
    });
    if (next) pushToHistory(next);
  }, [pushToHistory]);

  const updateSection = useCallback(<K extends keyof StorefrontConfig>(key: K, value: StorefrontConfig[K]) => {
    let next: StorefrontConfig | undefined;
    setConfig(prev => {
      next = { ...prev, [key]: value };
      return next;
    });
    if (next) pushToHistory(next);
  }, [pushToHistory]);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    setConfig(historyRef.current[historyIndexRef.current]);
    syncHistoryFlags();
  }, [syncHistoryFlags]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    setConfig(historyRef.current[historyIndexRef.current]);
    syncHistoryFlags();
  }, [syncHistoryFlags]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const save = useCallback(async () => {
    try {
      setSaving(true);
      setError(null);
      const envelope = await saveDraft(SLUG, config);
      if (mountedRef.current) {
        setSavedConfig(envelope.config);
        setLastSaved(envelope.updatedAt);
      }
      toast.success(t('toast.draftSaved'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('toast.saveFailed');
      if (mountedRef.current) setError(msg);
      toast.error(t('toast.saveDraftFailed'), { description: msg });
      throw err;
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }, [config, t]);

  const publish = useCallback(async () => {
    const readiness = getAdminReadiness(config);
    if (!readiness.canPublish) {
      const msg = getTranslatedPublishBlockerMessage(t, readiness.blockingIssues[0]);
      setError(msg);
      toast.error(t('toast.publishFailed'), { description: msg });
      throw new Error(msg);
    }

    try {
      setPublishing(true);
      setError(null);
      await saveDraft(SLUG, config);
      const envelope = await publishConfigApi(SLUG);
      if (mountedRef.current) {
        setSavedConfig(envelope.config);
        setLastSaved(envelope.updatedAt);
      }
      toast.success(t('toast.published'), { description: t('toast.publishedDescription') });
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('toast.publishFailed');
      if (mountedRef.current) setError(msg);
      toast.error(t('toast.publishFailed'), { description: msg });
      throw err;
    } finally {
      if (mountedRef.current) setPublishing(false);
    }
  }, [config, t]);

  const isDirty = useMemo(
    () => JSON.stringify(config) !== JSON.stringify(savedConfig),
    [config, savedConfig]
  );

  return {
    config,
    loading,
    saving,
    publishing,
    error,
    lastSaved,
    isDirty,
    canUndo,
    canRedo,
    updateConfig,
    updateSection,
    save,
    publish,
    reload: load,
    undo,
    redo,
  };
}
