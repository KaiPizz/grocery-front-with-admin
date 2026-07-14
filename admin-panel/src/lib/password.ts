import {
  createHash,
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual,
} from 'node:crypto';

const DEFAULT_SCRYPT_N = 32768;
const DEFAULT_SCRYPT_R = 8;
const DEFAULT_SCRYPT_P = 1;
const DERIVED_KEY_LENGTH = 64;
const MAX_PASSWORD_LENGTH = 1024;

interface ScryptParameters {
  N: number;
  r: number;
  p: number;
}

export class PasswordConfigurationError extends Error {
  constructor() {
    super('Admin password hashing is not configured securely');
    this.name = 'PasswordConfigurationError';
  }
}

function deriveKey(
  password: string,
  salt: Buffer,
  parameters: ScryptParameters
): Promise<Buffer> {
  const maxmem = Math.max(
    64 * 1024 * 1024,
    128 * parameters.N * parameters.r + 1024 * 1024
  );

  return new Promise((resolve, reject) => {
    nodeScrypt(
      password,
      salt,
      DERIVED_KEY_LENGTH,
      { ...parameters, maxmem },
      (error, derivedKey) => {
        if (error) reject(error);
        else resolve(derivedKey);
      }
    );
  });
}

function parseParameters(value: string): ScryptParameters | null {
  const match = /^N=(\d+),r=(\d+),p=(\d+)$/.exec(value);
  if (!match) return null;

  const parameters = {
    N: Number(match[1]),
    r: Number(match[2]),
    p: Number(match[3]),
  };

  if (
    parameters.N < 16384 ||
    parameters.N > 131072 ||
    (parameters.N & (parameters.N - 1)) !== 0 ||
    parameters.r < 1 ||
    parameters.r > 16 ||
    parameters.p < 1 ||
    parameters.p > 4
  ) {
    return null;
  }

  return parameters;
}

function parsePasswordHash(encodedHash: string): {
  parameters: ScryptParameters;
  salt: Buffer;
  expected: Buffer;
} | null {
  const colonParts = encodedHash.split(':');
  const dollarParts = encodedHash.split('$');
  const parts = colonParts.length === 4 && colonParts[0] === 'scrypt'
    ? colonParts
    : dollarParts.length === 5 && dollarParts[0] === '' && dollarParts[1] === 'scrypt'
      ? dollarParts.slice(1)
      : null;
  if (!parts) return null;

  const parameters = parseParameters(parts[1]);
  if (!parameters || !/^[A-Za-z0-9_-]+$/.test(parts[2]) || !/^[A-Za-z0-9_-]+$/.test(parts[3])) {
    return null;
  }

  const salt = Buffer.from(parts[2], 'base64url');
  const expected = Buffer.from(parts[3], 'base64url');
  if (salt.byteLength < 16 || salt.byteLength > 64 || expected.byteLength !== DERIVED_KEY_LENGTH) {
    return null;
  }

  return { parameters, salt, expected };
}

export function constantTimeStringEqual(left: string, right: string): boolean {
  const leftDigest = createHash('sha256').update(left, 'utf8').digest();
  const rightDigest = createHash('sha256').update(right, 'utf8').digest();
  return timingSafeEqual(leftDigest, rightDigest);
}

export async function createPasswordHash(password: string): Promise<string> {
  if (!password || password.length > MAX_PASSWORD_LENGTH) {
    throw new TypeError('Invalid password length');
  }

  const parameters = {
    N: DEFAULT_SCRYPT_N,
    r: DEFAULT_SCRYPT_R,
    p: DEFAULT_SCRYPT_P,
  };
  const salt = randomBytes(24);
  const derivedKey = await deriveKey(password, salt, parameters);

  return `scrypt:N=${parameters.N},r=${parameters.r},p=${parameters.p}:${salt.toString('base64url')}:${derivedKey.toString('base64url')}`;
}

export async function verifyPassword(
  password: string,
  encodedHash: string
): Promise<boolean> {
  if (password.length > MAX_PASSWORD_LENGTH) return false;

  const parsed = parsePasswordHash(encodedHash);
  if (!parsed) throw new PasswordConfigurationError();

  const derivedKey = await deriveKey(password, parsed.salt, parsed.parameters);
  return timingSafeEqual(derivedKey, parsed.expected);
}

export async function verifyConfiguredAdminPassword(password: string): Promise<boolean> {
  const encodedHash = process.env.ADMIN_PASSWORD_HASH?.trim();
  if (encodedHash) return verifyPassword(password, encodedHash);

  const insecureDevFallbackEnabled =
    process.env.NODE_ENV !== 'production' &&
    process.env.ALLOW_INSECURE_DEV_PASSWORD === 'true';
  const developmentPassword = process.env.ADMIN_PASSWORD;

  if (insecureDevFallbackEnabled && developmentPassword) {
    return constantTimeStringEqual(password, developmentPassword);
  }

  throw new PasswordConfigurationError();
}
