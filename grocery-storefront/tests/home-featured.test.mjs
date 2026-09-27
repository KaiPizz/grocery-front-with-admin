import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ADG_DEFAULT_FEATURED_LEAVES,
  interleaveFeaturedProducts,
  resolveFeaturedLeafIds,
  resolveFeaturedLeaves,
} from '../src/lib/home-featured.ts';

const groups = [
  {
    id: 'g-noodles',
    slug: 'makaron-i-ryz',
    children: [{ id: 'l-buldak', slug: 'buldak-i-ramyun-ostre' }, { id: 'l-cup', slug: 'ramyun-w-kubku-i-misce' }],
    rawCategoryIds: ['l-buldak', 'l-cup'],
  },
  {
    id: 'g-kimchi',
    slug: 'kimchi-i-kiszonki',
    children: [{ id: 'l-kimchi', slug: 'kimchi' }],
    rawCategoryIds: ['l-kimchi'],
  },
];

test('configured slugs win over the ADG fallback and keep their order', () => {
  assert.deepEqual(resolveFeaturedLeafIds(groups, ['kimchi', 'buldak-i-ramyun-ostre'], true), ['l-kimchi', 'l-buldak']);
});

test('ADG without config falls back to the default leaves and skips unknown ones', () => {
  assert.deepEqual(ADG_DEFAULT_FEATURED_LEAVES, ['buldak-i-ramyun-ostre', 'kimchi', 'pocky-pepero-i-czekolada']);
  assert.deepEqual(resolveFeaturedLeafIds(groups, [], true), ['l-buldak', 'l-kimchi']);
});

test('a non-ADG storefront with no config gets no featured ids (keeps Nowosci)', () => {
  assert.deepEqual(resolveFeaturedLeafIds(groups, [], false), []);
});

test('a group slug expands to its leaf ids without duplicates', () => {
  assert.deepEqual(resolveFeaturedLeafIds(groups, ['makaron-i-ryz', 'buldak-i-ramyun-ostre'], false), ['l-buldak', 'l-cup']);
});

test('resolveFeaturedLeaves also reports which configured slugs resolved, in order, so the shelf link can target a live one', () => {
  assert.deepEqual(
    resolveFeaturedLeaves(groups, ['pocky-pepero-i-czekolada', 'kimchi', 'makaron-i-ryz'], true),
    { ids: ['l-kimchi', 'l-buldak', 'l-cup'], slugs: ['kimchi', 'makaron-i-ryz'] },
  );
  // ADG defaults on a catalog that only carries kimchi: the link goes to kimchi, not to the missing buldak leaf.
  assert.deepEqual(resolveFeaturedLeaves(groups.slice(1), [], true), { ids: ['l-kimchi'], slugs: ['kimchi'] });
  assert.deepEqual(resolveFeaturedLeaves(groups, [], false), { ids: [], slugs: [] });
});

test('interleaveFeaturedProducts alternates the featured leaves so one big leaf cannot fill the shelf', () => {
  const product = (id, category) => ({ id, category: { id: category } });
  const products = [
    product('a1', 'A'), product('a2', 'A'), product('a3', 'A'), product('a4', 'A'),
    product('b1', 'B'), product('b2', 'B'),
    product('c1', 'C'),
    product('x1', 'Z'),
  ];
  assert.deepEqual(interleaveFeaturedProducts(products, ['A', 'B', 'C'], 6).map((item) => item.id), ['a1', 'b1', 'c1', 'a2', 'b2', 'a3']);
  assert.deepEqual(interleaveFeaturedProducts(products, ['A', 'B', 'C'], 20).map((item) => item.id), ['a1', 'b1', 'c1', 'a2', 'b2', 'a3', 'a4', 'x1']);
  assert.deepEqual(interleaveFeaturedProducts(products, ['C', 'A'], 3).map((item) => item.id), ['c1', 'a1', 'a2']);
  assert.deepEqual(interleaveFeaturedProducts([], ['A'], 8), []);
  assert.deepEqual(interleaveFeaturedProducts([{ id: 'n', category: null }], ['A'], 8).map((item) => item.id), ['n']);
});
