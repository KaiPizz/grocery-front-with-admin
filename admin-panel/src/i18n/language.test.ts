import assert from 'node:assert/strict';
import test from 'node:test';

import { isSupportedLanguage } from './index';

test('accepts only explicit supported language codes', () => {
  assert.equal(isSupportedLanguage('en'), true);
  assert.equal(isSupportedLanguage('vi'), true);
  assert.equal(isSupportedLanguage('pl'), true);
  assert.equal(isSupportedLanguage('toString'), false);
  assert.equal(isSupportedLanguage('constructor'), false);
  assert.equal(isSupportedLanguage('__proto__'), false);
  assert.equal(isSupportedLanguage(null), false);
});
