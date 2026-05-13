import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const operationsSource = readFileSync(new URL('../src/lib/graphql/operations/grocery.ts', import.meta.url), 'utf8');
const checkoutPageSource = readFileSync(
  new URL('../src/app/[locale]/(shop)/checkout/page.tsx', import.meta.url),
  'utf8'
);

function exportedConstantBlock(name) {
  const start = operationsSource.indexOf(`export const ${name}`);

  assert.notEqual(start, -1, `Missing exported GraphQL operation ${name}`);

  const nextExport = operationsSource.indexOf('\nexport const ', start + 1);

  return operationsSource.slice(start, nextExport === -1 ? operationsSource.length : nextExport);
}

test('available payment methods query matches the backend id-based contract', () => {
  const block = exportedConstantBlock('AVAILABLE_PAYMENT_METHODS_QUERY');

  assert.match(block, /query AvailablePaymentMethods\(\$channel: String!\)/);
  assert.doesNotMatch(block, /\bcountryCode\b/);
  assert.doesNotMatch(block, /\bcode\b/);
  assert.match(block, /\bid\b/);
  assert.match(block, /\bname\b/);
  assert.match(block, /\bdescription\b/);
  assert.match(block, /\bprovider\b/);
  assert.match(block, /\bisActive\b/);
  assert.match(block, /fee\s*\{\s*amount\s+currency\s*\}/);
});

test('checkout page pays with payment method id and does not use cart discount mutation', () => {
  assert.match(checkoutPageSource, /CHECKOUT_PROMO_CODE_ADD/);
  assert.match(checkoutPageSource, /gateway:\s*method\.id/);
  assert.doesNotMatch(checkoutPageSource, /method\.code/);
  assert.doesNotMatch(checkoutPageSource, /\bupdateDiscountCodes\b/);
});

test('legacy checkout promo mutations target checkout promo endpoints', () => {
  const addBlock = exportedConstantBlock('CHECKOUT_PROMO_CODE_ADD');
  const removeBlock = exportedConstantBlock('CHECKOUT_PROMO_CODE_REMOVE');

  assert.match(addBlock, /mutation CheckoutPromoCodeAdd\(\$checkoutId: ID!, \$promoCode: String!\)/);
  assert.match(addBlock, /checkoutPromoCodeAdd\(input:\s*\{\s*checkoutId:\s*\$checkoutId,\s*promoCode:\s*\$promoCode\s*\}\)/);
  assert.match(addBlock, /errors\s*\{\s*field\s+message\s+code\s*\}/);

  assert.match(removeBlock, /mutation CheckoutPromoCodeRemove\(\$checkoutId: ID!\)/);
  assert.match(removeBlock, /checkoutPromoCodeRemove\(checkoutId:\s*\$checkoutId\)/);
  assert.match(removeBlock, /errors\s*\{\s*field\s+message\s+code\s*\}/);
});
