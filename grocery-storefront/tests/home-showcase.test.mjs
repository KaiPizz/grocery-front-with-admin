import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isBulkPack,
  pickDiverseProducts,
  productFamilyKey,
  todayOpeningHours,
} from '../src/lib/home-showcase.ts';

const p = (id, name, thumbnail = 'x.jpg') => ({ id, name, thumbnail: thumbnail ? { url: thumbnail } : null });

test('productFamilyKey folds pack sizes and flavours of one product line together', () => {
  assert.equal(
    productFamilyKey('Buldak Ramyun 2xSpicy makaron instant o smaku kurczaka 140g - Samyang'),
    productFamilyKey('Buldak Ramyun 2xSpicy makaron instant o smaku kurczaka 5 x 140g - Samyang'),
  );
  assert.notEqual(productFamilyKey('Pocky Chocolate 47g'), productFamilyKey('Kimchi Jongga 500g'));
});

test('isBulkPack flags cartons, multipacks and gift sets, not single items', () => {
  assert.equal(isBulkPack('Buldak Ramyun 40 x 140g (cały karton) - Samyang'), true);
  assert.equal(isBulkPack('2 x Angel Hair Chocolate, zestaw czekolad'), true);
  assert.equal(isBulkPack('Shin Ramyun 5 x 120g'), true);
  assert.equal(isBulkPack('Shin Ramyun 120g'), false);
  assert.equal(isBulkPack('Sos sojowy 1 l'), false);
});

test('pickDiverseProducts keeps one product per family, skips bulk packs and image-less rows, keeps order', () => {
  const rows = [
    p('1', 'Buldak Ramyun 2xSpicy 40 x 140g (cały karton) - Samyang'),
    p('2', 'Buldak Ramyun 2xSpicy 140g - Samyang'),
    p('3', 'Buldak Ramyun 2xSpicy 5 x 140g - Samyang'),
    p('4', 'Buldak Ramyun 2xSpicy 140g - Samyang'),
    p('5', 'Kimchi tradycyjne 500g - Jongga'),
    p('6', 'Pocky Chocolate 47g - Glico', null),
    p('7', 'Pocky Strawberry 45g - Glico'),
  ];
  assert.deepEqual(pickDiverseProducts(rows, 8).map((row) => row.id), ['2', '5', '7']);
  assert.deepEqual(pickDiverseProducts(rows, 2).map((row) => row.id), ['2', '5']);
});

const hours = [
  { label: 'Pon. – Sob.', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], opens: '7:00', closes: '19:00' },
  { label: 'Niedziela', days: ['Sunday'], opens: null, closes: null },
];

test('todayOpeningHours reads the Warsaw weekday, not the server one', () => {
  // 2026-09-28 is a Monday; 2026-10-03 23:30 UTC (Saturday) is already Sunday 01:30 in Warsaw.
  assert.deepEqual(todayOpeningHours(hours, new Date('2026-09-28T10:00:00Z')), { open: true, opens: '7:00', closes: '19:00' });
  assert.deepEqual(todayOpeningHours(hours, new Date('2026-10-04T10:00:00Z')), { open: false, opens: null, closes: null });
  assert.deepEqual(todayOpeningHours(hours, new Date('2026-10-03T23:30:00Z')), { open: false, opens: null, closes: null });
  assert.equal(todayOpeningHours([], new Date('2026-09-28T10:00:00Z')), null);
});
