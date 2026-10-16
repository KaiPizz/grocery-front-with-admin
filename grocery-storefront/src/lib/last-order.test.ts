import assert from 'node:assert/strict';
import test from 'node:test';

import { lastOrderIsPickup, readLastOrder, saveLastOrder, type LastOrderSnapshot } from './last-order';

function fakeSessionStorage() {
  const store = new Map<string, string>();
  (globalThis as { window?: unknown }).window = {
    sessionStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    },
  };
  return store;
}

const snapshot: LastOrderSnapshot = {
  number: 'ADG-1001',
  email: 'a@example.com',
  items: [{ name: 'Kimchi', quantity: 1, total: 19.99 }],
  total: 39.98,
  currency: 'PLN',
  paymentMethod: 'p24',
  fulfillment: 'courier',
};

test('the snapshot keeps how the order is fulfilled', () => {
  fakeSessionStorage();
  saveLastOrder(snapshot);
  assert.equal(readLastOrder('ADG-1001')?.fulfillment, 'courier');
  saveLastOrder({ ...snapshot, fulfillment: 'pickup' });
  assert.equal(readLastOrder('ADG-1001')?.fulfillment, 'pickup');
});

test('an older snapshot without the field reads back as undefined (the page falls back to the shop mode)', () => {
  const store = fakeSessionStorage();
  const { fulfillment: _omitted, ...legacy } = snapshot;
  store.set('adg-last-order', JSON.stringify(legacy));
  const read = readLastOrder('ADG-1001');
  assert.equal(read?.number, 'ADG-1001');
  assert.equal(read?.fulfillment, undefined);
});

test('lastOrderIsPickup: the snapshot decides, else the shop mode', () => {
  const { fulfillment: _omitted, ...legacy } = snapshot;
  assert.equal(lastOrderIsPickup({ ...snapshot, fulfillment: 'courier' }, true), false);
  assert.equal(lastOrderIsPickup({ ...snapshot, fulfillment: 'pickup' }, false), true);
  assert.equal(lastOrderIsPickup({ ...snapshot, fulfillment: null }, true), true);
  assert.equal(lastOrderIsPickup(legacy, false), false);
  assert.equal(lastOrderIsPickup(null, true), true);
});
