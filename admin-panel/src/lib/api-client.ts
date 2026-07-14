import type { StorefrontConfig, ConfigEnvelope } from '@/types/config';

const BASE = '';
const draftVersions = new Map<string, number>();

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  details?: unknown;
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    ...options,
    credentials: 'same-origin',
    headers: {
      ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options?.headers ?? {}),
    },
  });

  let json: ApiResponse<T>;
  try {
    json = await res.json() as ApiResponse<T>;
  } catch {
    throw new Error(`API error: ${res.status}`);
  }

  if (!res.ok || !json.success) {
    const detail = (json as unknown as Record<string, unknown>).details;
    const msg = detail
      ? `${json.error}: ${JSON.stringify(detail)}`
      : json.error || `API error: ${res.status}`;
    throw new Error(msg);
  }

  return json.data;
}

export async function fetchDraftConfig(slug: string): Promise<ConfigEnvelope> {
  const envelope = await apiFetch<ConfigEnvelope>(`/api/config/${slug}?draft=true`, {
    cache: 'no-store',
  });
  draftVersions.set(slug, envelope.version);
  return envelope;
}

export async function fetchPublishedConfig(slug: string): Promise<ConfigEnvelope> {
  return apiFetch<ConfigEnvelope>(`/api/config/${slug}`);
}

export async function saveDraft(slug: string, config: StorefrontConfig): Promise<ConfigEnvelope> {
  const expectedVersion = requireDraftVersion(slug);
  const envelope = await apiFetch<ConfigEnvelope>(`/api/config/${slug}`, {
    method: 'PUT',
    headers: { 'If-Match': String(expectedVersion) },
    body: JSON.stringify(config),
  });
  draftVersions.set(slug, envelope.version);
  return envelope;
}

export async function patchDraft(slug: string, partial: Partial<StorefrontConfig>): Promise<ConfigEnvelope> {
  const expectedVersion = requireDraftVersion(slug);
  const envelope = await apiFetch<ConfigEnvelope>(`/api/config/${slug}`, {
    method: 'PATCH',
    headers: { 'If-Match': String(expectedVersion) },
    body: JSON.stringify(partial),
  });
  draftVersions.set(slug, envelope.version);
  return envelope;
}

export async function publishConfig(slug: string): Promise<ConfigEnvelope> {
  const expectedVersion = requireDraftVersion(slug);
  const envelope = await apiFetch<ConfigEnvelope>(`/api/config/${slug}/publish`, {
    method: 'POST',
    headers: { 'If-Match': String(expectedVersion) },
  });
  draftVersions.set(slug, envelope.version);
  return envelope;
}

export async function uploadMedia(
  file: File,
  options?: { expectedWidth?: number; expectedHeight?: number }
): Promise<{ url: string; filename: string }> {
  const formData = new FormData();
  formData.append('file', file);
  if (options?.expectedWidth) formData.append('expectedWidth', String(options.expectedWidth));
  if (options?.expectedHeight) formData.append('expectedHeight', String(options.expectedHeight));

  const res = await fetch(`${BASE}/api/media/upload`, {
    method: 'POST',
    credentials: 'same-origin',
    body: formData,
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Upload failed');
  }

  return json.data;
}

function requireDraftVersion(slug: string): number {
  const version = draftVersions.get(slug);
  if (version === undefined) {
    throw new Error('Draft version is unavailable. Reload the admin page and try again.');
  }
  return version;
}
