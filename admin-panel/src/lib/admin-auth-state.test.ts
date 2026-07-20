import assert from 'node:assert/strict';
import { chmod, lstat, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';

import {
  AdminAuthStateBusyError,
  AdminAuthStateConfigurationError,
  AdminAuthStateConflictError,
  getAdminAuthState,
  getAdminAuthStatePathForDiagnostics,
  initializeAdminAuthState,
  replaceAdminPasswordHash,
  revokeAllAdminSessions,
} from './admin-auth-state';
import { createSessionToken, verifySessionToken } from './session-token';

const mutableEnv = process.env as Record<string, string | undefined>;
const originalDataDir = process.env.ADMIN_DATA_DIR;
const originalAuthDir = process.env.ADMIN_AUTH_DIR;
const originalNodeEnv = process.env.NODE_ENV;
const originalSecret = process.env.ADMIN_SESSION_SECRET;
let dataDir = '';

function fakeHash(label: string): string {
  return `scrypt:N=32768,r=8,p=1:${label.padEnd(32, 's')}:${label.padEnd(86, 'h')}`;
}

beforeEach(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), 'admin-auth-state-test-'));
  process.env.ADMIN_DATA_DIR = dataDir;
  process.env.ADMIN_AUTH_DIR = path.join(dataDir, 'auth');
  mutableEnv.NODE_ENV = 'production';
  process.env.ADMIN_SESSION_SECRET = 'test-only-session-secret-with-at-least-32-bytes';
});

afterEach(async () => {
  if (originalDataDir === undefined) delete process.env.ADMIN_DATA_DIR;
  else process.env.ADMIN_DATA_DIR = originalDataDir;
  if (originalAuthDir === undefined) delete process.env.ADMIN_AUTH_DIR;
  else process.env.ADMIN_AUTH_DIR = originalAuthDir;
  if (originalNodeEnv === undefined) delete mutableEnv.NODE_ENV;
  else mutableEnv.NODE_ENV = originalNodeEnv;
  if (originalSecret === undefined) delete process.env.ADMIN_SESSION_SECRET;
  else process.env.ADMIN_SESSION_SECRET = originalSecret;
  await rm(dataDir, { recursive: true, force: true });
});

test('initializes a strict, private persistent state file', async () => {
  const initialized = await initializeAdminAuthState(fakeHash('initial'));
  const filePath = getAdminAuthStatePathForDiagnostics();
  const metadata = await lstat(filePath);

  assert.equal(initialized.sessionGeneration, 1);
  assert.equal(metadata.isFile(), true);
  assert.equal(metadata.isSymbolicLink(), false);
  assert.equal(metadata.mode & 0o777, 0o600);
  assert.deepEqual(await getAdminAuthState(), initialized);
  assert.equal(JSON.parse(await readFile(filePath, 'utf8')).schemaVersion, 1);
});

test('fails closed in production when state is missing, corrupt, or too permissive', async () => {
  await assert.rejects(getAdminAuthState(), AdminAuthStateConfigurationError);

  await initializeAdminAuthState(fakeHash('initial'));
  const filePath = getAdminAuthStatePathForDiagnostics();
  await writeFile(filePath, '{not-json}\n', { mode: 0o600 });
  await assert.rejects(getAdminAuthState(), AdminAuthStateConfigurationError);

  await writeFile(filePath, `${JSON.stringify({
    schemaVersion: 1,
    passwordHash: fakeHash('valid'),
    sessionGeneration: 1,
    updatedAt: new Date().toISOString(),
  })}\n`, { mode: 0o600 });
  await chmod(filePath, 0o644);
  await assert.rejects(getAdminAuthState(), AdminAuthStateConfigurationError);
});

test('revoking sessions invalidates a copied token immediately and persistently', async () => {
  await initializeAdminAuthState(fakeHash('initial'));
  const token = await createSessionToken('operator');
  assert.equal((await verifySessionToken(token))?.username, 'operator');

  const revoked = await revokeAllAdminSessions();
  assert.equal(revoked.sessionGeneration, 2);
  assert.equal(await verifySessionToken(token), null);
  assert.equal((await getAdminAuthState()).sessionGeneration, 2);
});

test('a stale authenticated request cannot revoke a newer auth state', async () => {
  const staleState = await initializeAdminAuthState(fakeHash('initial'));
  await revokeAllAdminSessions(staleState);

  await assert.rejects(
    revokeAllAdminSessions(staleState),
    AdminAuthStateConflictError
  );
  assert.equal((await getAdminAuthState()).sessionGeneration, 2);
});

test('password replacement uses compare-and-swap and increments generation once', async () => {
  const expected = await initializeAdminAuthState(fakeHash('initial'));
  const outcomes = await Promise.allSettled([
    replaceAdminPasswordHash(expected, fakeHash('first')),
    replaceAdminPasswordHash(expected, fakeHash('second')),
  ]);

  assert.equal(outcomes.filter(({ status }) => status === 'fulfilled').length, 1);
  const rejection = outcomes.find(({ status }) => status === 'rejected');
  assert.equal(rejection?.status, 'rejected');
  if (rejection?.status === 'rejected') {
    assert.equal(rejection.reason instanceof AdminAuthStateConflictError, true);
  }
  assert.equal((await getAdminAuthState()).sessionGeneration, 2);
});

test('an external writer lock blocks mutation without changing auth state', async () => {
  const expected = await initializeAdminAuthState(fakeHash('initial'));
  const lockPath = path.join(process.env.ADMIN_AUTH_DIR!, 'admin-auth-state.lock');
  await writeFile(
    lockPath,
    `${JSON.stringify({ pid: 99999, createdAt: new Date().toISOString() })}\n`,
    { mode: 0o600 }
  );

  await assert.rejects(
    replaceAdminPasswordHash(expected, fakeHash('blocked')),
    AdminAuthStateBusyError
  );
  assert.deepEqual(await getAdminAuthState(), expected);
});

test('a login racing with rotation cannot mint a token for the newer state', async () => {
  const verifiedState = await initializeAdminAuthState(fakeHash('initial'));
  await replaceAdminPasswordHash(verifiedState, fakeHash('rotated'));

  const staleLoginToken = await createSessionToken('operator', {
    authState: verifiedState,
  });
  assert.equal(await verifySessionToken(staleLoginToken), null);
});
