// What the shopper just ordered, kept in this tab only (sessionStorage) so the
// confirmation and payment-return pages can show it without putting the
// e-mail address or the basket into the URL.

const LAST_ORDER_KEY = 'adg-last-order';

export interface LastOrderSnapshot {
  number: string;
  email: string;
  items: Array<{ name: string; quantity: number; total: number }>;
  total: number;
  currency: string;
  paymentMethod: string | null;
}

export function saveLastOrder(snapshot: LastOrderSnapshot): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(snapshot));
  } catch {
    // Display-only convenience; a full or blocked storage must not stop the order.
  }
}

export function readLastOrder(orderNumber: string | null | undefined): LastOrderSnapshot | null {
  if (!orderNumber || typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(LAST_ORDER_KEY);
    const snapshot = raw ? (JSON.parse(raw) as LastOrderSnapshot) : null;
    return snapshot?.number === orderNumber ? snapshot : null;
  } catch {
    return null;
  }
}
