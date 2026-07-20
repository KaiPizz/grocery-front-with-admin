import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { getAdminAuthDir } from './admin-storage';

const AUTH_STATE_SCHEMA_VERSION = 1;
const AUTH_STATE_LOCK_FILENAME = 'admin-auth-state.lock';
const MAX_AUTH_STATE_BYTES = 8 * 1024;
const MAX_PASSWORD_HASH_LENGTH = 2048;

export interface AdminAuthState {
  schemaVersion: 1;
  passwordHash: string;
  sessionGeneration: number;
  updatedAt: string;
}

export class AdminAuthStateConfigurationError extends Error {
  constructor() {
    super('Admin authentication state is unavailable');
    this.name = 'AdminAuthStateConfigurationError';
  }
}

export class AdminAuthStateConflictError extends Error {
  constructor() {
    super('Admin authentication state changed concurrently');
    this.name = 'AdminAuthStateConflictError';
  }
}

export class AdminAuthStateBusyError extends Error {
  constructor() {
    super('Admin authentication state is temporarily locked');
    this.name = 'AdminAuthStateBusyError';
  }
}

const globalAuthState = globalThis as typeof globalThis & {
  __adminAuthStateWriteQueue?: Promise<void>;
};

function authStatePath(): string {
  return path.join(
    /* turbopackIgnore: true */ getAdminAuthDir(),
    'admin-auth-state.json'
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasSafePasswordHashShape(value: unknown): value is string {
  if (
    typeof value !== 'string' ||
    value.length < 32 ||
    value.length > MAX_PASSWORD_HASH_LENGTH ||
    /[\r\n\0]/.test(value)
  ) {
    return false;
  }

  const match = /^scrypt:N=(\d+),r=(\d+),p=(\d+):([A-Za-z0-9_-]+):([A-Za-z0-9_-]+)$/.exec(
    value
  );
  if (!match) return false;
  const N = Number(match[1]);
  const r = Number(match[2]);
  const p = Number(match[3]);
  return (
    N >= 16384 &&
    N <= 131072 &&
    (N & (N - 1)) === 0 &&
    r >= 1 &&
    r <= 16 &&
    p >= 1 &&
    p <= 4 &&
    Buffer.from(match[4], 'base64url').byteLength >= 16 &&
    Buffer.from(match[4], 'base64url').byteLength <= 64 &&
    Buffer.from(match[5], 'base64url').byteLength === 64
  );
}

function parseAuthState(raw: string): AdminAuthState {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new AdminAuthStateConfigurationError();
  }

  if (!isPlainObject(value)) throw new AdminAuthStateConfigurationError();
  const keys = Object.keys(value).sort();
  const expectedKeys = [
    'passwordHash',
    'schemaVersion',
    'sessionGeneration',
    'updatedAt',
  ];

  if (
    keys.length !== expectedKeys.length ||
    keys.some((key, index) => key !== expectedKeys[index]) ||
    value.schemaVersion !== AUTH_STATE_SCHEMA_VERSION ||
    !hasSafePasswordHashShape(value.passwordHash) ||
    !Number.isSafeInteger(value.sessionGeneration) ||
    (value.sessionGeneration as number) < 1 ||
    (value.sessionGeneration as number) >= Number.MAX_SAFE_INTEGER ||
    typeof value.updatedAt !== 'string' ||
    value.updatedAt.length > 64 ||
    Number.isNaN(Date.parse(value.updatedAt))
  ) {
    throw new AdminAuthStateConfigurationError();
  }

  return value as unknown as AdminAuthState;
}

function newState(passwordHash: string, sessionGeneration: number): AdminAuthState {
  const state: AdminAuthState = {
    schemaVersion: AUTH_STATE_SCHEMA_VERSION,
    passwordHash,
    sessionGeneration,
    updatedAt: new Date().toISOString(),
  };

  return parseAuthState(JSON.stringify(state));
}

function currentIdentity(): { uid: number; gid: number } | null {
  if (typeof process.geteuid !== 'function' || typeof process.getegid !== 'function') {
    return null;
  }
  return { uid: process.geteuid(), gid: process.getegid() };
}

async function inspectAuthDirectory(): Promise<boolean> {
  try {
    const metadata = await fs.lstat(getAdminAuthDir());
    const identity = currentIdentity();
    if (
      !metadata.isDirectory() ||
      metadata.isSymbolicLink() ||
      (process.env.NODE_ENV === 'production' &&
        ((metadata.mode & 0o777) !== 0o700 ||
          !identity ||
          metadata.uid !== identity.uid ||
          metadata.gid !== identity.gid))
    ) {
      throw new AdminAuthStateConfigurationError();
    }
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    if (error instanceof AdminAuthStateConfigurationError) throw error;
    throw new AdminAuthStateConfigurationError();
  }
}

async function ensureAuthDirectory(): Promise<void> {
  if (!(await inspectAuthDirectory())) {
    await fs.mkdir(getAdminAuthDir(), { recursive: true, mode: 0o700 });
  }
  await fs.chmod(getAdminAuthDir(), 0o700);
  if (!(await inspectAuthDirectory())) throw new AdminAuthStateConfigurationError();
}

async function syncDirectory(): Promise<void> {
  let handle: fs.FileHandle | undefined;
  try {
    handle = await fs.open(getAdminAuthDir(), 'r');
    await handle.sync();
  } finally {
    await handle?.close();
  }
}

async function writeTempFile(filePath: string, state: AdminAuthState): Promise<string> {
  const tempPath = `${filePath}.tmp-${process.pid}-${randomUUID()}`;
  let handle: fs.FileHandle | undefined;

  try {
    handle = await fs.open(tempPath, 'wx', 0o600);
    await handle.writeFile(`${JSON.stringify(state, null, 2)}\n`, 'utf8');
    await handle.sync();
    await handle.close();
    handle = undefined;
    return tempPath;
  } catch (error) {
    await handle?.close();
    try {
      await fs.unlink(tempPath);
    } catch (cleanupError) {
      if ((cleanupError as NodeJS.ErrnoException).code !== 'ENOENT') throw cleanupError;
    }
    throw error;
  }
}

async function removeTempFile(tempPath: string): Promise<void> {
  try {
    await fs.unlink(tempPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}

async function withWriteLock<T>(action: () => Promise<T>): Promise<T> {
  const previous = globalAuthState.__adminAuthStateWriteQueue ?? Promise.resolve();
  const runExclusive = async (): Promise<T> => {
    await ensureAuthDirectory();
    const lockPath = path.join(
      /* turbopackIgnore: true */ getAdminAuthDir(),
      AUTH_STATE_LOCK_FILENAME
    );
    let lockHandle: fs.FileHandle;
    try {
      lockHandle = await fs.open(lockPath, 'wx', 0o600);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
        throw new AdminAuthStateBusyError();
      }
      throw new AdminAuthStateConfigurationError();
    }

    try {
      await lockHandle.writeFile(
        `${JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() })}\n`,
        'utf8'
      );
      await lockHandle.sync();
      return await action();
    } finally {
      await lockHandle.close();
      try {
        await fs.unlink(lockPath);
        await syncDirectory();
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    }
  };

  const run = previous.then(runExclusive, runExclusive);
  const tail = run.then(() => undefined, () => undefined);
  globalAuthState.__adminAuthStateWriteQueue = tail;

  try {
    return await run;
  } finally {
    if (globalAuthState.__adminAuthStateWriteQueue === tail) {
      delete globalAuthState.__adminAuthStateWriteQueue;
    }
  }
}

async function readStateFile(): Promise<AdminAuthState | null> {
  const filePath = authStatePath();

  try {
    if (!(await inspectAuthDirectory())) return null;
    const metadata = await fs.lstat(filePath);
    if (!metadata.isFile() || metadata.isSymbolicLink()) {
      throw new AdminAuthStateConfigurationError();
    }
    if (metadata.size < 1 || metadata.size > MAX_AUTH_STATE_BYTES) {
      throw new AdminAuthStateConfigurationError();
    }
    if (process.env.NODE_ENV === 'production') {
      const identity = currentIdentity();
      if (
        (metadata.mode & 0o777) !== 0o600 ||
        !identity ||
        metadata.uid !== identity.uid ||
        metadata.gid !== identity.gid
      ) {
        throw new AdminAuthStateConfigurationError();
      }
    }

    return parseAuthState(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    if (error instanceof AdminAuthStateConfigurationError) throw error;
    throw new AdminAuthStateConfigurationError();
  }
}

function developmentFallbackState(): AdminAuthState | null {
  if (process.env.NODE_ENV === 'production') return null;
  const passwordHash = process.env.ADMIN_PASSWORD_HASH?.trim();
  if (!passwordHash) return null;
  return {
    schemaVersion: AUTH_STATE_SCHEMA_VERSION,
    passwordHash,
    sessionGeneration: 1,
    updatedAt: new Date(0).toISOString(),
  };
}

/** Read fresh state for every authentication decision so revocation is immediate. */
export async function getAdminAuthState(): Promise<AdminAuthState> {
  const stored = await readStateFile();
  const fallback = stored ? null : developmentFallbackState();
  const state = stored ?? fallback;
  if (!state) throw new AdminAuthStateConfigurationError();
  return state;
}

/** One-time production migration helper. Never overwrites an existing state file. */
export async function initializeAdminAuthState(passwordHash: string): Promise<AdminAuthState> {
  return withWriteLock(async () => {
    await ensureAuthDirectory();
    const existing = await readStateFile();
    if (existing) return existing;

    const state = newState(passwordHash, 1);
    const filePath = authStatePath();
    const tempPath = await writeTempFile(filePath, state);

    try {
      await fs.link(tempPath, filePath);
      await syncDirectory();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
        const concurrentState = await readStateFile();
        if (concurrentState) return concurrentState;
      }
      throw error;
    } finally {
      await removeTempFile(tempPath);
    }

    return state;
  });
}

async function replaceState(state: AdminAuthState): Promise<void> {
  await ensureAuthDirectory();
  const filePath = authStatePath();
  const tempPath = await writeTempFile(filePath, state);

  try {
    await fs.rename(tempPath, filePath);
    await fs.chmod(filePath, 0o600);
    await syncDirectory();
  } finally {
    await removeTempFile(tempPath);
  }
}

function stateMatches(left: AdminAuthState, right: AdminAuthState): boolean {
  return (
    left.schemaVersion === right.schemaVersion &&
    left.passwordHash === right.passwordHash &&
    left.sessionGeneration === right.sessionGeneration &&
    left.updatedAt === right.updatedAt
  );
}

/** Atomically replace the hash and revoke every existing session. */
export async function replaceAdminPasswordHash(
  expected: AdminAuthState,
  passwordHash: string
): Promise<AdminAuthState> {
  return withWriteLock(async () => {
    const current = await getAdminAuthState();
    if (!stateMatches(current, expected)) throw new AdminAuthStateConflictError();

    const next = newState(passwordHash, current.sessionGeneration + 1);
    await replaceState(next);
    return next;
  });
}

/** Revoke all sessions, including copied cookies, without changing the password. */
export async function revokeAllAdminSessions(
  expected?: AdminAuthState
): Promise<AdminAuthState> {
  return withWriteLock(async () => {
    const current = await getAdminAuthState();
    if (expected && !stateMatches(current, expected)) {
      throw new AdminAuthStateConflictError();
    }
    const next = newState(current.passwordHash, current.sessionGeneration + 1);
    await replaceState(next);
    return next;
  });
}

export function getAdminAuthStatePathForDiagnostics(): string {
  return authStatePath();
}
