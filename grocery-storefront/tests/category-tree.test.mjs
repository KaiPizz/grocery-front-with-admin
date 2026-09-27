import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCategoryTree, buildPublicCategories, findPublicCategory } from '../src/lib/public-taxonomy.ts';

const raw = [
  { id: 'g-kimchi', slug: 'kimchi-i-kiszonki', name: 'Kimchi i kiszonki', description: null, level: 0, displayOrder: 1, parent: null, translation: { name: 'Kimchi and pickles' }, products: { totalCount: 0 } },
  { id: 'l-kimchi', slug: 'kimchi', name: 'Kimchi', description: 'Kimchi z kapusty', level: 1, displayOrder: 0, parent: { id: 'g-kimchi' }, translation: null, products: { totalCount: 16 } },
  { id: 'l-pickles', slug: 'marynowane-warzywa-i-owoce', name: 'Marynowane warzywa i owoce', description: null, level: 1, displayOrder: 1, parent: { id: 'g-kimchi' }, translation: { name: 'Pickled vegetables and fruit' }, products: { totalCount: 42 } },
  { id: 'g-meals', slug: 'dania-gotowe', name: 'Dania gotowe', description: null, level: 0, displayOrder: 0, parent: null, translation: null, products: { totalCount: 60 } },
  { id: 'l-empty', slug: 'imbir-marynowany', name: 'Imbir marynowany', description: null, level: 1, displayOrder: 2, parent: { id: 'g-kimchi' }, translation: null, products: { totalCount: 0 } },
  { id: 'hidden', slug: 'pozostale-produkty', name: 'Pozostałe produkty', description: null, level: 0, displayOrder: 9, parent: null, translation: null, products: { totalCount: 3 } },
];

test('groups come out in displayOrder with their leaves, counts summed, hidden dropped', () => {
  const tree = buildCategoryTree(raw, 'pl');
  assert.deepEqual(tree.map((g) => g.slug), ['dania-gotowe', 'kimchi-i-kiszonki']);
  const kimchi = tree[1];
  assert.equal(kimchi.kind, 'group');
  assert.deepEqual(kimchi.children.map((l) => l.slug), ['kimchi', 'marynowane-warzywa-i-owoce']);
  assert.equal(kimchi.products.totalCount, 58);
  assert.deepEqual(kimchi.rawCategoryIds, ['l-kimchi', 'l-pickles']);
  assert.equal(tree.some((g) => g.slug === 'pozostale-produkty'), false);
});

test('leafless group lists its own id', () => {
  const meals = buildCategoryTree(raw, 'pl').find((g) => g.slug === 'dania-gotowe');
  assert.deepEqual(meals.rawCategoryIds, ['g-meals']);
  assert.deepEqual(meals.children, []);
  assert.equal(meals.products.totalCount, 60);
});

test('includeEmpty keeps zero-count leaves; default drops them', () => {
  const withEmpty = buildCategoryTree(raw, 'pl', { includeEmpty: true }).find((g) => g.slug === 'kimchi-i-kiszonki');
  assert.equal(withEmpty.children.length, 3);
  assert.equal(buildCategoryTree(raw, 'pl').find((g) => g.slug === 'kimchi-i-kiszonki').children.length, 2);
});

test('findPublicCategory returns a leaf with its parent and only its own id', () => {
  const leaf = findPublicCategory(raw, 'kimchi', 'pl');
  assert.equal(leaf.kind, 'leaf');
  assert.deepEqual(leaf.parent, { id: 'g-kimchi', slug: 'kimchi-i-kiszonki', name: 'Kimchi i kiszonki' });
  assert.deepEqual(leaf.rawCategoryIds, ['l-kimchi']);
  assert.equal(leaf.description, 'Kimchi z kapusty');
  assert.equal(findPublicCategory(raw, 'nie-ma', 'pl'), null);
});

test('english names come from translation, then the group fallback table, then the Polish name', () => {
  const tree = buildCategoryTree(raw, 'en');
  const kimchi = tree.find((g) => g.slug === 'kimchi-i-kiszonki');
  assert.equal(kimchi.name, 'Kimchi and pickles');
  assert.equal(kimchi.children[1].name, 'Pickled vegetables and fruit');
  assert.equal(kimchi.children[0].name, 'Kimchi');
  assert.equal(tree.find((g) => g.slug === 'dania-gotowe').name, 'Ready meals and instant soups');
});

test('a node whose parent is unknown does not disappear', () => {
  const orphan = { id: 'x', slug: 'orphan', name: 'Orphan', description: null, level: 1, displayOrder: 5, parent: { id: 'gone' }, translation: null, products: { totalCount: 2 } };
  assert.equal(buildCategoryTree([...raw, orphan], 'pl').some((g) => g.slug === 'orphan'), true);
});

test('buildPublicCategories is the same function (importers keep working)', () => {
  assert.equal(buildPublicCategories, buildCategoryTree);
});
