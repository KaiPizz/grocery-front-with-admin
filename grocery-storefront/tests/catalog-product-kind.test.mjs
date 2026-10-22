import assert from 'node:assert/strict';
import test from 'node:test';
import { getCatalogProductKind, getFoodCategoryIds } from '../src/lib/catalog-product-kind.ts';
import { buildPublicCategories } from '../src/lib/public-taxonomy.ts';

// Owner-approved catalog split: cuisines contain food, while INCI and stray food
// metadata cannot turn cosmetics/kitchenware/unknown categories into groceries.
test('recognizes known food with no ingredients or nutrition metadata', () => {
  assert.equal(getCatalogProductKind({ slug: 'sosy-i-oleje' }), 'food');
  assert.equal(getCatalogProductKind({ slug: 'sosy-sojowe', parent: { slug: 'sosy-i-oleje' } }), 'food');
});

test('non-food category identity wins over conflicting food ancestry and metadata', () => {
  const cosmetic = {
    category: { slug: 'oczyszczanie', parent: { slug: 'kosmetyki-koreanskie' } },
    ingredients: 'Water, Glycerin, Aloe Barbadensis Extract',
    nutritionFacts: { calories: 100 }, dietaryTags: ['VEGAN'], storageZone: 'AMBIENT',
  };
  assert.equal(getCatalogProductKind(cosmetic.category), 'cosmetics');
  assert.equal(getCatalogProductKind({ slug: 'kosmetyki-koreanskie', parent: { slug: 'sosy-i-oleje' } }), 'cosmetics');
  assert.equal(getCatalogProductKind({ slug: 'sosy-i-oleje', parent: { slug: 'akcesoria-kuchenne' } }), 'kitchenware');
  assert.equal(getCatalogProductKind({ slug: 'miski', parent: { slug: 'akcesoria-kuchenne' } }), 'kitchenware');
});

test('missing or unfamiliar categories remain neutral instead of guessing food', () => {
  assert.equal(getCatalogProductKind(null), 'unknown');
  assert.equal(getCatalogProductKind(undefined), 'unknown');
  assert.equal(getCatalogProductKind({ slug: 'new-category', parent: null }), 'unknown');
});

test('cuisine category IDs include changing food descendants and exclude non-food trees', () => {
  assert.deepEqual(getFoodCategoryIds([
    { id: 'leaf-first', slug: 'new-sauce', parent: { id: 'food' } },
    { id: 'food', slug: 'sosy-i-oleje' },
    { id: 'deep', slug: 'light-sauce', parent: { id: 'leaf-first' } },
    { id: 'beauty', slug: 'kosmetyki-koreanskie', parent: { id: 'food' } },
    { id: 'cream', slug: 'cream', parent: { id: 'beauty' } },
    { id: 'tools', slug: 'akcesoria-kuchenne' },
    { id: 'knife', slug: 'knife', parent: { id: 'tools' } },
    { id: 'unknown', slug: 'new-category' },
    { id: 'orphan', slug: 'orphan', parent: { id: 'missing' } },
    { id: 'cycle-a', slug: 'a', parent: { id: 'cycle-b' } },
    { id: 'cycle-b', slug: 'b', parent: { id: 'cycle-a' } },
  ]), ['leaf-first', 'food', 'deep']);
  assert.deepEqual(getFoodCategoryIds([]), []);
});

test('public beauty and kitchenware names override legacy DB translations without changing URLs', () => {
  const categories = [
    { id: 'beauty', slug: 'kosmetyki-koreanskie', name: 'Kosmetyki koreańskie', translation: { name: 'Korean cosmetics' } },
    { id: 'tools', slug: 'akcesoria-kuchenne', name: 'Akcesoria kuchenne', translation: { name: 'Kitchen accessories' } },
  ];
  const options = { requireProductCount: false, includeEmpty: true };
  const polish = Object.fromEntries(buildPublicCategories(categories, 'pl', options).map((c) => [c.slug, c.name]));
  const english = Object.fromEntries(buildPublicCategories(categories, 'en', options).map((c) => [c.slug, c.name]));
  assert.equal(polish['kosmetyki-koreanskie'], 'Kosmetyki i pielęgnacja');
  assert.equal(polish['akcesoria-kuchenne'], 'Akcesoria kuchenne i zastawa');
  assert.equal(english['kosmetyki-koreanskie'], 'Beauty and personal care');
  assert.equal(english['akcesoria-kuchenne'], 'Kitchenware and tableware');
});
