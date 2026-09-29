import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildPageItems,
  decodeOffsetCursor,
  offsetAfterCursorForPage,
} from '../src/lib/listing-pagination.ts';

const E = 'ellipsis';

test('always shows the first and last page, with neighbours of the current one', () => {
  assert.deepEqual(buildPageItems(1, 10, 1), [1, 2, 3, 4, 5, E, 10]);
  assert.deepEqual(buildPageItems(4, 10, 1), [1, 2, 3, 4, 5, E, 10]);
  assert.deepEqual(buildPageItems(5, 10, 1), [1, E, 4, 5, 6, E, 10]);
  assert.deepEqual(buildPageItems(10, 10, 1), [1, E, 6, 7, 8, 9, 10]);
});

test('compact (phone) pager fits five slots', () => {
  assert.deepEqual(buildPageItems(1, 10, 0), [1, 2, 3, E, 10]);
  assert.deepEqual(buildPageItems(4, 10, 0), [1, E, 4, E, 10]);
  assert.deepEqual(buildPageItems(3, 10, 0), [1, 2, 3, E, 10]);
  assert.deepEqual(buildPageItems(10, 10, 0), [1, E, 8, 9, 10]);
  assert.deepEqual(buildPageItems(3, 6, 0), [1, 2, 3, E, 6]);
});

test('lists every page when they all fit', () => {
  assert.deepEqual(buildPageItems(1, 1, 1), [1]);
  assert.deepEqual(buildPageItems(2, 4, 0), [1, 2, 3, 4]);
  assert.deepEqual(buildPageItems(3, 7, 1), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(buildPageItems(1, 5, 0), [1, 2, 3, 4, 5]);
});

test('decodes only the backend offset cursor format', () => {
  assert.equal(decodeOffsetCursor(btoa('offset:23')), 23);
  assert.equal(decodeOffsetCursor(btoa('offset:0')), 0);
  assert.equal(decodeOffsetCursor('listing-page-1'), null);
  assert.equal(decodeOffsetCursor(btoa('cursor-3')), null);
  assert.equal(decodeOffsetCursor(null), null);
  assert.equal(decodeOffsetCursor(''), null);
});

test('builds the after-cursor that starts a given page', () => {
  assert.equal(offsetAfterCursorForPage(1, 24), null);
  assert.equal(atob(offsetAfterCursorForPage(2, 24)), 'offset:23');
  assert.equal(atob(offsetAfterCursorForPage(10, 24)), 'offset:215');
});
