import assert from 'node:assert/strict';
import test from 'node:test';
import { ADG_DEFAULT_FEATURED_LEAVES, resolveFeaturedLeafIds } from '../src/lib/home-featured.ts';

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
