import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_FILTERS,
  areFiltersEqual,
  buildProductFilter,
  countActiveFilters,
  normalizeFiltersState,
  parseCountryQueryParams,
  setCountryQueryParams,
} from '../src/components/product-listing/listing-filters.ts';

test('setCountryQueryParams rewrites the country params and keeps the others', () => {
  const params = new URLSearchParams('sort=price_asc&country=Japonia&country=Chiny');

  setCountryQueryParams(params, ['Korea Południowa', ' ', 'Korea Południowa']);
  assert.deepEqual(params.getAll('country'), ['Korea Południowa']);
  assert.equal(params.get('sort'), 'price_asc');

  setCountryQueryParams(params, []);
  assert.equal(params.has('country'), false);
});

// Wave 1 (27/09/2026): the listing filters are category, brand, country of
// origin, storage zone (URL only), in-stock and price. Allergen, dietary and
// certification filters are gone; the backend field names below are the
// storefront GraphQL ProductFilterInput contract.

test('buildProductFilter sends brands and in-stock availability with the backend field names', () => {
  const filter = buildProductFilter({ ...DEFAULT_FILTERS, brands: ['S&B', 'Nestlé'], inStockOnly: true }, '');

  assert.deepEqual(filter.brands, ['S&B', 'Nestlé']);
  assert.equal(filter.stockAvailability, 'IN_STOCK');
  assert.equal('excludeAllergens' in filter, false);
  assert.equal('dietaryTags' in filter, false);
  assert.equal('certifications' in filter, false);
});

test('buildProductFilter omits brands and availability when they are not selected', () => {
  const filter = buildProductFilter({ ...DEFAULT_FILTERS, countryOfOrigin: ['Japonia'], storageZone: 'FROZEN' }, '');

  assert.deepEqual(filter, { countryOfOrigin: ['Japonia'], storageZone: 'FROZEN' });
});

test('parseCountryQueryParams accepts repeated and comma-separated values and drops blanks', () => {
  const params = new URLSearchParams('country=Japonia&country=Chiny,%20Korea%20Po%C5%82udniowa&country=&country=Japonia');

  assert.deepEqual(parseCountryQueryParams(params), ['Japonia', 'Chiny', 'Korea Południowa']);
});

test('parseCountryQueryParams returns an empty list without the parameter', () => {
  assert.deepEqual(parseCountryQueryParams(new URLSearchParams('sort=newest')), []);
});

test('normalizeFiltersState dedupes brands and inStockOnly counts as one active filter', () => {
  const state = normalizeFiltersState({ ...DEFAULT_FILTERS, brands: ['Samyang', 'Samyang', ' '], inStockOnly: true });

  assert.deepEqual(state.brands, ['Samyang']);
  assert.equal(state.inStockOnly, true);
  assert.equal(countActiveFilters(state), 2);
  assert.equal(countActiveFilters(DEFAULT_FILTERS), 0);
});

test('areFiltersEqual compares brands and in-stock', () => {
  const left = { ...DEFAULT_FILTERS, brands: ['Samyang'], inStockOnly: true };

  assert.equal(areFiltersEqual(left, { ...left }), true);
  assert.equal(areFiltersEqual(left, { ...left, inStockOnly: false }), false);
  assert.equal(areFiltersEqual(left, { ...left, brands: ['OTTOGI'] }), false);
});
