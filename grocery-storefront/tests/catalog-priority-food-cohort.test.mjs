import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PRIORITY_GROUPS,
  analyzePackageSize,
  buildScaledQuotas,
  buildSourceMap,
  classifyPriorityGroup,
  getMissingMetadataFields,
  selectPriorityFoodCohort,
} from '../scripts/catalog-priority-food-cohort.mjs';

const GROUP_CATEGORY_SLUGS = {
  sauces_pastes_spices: 'sosy-marynaty',
  noodles_rice_ramen: 'ramyun-ramen',
  snacks_sweets: 'słodycze-przekąski',
  drinks_tea_coffee: 'napoje',
  ready_meals: 'dania-gotowe',
  kimchi_pickles: 'kimchi',
  sushi_seaweed: 'arkusze-nori-gim',
  mushrooms_tofu_vegetables: 'grzyby-shiitake',
};

function completeMetadata() {
  return {
    ingredients: 'water, soybeans',
    allergens: ['soybeans'],
    mayContainAllergens: [],
    nutritionFacts: { calories: 100, servingSize: '100g' },
    countryOfOrigin: 'Japonia',
    pricePerUnit: 25,
    unitOfMeasure: 'KG',
    storageZone: 'AMBIENT',
  };
}

function productFixture({ id, sku, categorySlug, name, missing = false }) {
  return {
    id,
    name,
    slug: `product-${sku.toLowerCase()}`,
    category: { id: `category-${categorySlug}`, name: categorySlug, slug: categorySlug },
    thumbnail: { url: `https://img.zira.pl/${sku}.webp` },
    pricing: { priceRange: { start: { gross: { amount: 10, currency: 'PLN' } } } },
    variants: [{ id: `variant-${id}`, sku, quantityAvailable: 100 }],
    ...(missing ? {} : completeMetadata()),
  };
}

test('keeps the documented default 200-product quota allocation', () => {
  const quotas = buildScaledQuotas(200);

  assert.deepEqual(quotas, Object.fromEntries(PRIORITY_GROUPS.map((group) => [group.id, group.quota])));
  assert.equal(Object.values(quotas).reduce((sum, value) => sum + value, 0), 200);
  assert.equal(Object.values(buildScaledQuotas(137)).reduce((sum, value) => sum + value, 0), 137);
});

test('classifies only supported food categories', () => {
  assert.equal(classifyPriorityGroup({ slug: 'ramyun-ramen', name: 'Ramyun / Ramen' }), 'noodles_rice_ramen');
  assert.equal(classifyPriorityGroup({ slug: 'duża-micha', name: 'Duża micha' }), 'noodles_rice_ramen');
  assert.equal(classifyPriorityGroup({ slug: 'sosy-sojowe', name: 'Sosy sojowe' }), 'sauces_pastes_spices');
  assert.equal(classifyPriorityGroup({ slug: 'koreańskie-kosmetyki', name: 'Kosmetyki' }), null);
  assert.equal(classifyPriorityGroup({ slug: 'unmapped', name: 'Unmapped' }), null);
  assert.equal(classifyPriorityGroup({ slug: 'unknown', name: 'Unknown' }), null);
});

test('accepts equivalent total package sizes and rejects ambiguous sizes', () => {
  assert.deepEqual(analyzePackageSize('Ramen 5 x 120g - Brand'), {
    clear: true,
    label: '600g',
    reason: 'clear_multipack',
    source: '5 x 120g',
  });
  assert.equal(analyzePackageSize('Rice crackers 180g (6 x 30g)').clear, true);
  assert.equal(analyzePackageSize('Sauce set 100ml + 200ml').reason, 'conflicting_package_sizes');
  assert.equal(analyzePackageSize('Meal 100g with sauce 20ml').reason, 'mixed_weight_and_volume');
  assert.equal(analyzePackageSize('Tea set, 4 pieces').reason, 'no_weight_or_volume');
});

test('treats trace-allergen data as evidence without inventing a contains claim', () => {
  const product = {
    ...completeMetadata(),
    allergens: [],
    mayContainAllergens: ['nuts'],
  };
  assert.deepEqual(getMissingMetadataFields(product), []);

  assert.deepEqual(
    getMissingMetadataFields({ ...product, mayContainAllergens: [], ingredients: '' }),
    ['ingredients', 'allergenDeclaration'],
  );
});

test('builds a deterministic balanced cohort and prioritizes gaps with clear size', () => {
  const products = [];
  const mapping = [];
  let sequence = 1;

  for (const group of PRIORITY_GROUPS) {
    const categorySlug = GROUP_CATEGORY_SLUGS[group.id];
    for (let index = 0; index < group.quota + 2; index += 1) {
      const sku = `ADG-${String(sequence).padStart(6, '0')}`;
      const id = `${group.id}-${index}`;
      const missing = index < 2;
      const name = index === 0
        ? `${group.label} cleanup candidate 100g`
        : `${group.label} candidate ${index}`;
      products.push(productFixture({ id, sku, categorySlug, name, missing }));
      mapping.push({ id, current_slug: `KIMCHI-${sequence}` });
      sequence += 1;
    }
  }

  products.push(productFixture({
    id: 'non-food',
    sku: 'ADG-900001',
    categorySlug: 'noże',
    name: 'Knife 20cm',
    missing: true,
  }));
  mapping.push({ id: 'non-food', current_slug: 'KIMCHI-900001' });

  products.push(productFixture({
    id: 'hidden',
    sku: 'ADG-900002',
    categorySlug: 'unmapped',
    name: 'Hidden 100g',
    missing: true,
  }));
  mapping.push({ id: 'hidden', current_slug: 'KIMCHI-900002' });

  products.push(productFixture({
    id: 'unclassified',
    sku: 'ADG-900003',
    categorySlug: 'unknown',
    name: 'Unknown 100g',
    missing: true,
  }));
  mapping.push({ id: 'unclassified', current_slug: 'KIMCHI-900003' });

  products.push(productFixture({
    id: 'missing-source-map',
    sku: 'ADG-900004',
    categorySlug: 'kimchi',
    name: 'Mapped category without source 100g',
    missing: true,
  }));

  const result = selectPriorityFoodCohort(products, mapping, { limit: 200 });
  const reversed = selectPriorityFoodCohort([...products].reverse(), [...mapping].reverse(), { limit: 200 });

  assert.equal(result.rows.length, 200);
  assert.deepEqual(result.rows.map((row) => row.id), reversed.rows.map((row) => row.id));
  assert.deepEqual(result.exclusions, {
    nonFood: 1,
    hiddenOrProvisional: 1,
    unclassified: 1,
    unmappedSource: 1,
  });

  for (const group of PRIORITY_GROUPS) {
    const selected = result.rows.filter((row) => row.groupId === group.id);
    assert.equal(selected.length, group.quota);
    assert.equal(selected[0].id, `${group.id}-0`);
    assert.equal(selected[0].metadataGapCount, 6);
    assert.equal(selected[0].packageSize.clear, true);
  }

  assert.equal(result.rows[0].source.sourceUrl, 'https://kimchi.pl/product-pol-1.html');
  assert.equal(result.rows.every((row) => row.stock.placeholder100), true);
});

test('rejects duplicate product ids in the historical source mapping', () => {
  assert.throws(
    () => buildSourceMap([
      { id: 'duplicate', current_slug: 'KIMCHI-1' },
      { id: 'duplicate', current_slug: 'KIMCHI-2' },
    ]),
    /Duplicate product id/,
  );
});
