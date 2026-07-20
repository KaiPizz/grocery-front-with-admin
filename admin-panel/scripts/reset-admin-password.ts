import {
  getAdminAuthState,
  replaceAdminPasswordHash,
} from '../src/lib/admin-auth-state';
import { createPasswordHash } from '../src/lib/password';

const MIN_PASSWORD_LENGTH = 16;

async function readPasswordFromStdin(): Promise<string> {
  if (process.stdin.isTTY) {
    throw new Error('Provide the password through stdin so it is not stored in shell history');
  }

  let input = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) input += chunk;
  return input.replace(/\r?\n$/, '');
}

async function main(): Promise<void> {
  const password = await readPasswordFromStdin();
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Admin password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  const current = await getAdminAuthState();
  await replaceAdminPasswordHash(current, await createPasswordHash(password));
  process.stdout.write('Admin password was reset and all sessions were revoked.\n');
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Could not reset admin password';
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
