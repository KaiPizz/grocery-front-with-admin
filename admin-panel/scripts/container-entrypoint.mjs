import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const RUNTIME_UID = 1001;
const RUNTIME_GID = 1001;
const SHARED_DIR = '/app/shared';
const DATA_DIR = `${SHARED_DIR}/data`;
const AUTH_DIR = `${SHARED_DIR}/auth`;
const UPLOAD_DIR = `${SHARED_DIR}/public/uploads`;
const AUTH_STATE_PATH = `${AUTH_DIR}/admin-auth-state.json`;
const AUTH_LOCK_PATH = `${AUTH_DIR}/admin-auth-state.lock`;
const AUTH_MARKER_PATH = `${SHARED_DIR}/.admin-auth-state-initialized`;

function validPasswordHash(value) {
  const match = /^scrypt:N=(\d+),r=(\d+),p=(\d+):([A-Za-z0-9_-]+):([A-Za-z0-9_-]+)$/.exec(
    value || ''
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

function syncDirectory(directory) {
  const descriptor = fs.openSync(directory, 'r');
  try {
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
}

function ensureDirectory(directory, mode, uid, gid) {
  try {
    const metadata = fs.lstatSync(directory);
    if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
      throw new Error(`Unsafe container storage path: ${directory}`);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    fs.mkdirSync(directory, { recursive: true, mode });
  }
  fs.chownSync(directory, uid, gid);
  fs.chmodSync(directory, mode);
}

function linkPrivateFile(targetPath, payload, parentDirectory, uid, gid) {
  const temporaryPath = `${targetPath}.bootstrap-${process.pid}-${crypto.randomUUID()}`;
  let descriptor;
  try {
    descriptor = fs.openSync(temporaryPath, 'wx', 0o600);
    fs.writeFileSync(descriptor, payload, 'utf8');
    fs.fchmodSync(descriptor, 0o600);
    fs.fchownSync(descriptor, uid, gid);
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    fs.linkSync(temporaryPath, targetPath);
    syncDirectory(parentDirectory);
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    try {
      fs.unlinkSync(temporaryPath);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}

function validateMarker() {
  const metadata = fs.lstatSync(AUTH_MARKER_PATH);
  if (
    !metadata.isFile() ||
    metadata.isSymbolicLink() ||
    (metadata.mode & 0o777) !== 0o600 ||
    metadata.uid !== 0 ||
    metadata.gid !== 0 ||
    fs.readFileSync(AUTH_MARKER_PATH, 'utf8') !== 'admin-auth-state-v1\n'
  ) {
    throw new Error('Container admin auth-state marker is invalid');
  }
}

function readValidatedState(bootstrapHash, requireBootstrapState) {
  const metadata = fs.lstatSync(AUTH_STATE_PATH);
  if (
    !metadata.isFile() ||
    metadata.isSymbolicLink() ||
    metadata.size < 1 ||
    metadata.size > 8192 ||
    (metadata.mode & 0o777) !== 0o600 ||
    metadata.uid !== RUNTIME_UID ||
    metadata.gid !== RUNTIME_GID
  ) {
    throw new Error('Container admin auth state metadata is invalid');
  }

  const value = JSON.parse(fs.readFileSync(AUTH_STATE_PATH, 'utf8'));
  const expectedKeys = ['passwordHash', 'schemaVersion', 'sessionGeneration', 'updatedAt'];
  if (
    JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(expectedKeys) ||
    value.schemaVersion !== 1 ||
    !validPasswordHash(value.passwordHash) ||
    !Number.isSafeInteger(value.sessionGeneration) ||
    value.sessionGeneration < 1 ||
    value.sessionGeneration >= Number.MAX_SAFE_INTEGER ||
    typeof value.updatedAt !== 'string' ||
    value.updatedAt.length > 64 ||
    Number.isNaN(Date.parse(value.updatedAt)) ||
    (requireBootstrapState &&
      (value.sessionGeneration !== 1 || value.passwordHash !== bootstrapHash))
  ) {
    throw new Error('Container admin auth state content is invalid');
  }
}

function acquireBootstrapLock() {
  let descriptor;
  let created = false;
  try {
    descriptor = fs.openSync(AUTH_LOCK_PATH, 'wx', 0o600);
    created = true;
    fs.fchmodSync(descriptor, 0o600);
    fs.fchownSync(descriptor, 0, 0);
    fs.writeFileSync(
      descriptor,
      `${JSON.stringify({
        pid: process.pid,
        createdAt: new Date().toISOString(),
        purpose: 'container-bootstrap',
      })}\n`,
      'utf8'
    );
    fs.fsyncSync(descriptor);
    syncDirectory(AUTH_DIR);
    return descriptor;
  } catch (error) {
    if (descriptor !== undefined) {
      try {
        fs.closeSync(descriptor);
      } catch {}
    }
    if (created) {
      try {
        fs.unlinkSync(AUTH_LOCK_PATH);
      } catch (cleanupError) {
        if (cleanupError.code !== 'ENOENT') throw cleanupError;
      }
    }
    throw error;
  }
}

function releaseBootstrapLock(descriptor) {
  fs.closeSync(descriptor);
  fs.unlinkSync(AUTH_LOCK_PATH);
  syncDirectory(AUTH_DIR);
}

function preparePersistentStorage() {
  if (typeof process.geteuid !== 'function' || process.geteuid() !== 0) {
    throw new Error('Container entrypoint must start as root to prepare the persistent volume');
  }
  if (
    process.env.ADMIN_DATA_DIR !== DATA_DIR ||
    process.env.ADMIN_AUTH_DIR !== AUTH_DIR ||
    process.env.ADMIN_UPLOAD_DIR !== UPLOAD_DIR
  ) {
    throw new Error('Container admin storage paths differ from the protected topology');
  }

  const bootstrapHash = process.env.ADMIN_PASSWORD_HASH;
  if (!validPasswordHash(bootstrapHash)) {
    throw new Error('Container admin bootstrap hash is invalid');
  }

  ensureDirectory(SHARED_DIR, 0o755, 0, 0);
  ensureDirectory(DATA_DIR, 0o750, RUNTIME_UID, RUNTIME_GID);
  ensureDirectory(path.dirname(UPLOAD_DIR), 0o750, RUNTIME_UID, RUNTIME_GID);
  ensureDirectory(UPLOAD_DIR, 0o750, RUNTIME_UID, RUNTIME_GID);
  ensureDirectory(AUTH_DIR, 0o700, RUNTIME_UID, RUNTIME_GID);

  if (fs.existsSync(AUTH_LOCK_PATH)) {
    throw new Error('Container admin auth-state write lock is present; verify the writer before restart');
  }

  if (fs.existsSync(AUTH_MARKER_PATH)) {
    validateMarker();
    if (!fs.existsSync(AUTH_STATE_PATH)) {
      throw new Error('Container admin auth state is missing after initialization');
    }
    readValidatedState(bootstrapHash, false);
    return;
  }

  let bootstrapLock;
  let stateCreatedByThisRun = false;
  let operationError;
  try {
    bootstrapLock = acquireBootstrapLock();
    if (fs.existsSync(AUTH_MARKER_PATH)) {
      validateMarker();
      readValidatedState(bootstrapHash, false);
    } else {
      if (fs.existsSync(AUTH_STATE_PATH)) {
        readValidatedState(bootstrapHash, true);
      } else {
        const state = {
          schemaVersion: 1,
          passwordHash: bootstrapHash,
          sessionGeneration: 1,
          updatedAt: new Date().toISOString(),
        };
        linkPrivateFile(
          AUTH_STATE_PATH,
          `${JSON.stringify(state, null, 2)}\n`,
          AUTH_DIR,
          RUNTIME_UID,
          RUNTIME_GID
        );
        stateCreatedByThisRun = true;
      }
      linkPrivateFile(AUTH_MARKER_PATH, 'admin-auth-state-v1\n', SHARED_DIR, 0, 0);
    }
  } catch (error) {
    operationError = error;
    if (!fs.existsSync(AUTH_MARKER_PATH) && stateCreatedByThisRun) {
      try {
        fs.unlinkSync(AUTH_STATE_PATH);
      } catch (cleanupError) {
        if (cleanupError.code !== 'ENOENT') operationError = cleanupError;
      }
    }
  } finally {
    if (bootstrapLock !== undefined) {
      try {
        releaseBootstrapLock(bootstrapLock);
      } catch (cleanupError) {
        operationError ??= cleanupError;
      }
    }
  }
  if (operationError) throw operationError;
}

preparePersistentStorage();
process.setgroups([]);
process.setgid(RUNTIME_GID);
process.setuid(RUNTIME_UID);
process.chdir('/app');
await import(pathToFileURL('/app/server.js').href);
