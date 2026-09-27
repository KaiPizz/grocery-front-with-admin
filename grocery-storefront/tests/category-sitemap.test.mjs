import assert from 'node:assert/strict';
import test from 'node:test';
import { collectCategorySitemapPaths } from '../src/lib/category-sitemap.ts';

const groups = [
  { slug: 'kimchi-i-kiszonki', products: { totalCount: 5 }, children: [
    { id: 'a', slug: 'kimchi', products: { totalCount: 3 } },
    { id: 'b', slug: 'imbir marynowany', products: { totalCount: 2 } },
  ] },
  { slug: 'household', products: { totalCount: 0 }, children: [] },
];

test('groups always, leaves only from the index threshold, slugs encoded', () => {
  assert.deepEqual(collectCategorySitemapPaths(groups, 3), [
    { path: '/categories/kimchi-i-kiszonki', priority: 0.8 },
    { path: '/categories/kimchi', priority: 0.7 },
    { path: '/categories/household', priority: 0.8 },
  ]);
});

test('a leaf below the threshold is not listed even when its group is', () => {
  assert.equal(collectCategorySitemapPaths(groups, 3).some((entry) => entry.path.includes('imbir')), false);
});
