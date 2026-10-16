import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import type { CartDeliveryOption } from '../../../../../types';
import type { PaymentMethod } from '../../../../../types/checkout';
import type { StorefrontConfig } from '../../../../../types/storefront-config';
import {
  allowedPaymentMethods,
  defaultDeliveryOption,
  firstVisibleErrorField,
  isPayOnCollectionMethod,
  resolvePickupSelected,
} from './checkout-rules';

const pickupShop = (
  JSON.parse(readFileSync(new URL('../../../../../../public/config/asiandeligo.json', import.meta.url), 'utf8')) as {
    config: StorefrontConfig;
  }
).config;
const deliveryShop: StorefrontConfig = structuredClone(pickupShop);
deliveryShop.general.fulfillment.mode = 'delivery';

const method = (id: string, provider: string | null = null): PaymentMethod => ({
  id,
  name: id,
  description: null,
  provider,
  isActive: true,
  fee: null,
});
const p24 = method('p24', 'p24');
const cash = method('cash', 'cash');
const cod = method('cod_payment', null);

const pickup: CartDeliveryOption = { id: 'cfg-pickup', name: 'Odbiór', carrierCode: 'PICKUP', price: { amount: 0, currency: 'PLN' } };
const dpd: CartDeliveryOption = { id: 'cfg-dpd', name: 'Kurier DPD', carrierCode: 'ZIRA_KURIER', price: { amount: 19.99, currency: 'PLN' } };

test('cash methods disappear once a courier option is selected', () => {
  assert.deepEqual(allowedPaymentMethods([p24, cash, cod], false), [p24]);
});

test('cash methods stay for pickup', () => {
  assert.deepEqual(allowedPaymentMethods([p24, cash, cod], true), [p24, cash, cod]);
});

test('isPayOnCollectionMethod recognises cash and COD', () => {
  assert.equal(isPayOnCollectionMethod(cash), true);
  assert.equal(isPayOnCollectionMethod(cod), true);
  assert.equal(isPayOnCollectionMethod(p24), false);
  assert.equal(isPayOnCollectionMethod(null), false);
});

test('resolvePickupSelected follows the selected option in a pickup shop', () => {
  assert.equal(resolvePickupSelected(pickup, pickupShop), true);
  assert.equal(resolvePickupSelected(dpd, pickupShop), false);
});

test('resolvePickupSelected falls back to the shop mode when nothing is selected', () => {
  assert.equal(resolvePickupSelected(null, pickupShop), true);
  assert.equal(resolvePickupSelected(null, deliveryShop), false);
});

test('a delivery-mode shop never switches to pickup wording', () => {
  assert.equal(resolvePickupSelected(pickup, deliveryShop), false);
});

test('firstVisibleErrorField never returns an address field while pickup is selected', () => {
  const errors = { streetAddress1: 'required', city: 'required', phone: undefined };
  assert.equal(firstVisibleErrorField(errors, true), null);
  assert.equal(firstVisibleErrorField(errors, false), 'streetAddress1');
});

test('firstVisibleErrorField keeps the form order and skips recipient fields for the courier', () => {
  assert.equal(firstVisibleErrorField({ city: 'x', phone: 'x' }, false), 'phone');
  assert.equal(firstVisibleErrorField({ recipientFirstName: 'x', city: 'x' }, false), 'city');
  assert.equal(firstVisibleErrorField({ recipientFirstName: 'x', city: 'x' }, true), 'recipientFirstName');
  assert.equal(firstVisibleErrorField({}, false), null);
});

test('defaultDeliveryOption picks pickup in a pickup shop and keeps a still-offered choice', () => {
  assert.equal(defaultDeliveryOption([pickup, dpd], null, true), pickup);
  assert.equal(defaultDeliveryOption([dpd, pickup], dpd, true), null);
  assert.equal(defaultDeliveryOption([pickup], dpd, true), pickup);
  assert.equal(defaultDeliveryOption([dpd], null, true), dpd);
  assert.equal(defaultDeliveryOption([], null, true), null);
});

test('defaultDeliveryOption leaves a multi-option delivery shop to the shopper', () => {
  const standard: CartDeliveryOption = { id: 'std', name: 'Standard', price: { amount: 9.99, currency: 'PLN' } };
  assert.equal(defaultDeliveryOption([standard, pickup], null, false), null);
  assert.equal(defaultDeliveryOption([standard], null, false), standard);
});
