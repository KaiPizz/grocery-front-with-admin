import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildLegacySourceIdMap,
  parseCohortProductIds,
  resolveKimchiSource,
  selectCohortProducts,
} from '../scripts/kimchi-source-metadata-dry-run.mjs';

test('resolves ADG products only through an exact historical product ID match', () => {
  const sourceIds = buildLegacySourceIdMap([
    { id: 'product-water-chestnuts', current_slug: 'KIMCHI-2162' },
    { id: 'product-ramen', current_slug: 'KIMCHI-521' },
  ]);

  assert.deepEqual(
    resolveKimchiSource({
      id: 'product-water-chestnuts',
      slug: 'chinskie-wodne-kasztany',
      variants: [{ sku: 'ADG-000777' }],
    }, sourceIds),
    { id: '2162', resolution: 'historical_product_id_mapping' },
  );

  assert.deepEqual(
    resolveKimchiSource({
      id: 'different-product-id',
      slug: 'chinskie-wodne-kasztany',
      variants: [{ sku: 'ADG-000777' }],
    }, sourceIds),
    { id: null, resolution: 'unresolved' },
  );
});

test('preserves legacy KIMCHI SKU and slug resolution before consulting the mapping', () => {
  const sourceIds = buildLegacySourceIdMap([
    { id: 'legacy-product', current_slug: 'KIMCHI-9999' },
  ]);

  assert.deepEqual(
    resolveKimchiSource({
      id: 'legacy-product',
      slug: 'ignored',
      variants: [{ sku: 'KIMCHI-1234' }],
    }, sourceIds),
    { id: '1234', resolution: 'direct_kimchi_sku_or_slug' },
  );

  assert.deepEqual(
    resolveKimchiSource({
      id: 'unmapped-product',
      slug: 'KIMCHI-4321',
      variants: [{ sku: 'ADG-000001' }],
    }, sourceIds),
    { id: '4321', resolution: 'direct_kimchi_sku_or_slug' },
  );
});

test('parses cohort product IDs in ranked order and rejects malformed input', () => {
  assert.deepEqual(parseCohortProductIds({
    products: [
      { cohortRank: 1, id: 'product-c' },
      { cohortRank: 2, id: 'product-a' },
    ],
  }), ['product-c', 'product-a']);

  assert.throws(() => parseCohortProductIds({ products: [] }), /must not be empty/);
  assert.throws(
    () => parseCohortProductIds({ products: [{ id: 'duplicate' }, { id: 'duplicate' }] }),
    /Duplicate product id/,
  );
  assert.throws(() => parseCohortProductIds({ rows: [] }), /products array/);
});

test('restricts live products to exact cohort IDs while preserving cohort order and limit', () => {
  const liveProducts = [
    { id: 'product-a', name: 'A' },
    { id: 'product-b', name: 'B' },
    { id: 'product-c', name: 'C' },
  ];
  const cohortIds = ['product-c', 'product-a'];

  assert.deepEqual(
    selectCohortProducts(liveProducts, cohortIds, null).map((product) => product.id),
    ['product-c', 'product-a'],
  );
  assert.deepEqual(
    selectCohortProducts(liveProducts, cohortIds, 1).map((product) => product.id),
    ['product-c'],
  );
  assert.throws(
    () => selectCohortProducts(liveProducts, ['product-c', 'not-live'], null),
    /absent from the live published catalog/,
  );
});

test('rejects duplicate exact product IDs in the historical source mapping', () => {
  assert.throws(
    () => buildLegacySourceIdMap([
      { id: 'duplicate', current_slug: 'KIMCHI-1' },
      { id: 'duplicate', current_slug: 'KIMCHI-2' },
    ]),
    /Duplicate product id/,
  );
});
