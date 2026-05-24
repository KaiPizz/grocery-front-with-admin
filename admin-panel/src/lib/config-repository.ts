import fs from 'fs/promises';
import path from 'path';
import type { StorefrontConfig, ConfigEnvelope } from '@/types/config';
import { DEFAULT_CONFIG } from './defaults';

const DATA_DIR = path.join(process.cwd(), 'data');

function configPath(slug: string): string {
  const safe = slug.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(DATA_DIR, `config-${safe}.json`);
}

async function ensureDataDir(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // directory already exists
  }
}

export function withConfigDefaults(config: StorefrontConfig): StorefrontConfig {
  return {
    ...config,
    general: {
      ...config.general,
      fulfillment: config.general.fulfillment ?? DEFAULT_CONFIG.general.fulfillment,
    },
    commercial: config.commercial ?? DEFAULT_CONFIG.commercial,
  };
}

export interface StoredConfig {
  slug: string;
  published: StorefrontConfig;
  draft: StorefrontConfig;
  version: number;
  updatedAt: string;
}

/**
 * Read the full stored config (published + draft) for a slug.
 * Returns null if no config file exists.
 */
export async function readStoredConfig(slug: string): Promise<StoredConfig | null> {
  try {
    const raw = await fs.readFile(configPath(slug), 'utf-8');
    return JSON.parse(raw) as StoredConfig;
  } catch {
    return null;
  }
}

/**
 * Get the published config envelope for a slug.
 * Falls back to DEFAULT_CONFIG if no config file exists.
 */
export async function getPublishedConfig(slug: string): Promise<ConfigEnvelope> {
  const stored = await readStoredConfig(slug);

  if (!stored) {
    return {
      slug,
      config: DEFAULT_CONFIG,
      version: 0,
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    slug: stored.slug,
    config: withConfigDefaults(stored.published),
    version: stored.version,
    updatedAt: stored.updatedAt,
  };
}

/**
 * Get the draft config envelope for a slug (used by admin panel).
 * Falls back to DEFAULT_CONFIG if no config file exists.
 */
export async function getDraftConfig(slug: string): Promise<ConfigEnvelope> {
  const stored = await readStoredConfig(slug);

  if (!stored) {
    return {
      slug,
      config: DEFAULT_CONFIG,
      version: 0,
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    slug: stored.slug,
    config: withConfigDefaults(stored.draft),
    version: stored.version,
    updatedAt: stored.updatedAt,
  };
}

/**
 * Save a full config replacement (updates draft).
 * Uses atomic write: write to temp file, then rename.
 */
export async function saveDraftConfig(slug: string, config: StorefrontConfig): Promise<StoredConfig> {
  await ensureDataDir();

  const existing = await readStoredConfig(slug);
  const now = new Date().toISOString();

  const stored: StoredConfig = {
    slug,
    published: existing?.published ? withConfigDefaults(existing.published) : DEFAULT_CONFIG,
    draft: config,
    version: (existing?.version ?? 0) + 1,
    updatedAt: now,
  };

  const filePath = configPath(slug);
  const tempPath = filePath + '.tmp';
  await fs.writeFile(tempPath, JSON.stringify(stored, null, 2), 'utf-8');
  await fs.rename(tempPath, filePath);

  return stored;
}

/**
 * Merge a partial config into the existing draft.
 */
export async function patchDraftConfig(
  slug: string,
  partial: Partial<StorefrontConfig>
): Promise<StoredConfig> {
  const existing = await readStoredConfig(slug);
  const currentDraft = existing?.draft ? withConfigDefaults(existing.draft) : DEFAULT_CONFIG;

  const merged: StorefrontConfig = {
    branding: partial.branding ? { ...currentDraft.branding, ...partial.branding, colors: { ...currentDraft.branding.colors, ...(partial.branding?.colors ?? {}) } } : currentDraft.branding,
    homepage: partial.homepage ? { ...currentDraft.homepage, ...partial.homepage } : currentDraft.homepage,
    layout: partial.layout ? {
      ...currentDraft.layout,
      ...partial.layout,
      header: partial.layout?.header ? { ...currentDraft.layout.header, ...partial.layout.header } : currentDraft.layout.header,
      footer: partial.layout?.footer ? { ...currentDraft.layout.footer, ...partial.layout.footer } : currentDraft.layout.footer,
    } : currentDraft.layout,
    tracking: partial.tracking ? {
      ...currentDraft.tracking,
      ...partial.tracking,
      facebookPixel: partial.tracking?.facebookPixel ? { ...currentDraft.tracking.facebookPixel, ...partial.tracking.facebookPixel } : currentDraft.tracking.facebookPixel,
      googleAnalytics: partial.tracking?.googleAnalytics ? { ...currentDraft.tracking.googleAnalytics, ...partial.tracking.googleAnalytics } : currentDraft.tracking.googleAnalytics,
      googleTagManager: partial.tracking?.googleTagManager ? { ...currentDraft.tracking.googleTagManager, ...partial.tracking.googleTagManager } : currentDraft.tracking.googleTagManager,
      hotjar: partial.tracking?.hotjar ? { ...currentDraft.tracking.hotjar, ...partial.tracking.hotjar } : currentDraft.tracking.hotjar,
    } : currentDraft.tracking,
    seo: partial.seo ? { ...currentDraft.seo, ...partial.seo } : currentDraft.seo,
    general: partial.general ? {
      ...currentDraft.general,
      ...partial.general,
      policyLinks: partial.general?.policyLinks ? { ...currentDraft.general.policyLinks, ...partial.general.policyLinks } : currentDraft.general.policyLinks,
      fulfillment: partial.general?.fulfillment ? { ...currentDraft.general.fulfillment, ...partial.general.fulfillment } : currentDraft.general.fulfillment,
    } : currentDraft.general,
    commercial: partial.commercial ? {
      ...currentDraft.commercial,
      ...partial.commercial,
      outlet: partial.commercial?.outlet ? { ...currentDraft.commercial.outlet, ...partial.commercial.outlet } : currentDraft.commercial.outlet,
    } : currentDraft.commercial,
  };

  return saveDraftConfig(slug, merged);
}

/**
 * Publish: copy draft → published.
 */
export async function publishConfig(slug: string): Promise<StoredConfig> {
  await ensureDataDir();

  const existing = await readStoredConfig(slug);

  if (!existing) {
    // Nothing to publish, save defaults as both draft and published
    const now = new Date().toISOString();
    const stored: StoredConfig = {
      slug,
      published: DEFAULT_CONFIG,
      draft: DEFAULT_CONFIG,
      version: 1,
      updatedAt: now,
    };
    const filePath = configPath(slug);
    const tempPath = filePath + '.tmp';
    await fs.writeFile(tempPath, JSON.stringify(stored, null, 2), 'utf-8');
    await fs.rename(tempPath, filePath);
    return stored;
  }

  const stored: StoredConfig = {
    ...existing,
    published: withConfigDefaults(existing.draft),
    version: existing.version + 1,
    updatedAt: new Date().toISOString(),
  };

  const filePath = configPath(slug);
  const tempPath = filePath + '.tmp';
  await fs.writeFile(tempPath, JSON.stringify(stored, null, 2), 'utf-8');
  await fs.rename(tempPath, filePath);

  return stored;
}
