import type { StorefrontConfig, ConfigEnvelope } from '@/types/config';

const API_KEY = process.env.NEXT_PUBLIC_ADMIN_API_KEY || 'dev-admin-key-12345';
const BASE = '';

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
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      ...(options?.headers ?? {}),
    },
  });

  const json: ApiResponse<T> = await res.json();

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
  return apiFetch<ConfigEnvelope>(`/api/config/${slug}?draft=true`);
}

export async function fetchPublishedConfig(slug: string): Promise<ConfigEnvelope> {
  return apiFetch<ConfigEnvelope>(`/api/config/${slug}`);
}

export async function saveDraft(slug: string, config: StorefrontConfig): Promise<ConfigEnvelope> {
  return apiFetch<ConfigEnvelope>(`/api/config/${slug}`, {
    method: 'PUT',
    body: JSON.stringify(config),
  });
}

export async function patchDraft(slug: string, partial: Partial<StorefrontConfig>): Promise<ConfigEnvelope> {
  return apiFetch<ConfigEnvelope>(`/api/config/${slug}`, {
    method: 'PATCH',
    body: JSON.stringify(partial),
  });
}

export async function publishConfig(slug: string): Promise<ConfigEnvelope> {
  return apiFetch<ConfigEnvelope>(`/api/config/${slug}/publish`, {
    method: 'POST',
  });
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
    headers: { 'x-api-key': API_KEY },
    body: formData,
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Upload failed');
  }

  return json.data;
}
