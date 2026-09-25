import { readFileSync } from 'node:fs';
import * as fsSync from 'node:fs';
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

test('checkout creation queries line totals using the backend Money contract', () => {
  const block = exportedConstantBlock('CHECKOUT_CREATE_MUTATION');
  const linesBlock = block.slice(block.indexOf('lines {'), block.indexOf('subtotalPrice'));

  assert.match(linesBlock, /totalPrice\s*\{\s*amount\s+currency\s*\}/);
  assert.doesNotMatch(linesBlock, /totalPrice\s*\{\s*gross\s*\{/);
  assert.match(block, /subtotalPrice\s*\{\s*gross\s*\{\s*amount\s+currency\s*\}\s*\}/);
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

const paymentReturnPageSource = readFileSync(
  new URL('../src/app/[locale]/(shop)/checkout/payment-return/page.tsx', import.meta.url),
  'utf8'
);

function functionBlock(source, name, nextName) {
  const start = source.indexOf(`async function ${name}(`);
  assert.notEqual(start, -1, `Missing function ${name}`);
  const end = source.indexOf(`async function ${nextName}(`, start + 1);
  assert.notEqual(end, -1, `Missing function ${nextName} after ${name}`);
  return source.slice(start, end);
}

test('P24 selection is local state and never registers a payment before the order exists', () => {
  const selection = functionBlock(checkoutPageSource, 'handlePaymentSelection', 'handlePromoApply');
  const p24Branch = selection.indexOf('isP24Method(method)');
  const legacyCreate = selection.indexOf('CHECKOUT_PAYMENT_CREATE');

  assert.notEqual(p24Branch, -1);
  assert.notEqual(legacyCreate, -1);
  assert.ok(p24Branch < legacyCreate, 'P24 branch must return before the legacy payment session is created');
});

test('P24 checkout completes the order with explicit Terms acceptance, then registers the payment for that order', () => {
  const placeOrderStart = checkoutPageSource.indexOf('async function handlePlaceOrder(');
  const placeOrderEnd = checkoutPageSource.indexOf('if (!isHydrated || !initialized', placeOrderStart);
  assert.ok(placeOrderStart > -1 && placeOrderEnd > placeOrderStart);
  const placeOrder = checkoutPageSource.slice(placeOrderStart, placeOrderEnd);
  assert.match(placeOrder, /CHECKOUT_COMPLETE_MUTATION/);
  assert.match(placeOrder, /termsAccepted:\s*true/);
  assert.match(placeOrder, /paymentData:\s*'p24'/);
  assert.doesNotMatch(placeOrder, /CHECKOUT_PAYMENT_CREATE/);

  const start = functionBlock(checkoutPageSource, 'startP24Payment', 'handlePlaceOrder');
  assert.match(start, /CHECKOUT_PAYMENT_CREATE/);
  assert.match(start, /gateway:\s*'p24'/);
  assert.match(start, /orderId:\s*order\.id/);
  assert.match(start, /window\.location\.assign\(payload\.payment\.actionUrl\)/);
  assert.doesNotMatch(start, /actionUrl\s*=\s*['"`]/, 'redirect target must come from the backend, not client code');
});

test('payment return page derives the outcome from the backend status endpoint only', () => {
  assert.match(paymentReturnPageSource, /\/api\/v1\/payments\/p24\/status\?payment_id=/);
  assert.doesNotMatch(paymentReturnPageSource, /searchParams\.get\(['"]status['"]\)/);
  assert.match(paymentReturnPageSource, /clearTimeout\(/);
});

test('no Przelewy24 secrets or credential fields are shipped in client source', () => {
  const { readdirSync, statSync } = fsSync;
  const root = new URL('../src/', import.meta.url).pathname;
  const offenders = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = `${dir}/${entry}`;
      if (statSync(full).isDirectory()) {
        walk(full);
      } else if (/\.(ts|tsx|js|mjs|json)$/.test(entry)) {
        const text = readFileSync(full, 'utf8');
        if (/p24CrcKey|p24ApiKey|crcKey|P24_CRC|P24_API_KEY/.test(text)) {
          offenders.push(full.slice(root.length));
        }
      }
    }
  };
  walk(root.replace(/\/$/, ''));
  assert.deepEqual(offenders, []);
});
