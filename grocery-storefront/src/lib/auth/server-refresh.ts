import 'server-only';

import { createHash } from 'node:crypto';
import { renewCustomerSession } from './server-service';

type RenewalResult = Awaited<ReturnType<typeof renewCustomerSession>>;

interface RenewalEntry {
  promise: Promise<RenewalResult>;
  expiresAt: number | null;
}

const RESOLVED_RENEWAL_TTL_MS = 10_000;
const MAX_RENEWAL_ENTRIES = 1_000;
const renewalsInFlight = new Map<string, RenewalEntry>();

function refreshTokenKey(refreshToken: string): string {
  return createHash('sha256').update(refreshToken).digest('base64url');
}

function deleteEntryIfCurrent(key: string, entry: RenewalEntry): void {
  if (renewalsInFlight.get(key) === entry) {
    renewalsInFlight.delete(key);
  }
}

function pruneRenewalEntries(now: number): void {
  for (const [key, entry] of renewalsInFlight) {
    if (entry.expiresAt !== null && entry.expiresAt <= now) {
      renewalsInFlight.delete(key);
    }
  }

  while (renewalsInFlight.size >= MAX_RENEWAL_ENTRIES) {
    const oldestKey = renewalsInFlight.keys().next().value as string | undefined;
    if (!oldestKey) break;
    renewalsInFlight.delete(oldestKey);
  }
}

export function renewCustomerSessionSingleFlight(refreshToken: string): Promise<RenewalResult> {
  const now = Date.now();
  pruneRenewalEntries(now);

  const key = refreshTokenKey(refreshToken);
  const active = renewalsInFlight.get(key);
  if (active && (active.expiresAt === null || active.expiresAt > now)) {
    return active.promise;
  }

  const entry = {} as RenewalEntry;
  const renewal = renewCustomerSession(refreshToken);
  entry.promise = renewal;
  entry.expiresAt = null;
  renewalsInFlight.set(key, entry);

  void renewal.then(
    () => {
      entry.expiresAt = Date.now() + RESOLVED_RENEWAL_TTL_MS;
      setTimeout(() => deleteEntryIfCurrent(key, entry), RESOLVED_RENEWAL_TTL_MS);
    },
    () => deleteEntryIfCurrent(key, entry),
  );

  return renewal;
}
