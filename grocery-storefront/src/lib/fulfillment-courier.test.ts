import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import type { CartDeliveryOption } from '../types';
import type { StorefrontConfig } from '../types/storefront-config';
import {
  DEFAULT_FULFILLMENT_CONFIG,
  freeShippingThresholdFor,
  isColdChainProduct,
  isPickupOption,
  offersCourierDelivery,
  pickupServiceKey,
  showsFreeShippingBar,
  visibleDeliveryOptions,
} from './fulfillment';

function liveConfig(slug: 'asiandeligo' | 'kenmito'): StorefrontConfig {
  const envelope = JSON.parse(
    readFileSync(new URL(`../../public/config/${slug}.json`, import.meta.url), 'utf8')
  );
  return structuredClone(envelope.config) as StorefrontConfig;
}

const pickup: CartDeliveryOption = {
  id: 'cfg-pickup',
  name: 'Odbiór osobisty',
  carrierCode: 'PICKUP',
  price: { amount: 0, currency: 'PLN' },
};
const dpd: CartDeliveryOption = {
  id: 'cfg-dpd',
  name: 'Kurier DPD',
  carrierCode: 'ZIRA_KURIER',
  price: { amount: 19.99, currency: 'PLN' },
};

test('isPickupOption reads the backend carrier, falling back to the legacy PICKUP id', () => {
  assert.equal(isPickupOption({ id: 'x', name: 'x', carrierCode: 'PICKUP' }), true);
  assert.equal(isPickupOption({ id: 'x', name: 'x', carrierCode: 'ZIRA_KURIER' }), false);
  assert.equal(isPickupOption({ id: 'PICKUP', name: 'x' }), true);
  assert.equal(isPickupOption({ id: 'PICKUP', name: 'x', carrierCode: 'ZIRA_KURIER' }), false);
  assert.equal(isPickupOption({ id: 'delivery-standard', name: 'x' }), false);
});

test('offersCourierDelivery only for courier "dpd"', () => {
  assert.equal(offersCourierDelivery(null), false);
  assert.equal(offersCourierDelivery(liveConfig('asiandeligo')), false);
  const adg = liveConfig('asiandeligo');
  adg.general.fulfillment.courier = 'dpd';
  assert.equal(offersCourierDelivery(adg), true);
});

test('a pickup shop without the courier flag never shows DPD, even when the backend returns it', () => {
  const kenmito = liveConfig('kenmito');
  assert.deepEqual(visibleDeliveryOptions(kenmito, [pickup, dpd]), [pickup]);
});

test('a pickup shop with courier "dpd" keeps pickup and DPD', () => {
  const adg = liveConfig('asiandeligo');
  adg.general.fulfillment.courier = 'dpd';
  assert.deepEqual(visibleDeliveryOptions(adg, [pickup, dpd]), [pickup, dpd]);
});

test('a delivery-mode shop keeps every backend option', () => {
  const shop = liveConfig('asiandeligo');
  shop.general.fulfillment.mode = 'delivery';
  const standard: CartDeliveryOption = { id: 'delivery-standard', name: 'Standard', price: { amount: 9.99, currency: 'PLN' } };
  assert.deepEqual(visibleDeliveryOptions(shop, [standard, pickup, dpd]), [standard, pickup, dpd]);
  assert.deepEqual(visibleDeliveryOptions(null, [standard, dpd]), [standard, dpd]);
});

test('the courier flag defaults to off', () => {
  assert.equal(DEFAULT_FULFILLMENT_CONFIG.courier, 'none');
  assert.equal(DEFAULT_FULFILLMENT_CONFIG.courierTermsVersion, null);
  assert.equal(DEFAULT_FULFILLMENT_CONFIG.courierCutoff, null);
  assert.equal(liveConfig('asiandeligo').general.fulfillment.courier, 'none');
});

test('isColdChainProduct: chilled and frozen products are pickup only', () => {
  assert.equal(isColdChainProduct({ storageZone: 'CHILLED' }), true);
  assert.equal(isColdChainProduct({ storageZone: 'FROZEN' }), true);
});

test('isColdChainProduct: ambient, unknown and missing zones are not cold', () => {
  assert.equal(isColdChainProduct({ storageZone: 'AMBIENT' }), false);
  assert.equal(isColdChainProduct({ storageZone: null }), false);
  assert.equal(isColdChainProduct({ storageZone: undefined }), false);
  assert.equal(isColdChainProduct({}), false);
});

test('freeShippingThresholdFor prefers the backend freeAbove of the courier option', () => {
  const adg = liveConfig('asiandeligo');
  adg.general.freeShippingThreshold = 150;
  assert.equal(freeShippingThresholdFor(adg, [pickup, { ...dpd, freeAbove: 200 }]), 200);
});

test('freeShippingThresholdFor falls back to the shop config without a courier threshold', () => {
  const adg = liveConfig('asiandeligo');
  adg.general.freeShippingThreshold = 150;
  assert.equal(freeShippingThresholdFor(adg, [pickup]), 150);
  assert.equal(freeShippingThresholdFor(adg, [pickup, { ...dpd, freeAbove: null }]), 150);
  assert.equal(freeShippingThresholdFor(adg, []), 150);
});

test('showsFreeShippingBar: a pickup-only shop shows no free-shipping bar', () => {
  assert.equal(showsFreeShippingBar(liveConfig('kenmito')), false);
});

test('showsFreeShippingBar: a pickup shop with DPD and a delivery shop show it', () => {
  const adg = liveConfig('asiandeligo');
  adg.general.fulfillment.courier = 'dpd';
  assert.equal(showsFreeShippingBar(adg), true);
  const delivery = liveConfig('kenmito');
  delivery.general.fulfillment.mode = 'delivery';
  assert.equal(showsFreeShippingBar(delivery), true);
});

test('ADG (and its legacy kenmito alias) advertises free DPD shipping from 200 zł', () => {
  assert.equal(liveConfig('asiandeligo').general.freeShippingThreshold, 200);
  assert.equal(liveConfig('kenmito').general.freeShippingThreshold, 200);
});

test('pickupServiceKey names DPD next to pickup only for a courier shop', () => {
  assert.equal(pickupServiceKey(liveConfig('kenmito')), 'pickupService');
  const adg = liveConfig('asiandeligo');
  adg.general.fulfillment.courier = 'dpd';
  assert.equal(pickupServiceKey(adg), 'pickupAndCourierService');
});
