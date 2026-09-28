import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  createRail,
  createShowcase,
  createSlide,
  getShowcaseProblems,
  moveItem,
  parseList,
  reviewsFromInputs,
} from './showcase-editor';
import { storefrontConfigSchema } from './validation';

const asiandeligo = () => JSON.parse(readFileSync(new URL('../../data/config-asiandeligo.json', import.meta.url), 'utf8')).published;

const schemaAccepts = (config: unknown) => storefrontConfigSchema.safeParse(config).success;

test('the shipped Asia Deli Go showcase has no editor problems and passes the schema', () => {
  const config = asiandeligo();
  assert.deepEqual(getShowcaseProblems(config.homepage.showcase), []);
  assert.equal(schemaAccepts(config), true);
});

test('a fresh showcase attached to a tenant without one is valid as created', () => {
  const config = asiandeligo();
  config.homepage.showcase = createShowcase();
  assert.deepEqual(getShowcaseProblems(config.homepage.showcase), []);
  assert.equal(schemaAccepts(config), true);
});

test('a new empty slide is reported field by field, and the schema agrees it is invalid', () => {
  const config = asiandeligo();
  const slides = config.homepage.showcase.heroSlides;
  slides.push(createSlide(slides));
  const position = slides.length;
  assert.deepEqual(getShowcaseProblems(config.homepage.showcase), [
    { code: 'slideImage', position },
    { code: 'slideHeadline', position },
    { code: 'slideCta', position },
    { code: 'slideLink', position },
  ]);
  assert.equal(schemaAccepts(config), false);

  Object.assign(slides[position - 1], {
    imageUrl: 'https://asiandeligo-admin.eshoper.pro/uploads/hero.webp',
    headline: 'Nowość',
    ctaText: 'Zobacz',
    ctaLink: '/categories/kimchi',
  });
  assert.deepEqual(getShowcaseProblems(config.homepage.showcase), []);
  assert.equal(schemaAccepts(config), true);
});

test('a disabled slide still has to be complete (the schema checks it too)', () => {
  const config = asiandeligo();
  const slides = config.homepage.showcase.heroSlides;
  slides.push({ ...createSlide(slides), enabled: false });
  assert.equal(getShowcaseProblems(config.homepage.showcase).length > 0, true);
  assert.equal(schemaAccepts(config), false);
});

test('rails: title, at least one value and a 3–24 limit', () => {
  const config = asiandeligo();
  const rails = config.homepage.showcase.rails;
  rails.push(createRail(rails));
  const position = rails.length;
  assert.deepEqual(getShowcaseProblems(config.homepage.showcase), [
    { code: 'railTitle', position },
    { code: 'railValues', position },
  ]);
  assert.equal(schemaAccepts(config), false);

  Object.assign(rails[position - 1], { title: 'Ramen', values: parseList('ramyun-w-paczce, ') });
  assert.equal(schemaAccepts(config), true);

  rails[position - 1].limit = 30;
  assert.deepEqual(getShowcaseProblems(config.homepage.showcase), [{ code: 'railLimit', position }]);
  assert.equal(schemaAccepts(config), false);
});

test('store: maps link and reviews are optional, but typed reviews need a real link', () => {
  const config = asiandeligo();
  const store = config.homepage.showcase.store;
  assert.equal(reviewsFromInputs(' ', '', ''), null);

  store.reviews = reviewsFromInputs('4,8', '37', '');
  assert.deepEqual(store.reviews, { rating: 4.8, count: 37, url: '' });
  assert.deepEqual(getShowcaseProblems(config.homepage.showcase), [{ code: 'reviewsUrl' }]);
  assert.equal(schemaAccepts(config), false);

  store.reviews = reviewsFromInputs('4.8', '37', 'https://g.page/r/example/review');
  store.mapsUrl = 'https://maps.app.goo.gl/example';
  assert.deepEqual(getShowcaseProblems(config.homepage.showcase), []);
  assert.equal(schemaAccepts(config), true);

  store.mapsUrl = 'javascript:alert(1)';
  assert.deepEqual(getShowcaseProblems(config.homepage.showcase), [{ code: 'mapsUrl' }]);
  assert.equal(schemaAccepts(config), false);
});

test('parseList splits on commas and new lines and drops blanks', () => {
  assert.deepEqual(parseList('Samyang, Nongshim,\nOttogi,, '), ['Samyang', 'Nongshim', 'Ottogi']);
  assert.deepEqual(parseList(''), []);
});

test('moveItem swaps neighbours and ignores moves past either end', () => {
  assert.deepEqual(moveItem(['a', 'b', 'c'], 0, 1), ['b', 'a', 'c']);
  const same = ['a', 'b'];
  assert.equal(moveItem(same, 0, -1), same);
  assert.equal(moveItem(same, 1, 1), same);
});

test('new slide and rail ids never collide with existing ones', () => {
  const slide = createSlide([]);
  const next = createSlide([slide]);
  assert.notEqual(slide.id, next.id);
  const rail = createRail([]);
  assert.notEqual(createRail([rail]).id, rail.id);
});
