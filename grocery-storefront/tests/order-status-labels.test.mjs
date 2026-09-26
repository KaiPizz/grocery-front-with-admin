import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// SPEC (docs/superpowers/plans/2026-09-26-guest-order-tracking.md, Task 2):
// every order / payment status code and payment method the backend can return
// has a label in BOTH locales, and unknown codes fall back to an `unknown`
// label that still shows the raw code. The trackOrder namespace is complete.

const pl = JSON.parse(readFileSync(new URL('../src/messages/pl.json', import.meta.url), 'utf8'));
const en = JSON.parse(readFileSync(new URL('../src/messages/en.json', import.meta.url), 'utf8'));

const ORDER = ['UNCONFIRMED', 'UNFULFILLED', 'PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELED', 'RETURNED', 'PARTIALLY_RETURNED', 'DRAFT', 'EXPIRED', 'unknown'];
const PAYMENT = ['PENDING', 'NOT_CHARGED', 'PARTIALLY_CHARGED', 'FULLY_CHARGED', 'PARTIALLY_REFUNDED', 'FULLY_REFUNDED', 'REFUSED', 'CANCELLED', 'unknown'];
const METHOD = ['P24', 'CASH', 'BANK_TRANSFER', 'CARD', 'unknown'];
const TRACK = [
  'title', 'intro', 'orderNumber', 'orderNumberPlaceholder', 'email', 'submit', 'notFound', 'tooManyAttempts', 'error',
  'resultTitle', 'placedOn', 'total', 'items', 'paymentLabel', 'statusLabel', 'methodLabel', 'pickupHint', 'footerLink', 'confirmationLink',
];

for (const [locale, messages] of [['pl', pl], ['en', en]]) {
  test(`${locale}: orders.status has every order status`, () => {
    for (const code of ORDER) assert.equal(typeof messages.orders?.status?.[code], 'string', `${locale} orders.status.${code}`);
    assert.match(messages.orders.status.unknown, /\{code\}/);
  });
  test(`${locale}: orders.paymentStatus has every payment status`, () => {
    for (const code of PAYMENT) assert.equal(typeof messages.orders?.paymentStatus?.[code], 'string', `${locale} orders.paymentStatus.${code}`);
    assert.match(messages.orders.paymentStatus.unknown, /\{code\}/);
  });
  test(`${locale}: orders.paymentMethod has every method`, () => {
    for (const code of METHOD) assert.equal(typeof messages.orders?.paymentMethod?.[code], 'string', `${locale} orders.paymentMethod.${code}`);
  });
  test(`${locale}: orders.shippingMethod translates the pickup snapshot`, () => {
    assert.equal(typeof messages.orders?.shippingMethod?.PICKUP, 'string', `${locale} orders.shippingMethod.PICKUP`);
  });
  test(`${locale}: trackOrder namespace is complete`, () => {
    for (const key of TRACK) assert.equal(typeof messages.trackOrder?.[key], 'string', `${locale} trackOrder.${key}`);
  });
}

test('the label helper exports the same code lists the messages cover', () => {
  const source = readFileSync(new URL('../src/lib/orders/status-labels.ts', import.meta.url), 'utf8');
  for (const code of ORDER.filter((c) => c !== 'unknown')) assert.ok(source.includes(`'${code}'`), `status-labels.ts lists ${code}`);
  for (const code of PAYMENT.filter((c) => c !== 'unknown')) assert.ok(source.includes(`'${code}'`), `status-labels.ts lists ${code}`);
  for (const code of METHOD.filter((c) => c !== 'unknown')) assert.ok(source.includes(`'${code}'`), `status-labels.ts lists ${code}`);
});
