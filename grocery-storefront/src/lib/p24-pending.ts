// The Przelewy24 payment the shopper was just sent to, plus the cart they paid
// for. Only identifiers and line quantities are kept; the payment state shown to
// the shopper always comes from the backend.
//
// - The pending record lives in sessionStorage (this tab): pressing Back from
//   P24 lands on the payment status page instead of an empty checkout, so the
//   shopper resumes the SAME P24 session instead of ordering (and paying) twice.
// - The cart snapshot lives in localStorage: the cart is emptied before the
//   redirect (a paid order must not stay in the cart), and the snapshot lets the
//   shopper restore it only once the backend reports the payment as failed.

export const P24_PENDING_KEY = 'adg-p24-pending';
export const P24_CART_SNAPSHOT_KEY = 'adg-p24-cart-snapshot';

/** The P24 session is registered with timeLimit 15 (minutes). */
export const P24_SESSION_TTL_MS = 15 * 60 * 1000;
/**
 * The backend closes an unpaid session 30 minutes after registration. Until
 * then the checkout page sends the shopper to the status page, where the
 * outcome (paid / failed) will appear.
 */
export const P24_PENDING_REDIRECT_MS = 30 * 60 * 1000;
const SNAPSHOT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface P24PendingRecord {
  paymentId: string;
  orderId?: string;
  orderNumber?: string;
  actionUrl?: string;
  registeredAt?: string;
}

export interface P24CartSnapshot {
  paymentId: string;
  lines: Array<{ merchandiseId: string; quantity: number }>;
  savedAt: string;
}

function read<T>(storage: Storage | undefined, key: string): T | null {
  try {
    const raw = storage?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function remove(storage: Storage | undefined, key: string) {
  try {
    storage?.removeItem(key);
  } catch {
    // Storage may be unavailable (private mode); nothing to clean up then.
  }
}

const session = () => (typeof window === 'undefined' ? undefined : window.sessionStorage);
const local = () => (typeof window === 'undefined' ? undefined : window.localStorage);

export function readP24Pending(): P24PendingRecord | null {
  const record = read<P24PendingRecord>(session(), P24_PENDING_KEY);
  return record && typeof record.paymentId === 'string' && UUID_RE.test(record.paymentId) ? record : null;
}

export function writeP24Pending(record: P24PendingRecord) {
  try {
    session()?.setItem(P24_PENDING_KEY, JSON.stringify(record));
  } catch {
    // Without storage the shopper still reaches P24; Back then shows checkout.
  }
}

export function clearP24Pending() {
  remove(session(), P24_PENDING_KEY);
}

/** Age of the pending session in ms, or Infinity when unknown. */
export function p24PendingAge(record: P24PendingRecord, now = Date.now()): number {
  const registeredAt = Date.parse(record.registeredAt ?? '');
  return Number.isFinite(registeredAt) ? now - registeredAt : Number.POSITIVE_INFINITY;
}

export function saveP24CartSnapshot(paymentId: string, items: Array<{ merchandiseId: string; quantity: number }>) {
  const lines = items
    .filter((item) => item.merchandiseId && Number.isInteger(item.quantity) && item.quantity > 0)
    .map((item) => ({ merchandiseId: item.merchandiseId, quantity: item.quantity }));
  if (lines.length === 0) return;
  try {
    local()?.setItem(
      P24_CART_SNAPSHOT_KEY,
      JSON.stringify({ paymentId, lines, savedAt: new Date().toISOString() } satisfies P24CartSnapshot)
    );
  } catch {
    // Restoring the cart is a convenience; the order itself is unaffected.
  }
}

/** The snapshot taken for this payment, if it is recent and well formed. */
export function readP24CartSnapshot(paymentId: string, now = Date.now()): P24CartSnapshot | null {
  const snapshot = read<P24CartSnapshot>(local(), P24_CART_SNAPSHOT_KEY);
  if (!snapshot || snapshot.paymentId !== paymentId || !Array.isArray(snapshot.lines)) return null;
  const savedAt = Date.parse(snapshot.savedAt);
  if (!Number.isFinite(savedAt) || now - savedAt > SNAPSHOT_MAX_AGE_MS) return null;
  const lines = snapshot.lines.filter(
    (line) => typeof line?.merchandiseId === 'string' && Number.isInteger(line.quantity) && line.quantity > 0
  );
  return lines.length > 0 ? { ...snapshot, lines } : null;
}

export function clearP24CartSnapshot() {
  remove(local(), P24_CART_SNAPSHOT_KEY);
}
