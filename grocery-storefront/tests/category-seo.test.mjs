import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  MERGED_CATEGORY_REDIRECTS,
  RENAMED_CATEGORY_REDIRECTS,
  categorySeoFromTree,
  resolveCategoryRedirect,
} from '../src/lib/category-seo.ts';

// Copy of backend `scripts/adg/category-tree.json` (the data the apply script
// writes to production); refresh it when the tree changes.
const tree = JSON.parse(readFileSync(new URL('./fixtures/adg-category-tree.json', import.meta.url), 'utf8'));
const liveSlugs = new Set(tree.groups.flatMap((group) => [group.slug, ...group.leaves.map((leaf) => leaf.slug)]));

test('the fixture is the committed backend tree: 10 groups, 54 leaves', () => {
  assert.equal(tree.groups.length, 10);
  assert.equal(tree.groups.reduce((total, group) => total + group.leaves.length, 0), 54);
});

test('RENAMED_CATEGORY_REDIRECTS covers exactly the tree slugs that stop being live, each to its leaf', () => {
  const expected = new Map();
  for (const group of tree.groups) {
    for (const leaf of group.leaves) {
      if (leaf.from && !liveSlugs.has(leaf.from)) expected.set(leaf.from, leaf.slug);
      for (const merged of leaf.mergeFrom ?? []) {
        if (!liveSlugs.has(merged)) expected.set(merged, leaf.slug);
      }
    }
  }
  assert.deepEqual(new Map(Object.entries(RENAMED_CATEGORY_REDIRECTS)), expected);
});

test('every redirect source is retired and every target is a live tree slug', () => {
  const entries = [...Object.entries(MERGED_CATEGORY_REDIRECTS), ...Object.entries(RENAMED_CATEGORY_REDIRECTS)];
  assert.ok(entries.length > 50);
  for (const [from, to] of entries) {
    assert.ok(liveSlugs.has(to), `${from} -> ${to}: target is not in the tree`);
    assert.ok(!liveSlugs.has(from), `${from} is still a live slug and must not redirect`);
  }
});

test('resolveCategoryRedirect leaves a live slug alone and redirects only a retired one', () => {
  assert.equal(resolveCategoryRedirect('ramyun-ramen', new Set(['ramyun-ramen', 'ramyun-w-paczce'])), null);
  assert.equal(resolveCategoryRedirect('ramyun-ramen', new Set(['ramyun-w-paczce'])), 'ramyun-w-paczce');
  assert.equal(resolveCategoryRedirect('du%C5%BCa-micha', new Set()), 'ramyun-w-kubku-i-misce');
  assert.equal(resolveCategoryRedirect('sosy-sojowe', new Set()), 'sos-sojowy');
  assert.equal(resolveCategoryRedirect('kimchi', new Set()), null);
  // Catalog unreachable: a permanent redirect must never be issued on a guess.
  assert.equal(resolveCategoryRedirect('ramyun-ramen', null), null);
});

test('categorySeoFromTree: a group with leaves is indexable; leaves and leafless groups follow the product threshold', () => {
  const leaf = (count, name = 'Kimchi') => ({ kind: 'leaf', name, description: '', products: { totalCount: count }, children: [] });
  assert.equal(categorySeoFromTree(leaf(3)).robots, undefined);
  assert.deepEqual(categorySeoFromTree(leaf(2)).robots, { index: false, follow: true });
  assert.deepEqual(categorySeoFromTree(leaf(null)).robots, { index: false, follow: true });

  const group = { kind: 'group', name: 'Kimchi i kiszonki', description: 'Kimchi, pickles.', products: { totalCount: 2 }, children: [leaf(1), leaf(1)] };
  assert.deepEqual(categorySeoFromTree(group), { title: 'Kimchi i kiszonki', description: 'Kimchi, pickles.', robots: undefined });
  assert.deepEqual(categorySeoFromTree({ ...group, children: [], products: { totalCount: 0 } }).robots, { index: false, follow: true });
  assert.equal(categorySeoFromTree({ ...group, children: [], products: { totalCount: 7 } }).robots, undefined);
});

test('categorySeoFromTree falls back to the name when the description is empty and bounds long ones', () => {
  assert.equal(categorySeoFromTree({ kind: 'leaf', name: 'Ramyun and ramen', description: '', products: { totalCount: 5 }, children: [] }).description, 'Ramyun and ramen');
  const long = categorySeoFromTree({ kind: 'leaf', name: 'X', description: 'word '.repeat(60), products: { totalCount: 5 }, children: [] }).description;
  assert.ok(long.length <= 160 && long.endsWith('…'));
});
