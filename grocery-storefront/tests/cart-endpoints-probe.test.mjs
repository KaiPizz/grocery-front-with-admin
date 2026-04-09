import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCartOperations,
  buildMarkdownReport,
  classifyProbeResult,
  collectMessages,
} from '../scripts/cart-endpoints-probe.mjs';

test('defines all documented cart operations', () => {
  const operations = buildCartOperations('chesaigon');

  assert.equal(operations.length, 13);
  assert.deepEqual(
    operations.map((operation) => operation.label),
    [
      'cartCreate',
      'cartLinesAdd',
      'cartLinesUpdate',
      'cartLinesRemove',
      'cartBuyerIdentityUpdate',
      'cartDiscountCodesUpdate',
      'cartNoteUpdate',
      'cartAttributesUpdate',
      'cartSelectedDeliveryOptionsUpdate',
      'cartSubmitForCompletion',
      'cart',
      'cartEstimatedCost',
      'cartDeliveryOptions',
    ]
  );
});

test('collects top-level and payload cart errors', () => {
  const messages = collectMessages({
    errors: [{ message: 'top level exploded' }],
    data: {
      cartCreate: {
        userErrors: [
          {
            code: 'CHECKOUT_ERROR',
            message: 'column "attributes" of relation "carts" does not exist',
          },
        ],
      },
    },
  });

  assert.deepEqual(messages, [
    'top level exploded',
    '[CHECKOUT_ERROR] column "attributes" of relation "carts" does not exist',
  ]);
});

test('classifies failing and passing probe responses', () => {
  assert.deepEqual(
    classifyProbeResult({
      errors: [],
      data: {
        cartDeliveryOptions: [{ id: 'delivery-standard', name: 'Standard courier' }],
      },
    }),
    {
      ok: true,
      messages: [],
    }
  );

  assert.deepEqual(
    classifyProbeResult({
      errors: [],
      data: {
        cartCreate: {
          cart: null,
          userErrors: [
            {
              code: 'CHECKOUT_ERROR',
              message: 'column "attributes" of relation "carts" does not exist',
            },
          ],
        },
      },
    }),
    {
      ok: false,
      messages: ['[CHECKOUT_ERROR] column "attributes" of relation "carts" does not exist'],
    }
  );
});

test('builds a markdown report that calls out the missing cart attributes column', () => {
  const operations = buildCartOperations('chesaigon');
  const report = buildMarkdownReport({
    endpoint: 'https://zira-ai.com/graphql/storefront',
    channel: 'chesaigon',
    generatedAt: '2026-03-18T13:30:00.000Z',
    results: [
      {
        operation: operations[0],
        status: 200,
        ok: false,
        messages: ['[CHECKOUT_ERROR] column "attributes" of relation "carts" does not exist'],
      },
      {
        operation: operations[12],
        status: 200,
        ok: true,
        messages: [],
      },
    ],
  });

  assert.match(report, /Backend Cart Failure Report/);
  assert.match(report, /cartCreate/);
  assert.match(report, /cartDeliveryOptions/);
  assert.match(report, /`carts\.attributes`/);
});
