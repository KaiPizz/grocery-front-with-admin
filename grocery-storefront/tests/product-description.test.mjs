import assert from 'node:assert/strict';
import test from 'node:test';

import { getDescriptionBeyondTitle } from '../src/lib/product-description.ts';

// SPEC SOURCE: PDP audit 2026-09-25 — "Opis" repeated the product name for 250
// products and opened with it for 198 more (live catalog, 1 778 products).

const NAME = 'Baza do zupy hot pot, bardzo ostra 220g - HAIDILAO';

test('drops a description that only repeats the product name', () => {
  assert.equal(getDescriptionBeyondTitle(NAME, NAME), null);
  assert.equal(getDescriptionBeyondTitle(`  ${NAME}.`, NAME), null);
  assert.equal(getDescriptionBeyondTitle('baza do zupy hot pot bardzo ostra 220g HAIDILAO', NAME), null);
});

test('keeps only the text after a repeated name', () => {
  assert.equal(
    getDescriptionBeyondTitle(`${NAME} 1. Przygotowanie płynu: wlej 1 litr wody.`, NAME),
    '1. Przygotowanie płynu: wlej 1 litr wody.',
  );
  assert.equal(getDescriptionBeyondTitle(`${NAME} - Zalej wrzątkiem.`, NAME), 'Zalej wrzątkiem.');
});

test('leaves an independent description untouched', () => {
  assert.equal(getDescriptionBeyondTitle('Ostra baza do hot pot.', NAME), 'Ostra baza do hot pot.');
  assert.equal(getDescriptionBeyondTitle('Opis', ''), 'Opis');
  assert.equal(getDescriptionBeyondTitle('   ', NAME), null);
  assert.equal(getDescriptionBeyondTitle(undefined, NAME), null);
});
