import path from 'path';
import type { NextRequest } from 'next/server';

export class AdminStorageConfigurationError extends Error {
  constructor(variable: string) {
    super(`${variable} is not configured`);
    this.name = 'AdminStorageConfigurationError';
  }
}

function resolveStorageDir(variable: 'ADMIN_DATA_DIR' | 'ADMIN_UPLOAD_DIR', devFallback: string): string {
  const configured = process.env[variable]?.trim();

  if (!configured) {
    if (process.env.NODE_ENV === 'production') {
      throw new AdminStorageConfigurationError(variable);
    }
    return path.join(/* turbopackIgnore: true */ process.cwd(), devFallback);
  }

  if (process.env.NODE_ENV === 'production' && !path.isAbsolute(configured)) {
    throw new AdminStorageConfigurationError(variable);
  }

  return path.resolve(/* turbopackIgnore: true */ configured);
}

export function getAdminDataDir(): string {
  return resolveStorageDir('ADMIN_DATA_DIR', 'data');
}

export function getAdminUploadDir(): string {
  return resolveStorageDir('ADMIN_UPLOAD_DIR', path.join('public', 'uploads'));
}

export function getAdminPublicOrigin(request: NextRequest): string {
  const configured = process.env.ADMIN_PUBLIC_ORIGIN?.trim();
  if (!configured) {
    if (process.env.NODE_ENV === 'production') {
      throw new AdminStorageConfigurationError('ADMIN_PUBLIC_ORIGIN');
    }
    return request.nextUrl.origin;
  }

  try {
    const url = new URL(configured);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw new Error('Unsupported protocol');
    }
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
      throw new Error('HTTPS is required');
    }
    return url.origin;
  } catch {
    throw new AdminStorageConfigurationError('ADMIN_PUBLIC_ORIGIN');
  }
}
