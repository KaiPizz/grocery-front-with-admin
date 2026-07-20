import {
  getAdminAuthStatePathForDiagnostics,
  initializeAdminAuthState,
} from '../src/lib/admin-auth-state';
import { isSupportedPasswordHash } from '../src/lib/password';

async function main(): Promise<void> {
  const passwordHash = process.env.ADMIN_PASSWORD_HASH?.trim();
  if (!passwordHash || !isSupportedPasswordHash(passwordHash)) {
    throw new Error('ADMIN_PASSWORD_HASH is missing or invalid');
  }

  await initializeAdminAuthState(passwordHash);
  process.stdout.write(
    `Admin auth state is initialized at ${getAdminAuthStatePathForDiagnostics()}\n`
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Could not initialize auth state';
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
