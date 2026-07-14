import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import type { StorefrontConfig, ConfigEnvelope } from '@/types/config';
import { DEFAULT_CONFIG } from './defaults';
import { getAdminReadiness, getPublishBlockerMessage, type ReadinessIssue } from './admin-readiness';
import { isValidConfigSlug } from './admin-tenant';
import { getAdminDataDir } from './admin-storage';

const writeQueues = new Map<string, Promise<void>>();

function configPath(slug: string): string {
  if (!isValidConfigSlug(slug)) throw new TypeError('Invalid config slug');
  return path.join(
    /* turbopackIgnore: true */ getAdminDataDir(),
    `config-${slug}.json`
  );
}

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(getAdminDataDir(), { recursive: true, mode: 0o750 });
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

export class PublishValidationError extends Error {
  constructor(
    message: string,
    public readonly blockingIssues: ReadinessIssue[]
  ) {
    super(message);
    this.name = 'PublishValidationError';
  }
}

export class ConfigVersionConflictError extends Error {
  constructor(
    public readonly expectedVersion: number,
    public readonly actualVersion: number
  ) {
    super('The draft changed since it was loaded');
    this.name = 'ConfigVersionConflictError';
  }
}

function assertExpectedVersion(existing: StoredConfig | null, expectedVersion: number): void {
  const actualVersion = existing?.version ?? 0;
  if (expectedVersion !== actualVersion) {
    throw new ConfigVersionConflictError(expectedVersion, actualVersion);
  }
}

async function withWriteLock<T>(slug: string, action: () => Promise<T>): Promise<T> {
  const previous = writeQueues.get(slug) ?? Promise.resolve();
  const run = previous.then(action, action);
  const tail = run.then(() => undefined, () => undefined);
  writeQueues.set(slug, tail);

  try {
    return await run;
  } finally {
    if (writeQueues.get(slug) === tail) writeQueues.delete(slug);
  }
}

async function writeStoredConfig(slug: string, stored: StoredConfig): Promise<void> {
  await ensureDataDir();
  const filePath = configPath(slug);
  const tempPath = `${filePath}.tmp-${process.pid}-${randomUUID()}`;

  try {
    await fs.writeFile(tempPath, JSON.stringify(stored, null, 2), {
      encoding: 'utf-8',
      flag: 'wx',
      mode: 0o600,
    });
    await fs.rename(tempPath, filePath);
  } finally {
    try {
      await fs.unlink(tempPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
}

/**
 * Read the full stored config (published + draft) for a slug.
 * Returns null if no config file exists.
 */
export async function readStoredConfig(slug: string): Promise<StoredConfig | null> {
  try {
    const raw = await fs.readFile(configPath(slug), 'utf-8');
    return JSON.parse(raw) as StoredConfig;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
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
export async function saveDraftConfig(
  slug: string,
  config: StorefrontConfig,
  expectedVersion: number
): Promise<StoredConfig> {
  return withWriteLock(slug, async () => {
    const existing = await readStoredConfig(slug);
    assertExpectedVersion(existing, expectedVersion);

    const stored: StoredConfig = {
      slug,
      published: existing?.published ? withConfigDefaults(existing.published) : DEFAULT_CONFIG,
      draft: withConfigDefaults(config),
      version: (existing?.version ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    };

    await writeStoredConfig(slug, stored);
    return stored;
  });
}

/**
 * Merge a partial config into the existing draft.
 */
export async function patchDraftConfig(
  slug: string,
  partial: Partial<StorefrontConfig>,
  expectedVersion: number
): Promise<StoredConfig> {
  return withWriteLock(slug, async () => {
    const existing = await readStoredConfig(slug);
    assertExpectedVersion(existing, expectedVersion);
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

    const stored: StoredConfig = {
      slug,
      published: existing?.published ? withConfigDefaults(existing.published) : DEFAULT_CONFIG,
      draft: withConfigDefaults(merged),
      version: (existing?.version ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    };
    await writeStoredConfig(slug, stored);
    return stored;
  });
}

/**
 * Publish: copy draft → published.
 */
export async function publishConfig(slug: string, expectedVersion: number): Promise<StoredConfig> {
  return withWriteLock(slug, async () => {
    const existing = await readStoredConfig(slug);
    assertExpectedVersion(existing, expectedVersion);

    const draft = existing?.draft ? withConfigDefaults(existing.draft) : DEFAULT_CONFIG;
    const readiness = getAdminReadiness(draft);
    if (!readiness.canPublish) {
      throw new PublishValidationError(
        getPublishBlockerMessage(readiness.blockingIssues[0]),
        readiness.blockingIssues
      );
    }

    const stored: StoredConfig = {
      slug,
      published: draft,
      draft,
      version: (existing?.version ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    };

    await writeStoredConfig(slug, stored);
    return stored;
  });
}
