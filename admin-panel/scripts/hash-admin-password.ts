import { createPasswordHash } from '../src/lib/password';

const MIN_PASSWORD_LENGTH = 16;

async function readPasswordFromStdin(): Promise<string> {
  let input = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) input += chunk;
  return input.replace(/\r?\n$/, '');
}

async function main(): Promise<void> {
  if (process.stdin.isTTY) {
    throw new Error('Provide the password through stdin so it is not stored in shell history');
  }

  const password = await readPasswordFromStdin();
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Admin password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  process.stdout.write(`${await createPasswordHash(password)}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Could not hash password';
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
