#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const FALLBACK_ENDPOINT = 'https://zira-ai.com/graphql/storefront';
const FALLBACK_CHANNEL = 'chesaigon';

function unquoteEnvValue(value) {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function loadEnvValue(key) {
  const envFiles = ['.env.local', '.env'];

  for (const fileName of envFiles) {
    const filePath = path.join(process.cwd(), fileName);

    if (!fs.existsSync(filePath)) {
      continue;
    }

    const contents = fs.readFileSync(filePath, 'utf8');
    const lines = contents.split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex === -1) continue;

      const candidateKey = trimmed.slice(0, separatorIndex).trim();
      if (candidateKey !== key) continue;

      return unquoteEnvValue(trimmed.slice(separatorIndex + 1));
    }
  }

  return null;
}

function getDefaultEndpoint() {
  return process.env.NEXT_PUBLIC_GRAPHQL_URL
    || loadEnvValue('NEXT_PUBLIC_GRAPHQL_URL')
    || FALLBACK_ENDPOINT;
}

function getDefaultChannel() {
  return process.env.NEXT_PUBLIC_CHANNEL
    || loadEnvValue('NEXT_PUBLIC_CHANNEL')
    || FALLBACK_CHANNEL;
}

export function buildCartOperations(channel) {
  return [
    {
      key: 'cartCreate',
      type: 'Mutation',
      label: 'cartCreate',
      query: `
        mutation CartCreate($channel: String!, $input: CartCreateInput!) {
          cartCreate(channel: $channel, input: $input) {
            cart { id }
            userErrors { field message code }
          }
        }
      `,
      variables: {
        channel,
        input: {},
      },
    },
    {
      key: 'cartLinesAdd',
      type: 'Mutation',
      label: 'cartLinesAdd',
      query: `
        mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
          cartLinesAdd(cartId: $cartId, lines: $lines) {
            cart { id }
            userErrors { field message code }
          }
        }
      `,
      variables: {
        cartId: 'test-cart-id',
        lines: [{ merchandiseId: 'test-variant-id', quantity: 1 }],
      },
    },
    {
      key: 'cartLinesUpdate',
      type: 'Mutation',
      label: 'cartLinesUpdate',
      query: `
        mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
          cartLinesUpdate(cartId: $cartId, lines: $lines) {
            cart { id }
            userErrors { field message code }
          }
        }
      `,
      variables: {
        cartId: 'test-cart-id',
        lines: [{ id: 'test-line-id', quantity: 2 }],
      },
    },
    {
      key: 'cartLinesRemove',
      type: 'Mutation',
      label: 'cartLinesRemove',
      query: `
        mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
          cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
            cart { id }
            userErrors { field message code }
          }
        }
      `,
      variables: {
        cartId: 'test-cart-id',
        lineIds: ['test-line-id'],
      },
    },
    {
      key: 'cartBuyerIdentityUpdate',
      type: 'Mutation',
      label: 'cartBuyerIdentityUpdate',
      query: `
        mutation CartBuyerIdentityUpdate($cartId: ID!, $buyerIdentity: CartBuyerIdentityInput!) {
          cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
            cart { id }
            userErrors { field message code }
          }
        }
      `,
      variables: {
        cartId: 'test-cart-id',
        buyerIdentity: { email: 'probe@example.com' },
      },
    },
    {
      key: 'cartDiscountCodesUpdate',
      type: 'Mutation',
      label: 'cartDiscountCodesUpdate',
      query: `
        mutation CartDiscountCodesUpdate($cartId: ID!, $discountCodes: [String!]!) {
          cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
            cart { id }
            userErrors { field message code }
          }
        }
      `,
      variables: {
        cartId: 'test-cart-id',
        discountCodes: ['TEST10'],
      },
    },
    {
      key: 'cartNoteUpdate',
      type: 'Mutation',
      label: 'cartNoteUpdate',
      query: `
        mutation CartNoteUpdate($cartId: ID!, $note: String!) {
          cartNoteUpdate(cartId: $cartId, note: $note) {
            cart { id }
            userErrors { field message code }
          }
        }
      `,
      variables: {
        cartId: 'test-cart-id',
        note: 'probe note',
      },
    },
    {
      key: 'cartAttributesUpdate',
      type: 'Mutation',
      label: 'cartAttributesUpdate',
      query: `
        mutation CartAttributesUpdate($cartId: ID!, $attributes: [CartAttributeInput!]!) {
          cartAttributesUpdate(cartId: $cartId, attributes: $attributes) {
            cart { id }
            userErrors { field message code }
          }
        }
      `,
      variables: {
        cartId: 'test-cart-id',
        attributes: [{ key: 'probe', value: 'true' }],
      },
    },
    {
      key: 'cartSelectedDeliveryOptionsUpdate',
      type: 'Mutation',
      label: 'cartSelectedDeliveryOptionsUpdate',
      query: `
        mutation CartSelectedDeliveryOptionsUpdate(
          $cartId: ID!,
          $selectedDeliveryOptions: [CartSelectedDeliveryOptionInput!]!
        ) {
          cartSelectedDeliveryOptionsUpdate(
            cartId: $cartId,
            selectedDeliveryOptions: $selectedDeliveryOptions
          ) {
            cart { id }
            userErrors { field message code }
          }
        }
      `,
      variables: {
        cartId: 'test-cart-id',
        selectedDeliveryOptions: [
          {
            deliveryGroupId: 'group-1',
            deliveryOptionHandle: 'option-1',
          },
        ],
      },
    },
    {
      key: 'cartSubmitForCompletion',
      type: 'Mutation',
      label: 'cartSubmitForCompletion',
      query: `
        mutation CartSubmitForCompletion($cartId: ID!) {
          cartSubmitForCompletion(cartId: $cartId) {
            cart { id }
            userErrors { field message code }
          }
        }
      `,
      variables: {
        cartId: 'test-cart-id',
      },
    },
    {
      key: 'cart',
      type: 'Query',
      label: 'cart',
      query: `
        query GetCart($id: ID!) {
          cart(id: $id) { id }
        }
      `,
      variables: {
        id: 'test-cart-id',
      },
    },
    {
      key: 'cartEstimatedCost',
      type: 'Query',
      label: 'cartEstimatedCost',
      query: `
        query CartEstimatedCost($cartId: ID!) {
          cartEstimatedCost(cartId: $cartId) {
            subtotalAmount { amount currency }
          }
        }
      `,
      variables: {
        cartId: 'test-cart-id',
      },
    },
    {
      key: 'cartDeliveryOptions',
      type: 'Query',
      label: 'cartDeliveryOptions',
      query: `
        query CartDeliveryOptions($cartId: ID!, $channel: String!) {
          cartDeliveryOptions(cartId: $cartId, channel: $channel) {
            id
            name
          }
        }
      `,
      variables: {
        cartId: 'test-cart-id',
        channel,
      },
    },
  ];
}

function formatMessage(error) {
  if (!error || typeof error !== 'object') {
    return null;
  }

  const message = typeof error.message === 'string' ? error.message.trim() : '';
  if (!message) {
    return null;
  }

  const code = typeof error.code === 'string'
    ? error.code.trim()
    : typeof error.extensions?.code === 'string'
      ? error.extensions.code.trim()
      : '';

  return code ? `[${code}] ${message}` : message;
}

function walkForPayloadMessages(value, messages) {
  if (!value || typeof value !== 'object') {
    return;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      walkForPayloadMessages(entry, messages);
    }
    return;
  }

  for (const key of ['userErrors', 'errors']) {
    if (!Array.isArray(value[key])) {
      continue;
    }

    for (const error of value[key]) {
      const formatted = formatMessage(error);
      if (formatted) {
        messages.push(formatted);
      }
    }
  }

  for (const entry of Object.values(value)) {
    walkForPayloadMessages(entry, messages);
  }
}

export function collectMessages(body) {
  const messages = [];

  if (Array.isArray(body?.errors)) {
    for (const error of body.errors) {
      const formatted = formatMessage(error);
      if (formatted) {
        messages.push(formatted);
      }
    }
  }

  walkForPayloadMessages(body?.data, messages);
  return messages;
}

export function classifyProbeResult(body) {
  const messages = collectMessages(body);

  return {
    ok: messages.length === 0,
    messages,
  };
}

async function gql(endpoint, request, fetchImpl = fetch) {
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  let body = null;

  try {
    body = await response.json();
  } catch {
    body = {
      errors: [{ message: 'Response was not valid JSON' }],
    };
  }

  return {
    status: response.status,
    request,
    body,
  };
}

export async function probeEndpoint(endpoint, operations, fetchImpl = fetch) {
  const results = [];

  for (const operation of operations) {
    try {
      const response = await gql(
        endpoint,
        {
          query: operation.query,
          variables: operation.variables,
        },
        fetchImpl
      );
      const classification = classifyProbeResult(response.body);

      results.push({
        operation,
        status: response.status,
        request: response.request,
        body: response.body,
        ok: classification.ok,
        messages: classification.messages,
      });
    } catch (error) {
      results.push({
        operation,
        status: 0,
        request: {
          query: operation.query,
          variables: operation.variables,
        },
        body: null,
        ok: false,
        messages: [error instanceof Error ? error.message : 'Unknown request failure'],
      });
    }
  }

  return results;
}

export function buildTextReport(results) {
  return results
    .map((result) => {
      const statusLabel = result.ok ? 'OK   ' : 'FAIL ';
      const message = result.messages.length > 0 ? result.messages.join('; ') : 'No errors';

      return `${statusLabel} | ${result.operation.label}\n       ${message}`;
    })
    .join('\n\n');
}

function allFailuresMentionAttributes(failingResults) {
  return failingResults.length > 0 && failingResults.every((result) =>
    result.messages.some((message) => /attributes/i.test(message))
  );
}

export function buildMarkdownReport({ endpoint, channel, generatedAt, results }) {
  const failingResults = results.filter((result) => !result.ok);
  const passingResults = results.filter((result) => result.ok);
  const attributesFailure = allFailuresMentionAttributes(failingResults);

  const lines = [
    '# Backend Cart Failure Report',
    '',
    `- Generated: ${generatedAt}`,
    `- HTTP endpoint: \`${endpoint}\``,
    `- Channel: \`${channel}\``,
    '',
    '## Summary',
    `- Failing operations: ${failingResults.length}/${results.length}`,
    `- Passing operations: ${passingResults.length}/${results.length}`,
  ];

  if (attributesFailure) {
    lines.push(
      '- The failing cart operations consistently reference a missing `carts.attributes` column.',
      '- This is a backend schema mismatch, not a frontend GraphQL selection issue.'
    );
  } else if (failingResults.length > 0) {
    lines.push('- The probe found backend cart failures. Review the error table below for exact messages.');
  } else {
    lines.push('- All probed cart operations completed without GraphQL errors or userErrors.');
  }

  lines.push(
    '',
    '## Failing Operations',
    '',
    '| Operation | Type | HTTP | Error |',
    '| --- | --- | --- | --- |'
  );

  if (failingResults.length === 0) {
    lines.push('| None | - | - | - |');
  } else {
    for (const result of failingResults) {
      lines.push(
        `| \`${result.operation.label}\` | ${result.operation.type} | ${result.status} | ${result.messages.join('<br>')} |`
      );
    }
  }

  lines.push(
    '',
    '## Passing Operations',
    '',
    '| Operation | Type | HTTP |',
    '| --- | --- | --- |'
  );

  if (passingResults.length === 0) {
    lines.push('| None | - | - |');
  } else {
    for (const result of passingResults) {
      lines.push(`| \`${result.operation.label}\` | ${result.operation.type} | ${result.status} |`);
    }
  }

  lines.push(
    '',
    '## Probe Method',
    '',
    '- `cartCreate` is probed with `input: {}` to prove the failure happens even without cart lines or attributes in the request.',
    '- The remaining cart mutations and queries use placeholder IDs because the current resolver/database failure happens before normal cart validation.',
    '- After the backend schema is repaired, rerun the same probe with a real cart lifecycle if you want semantic validation beyond the schema failure.',
    '',
    '## Missing Backend Piece',
    ''
  );

  if (attributesFailure) {
    lines.push(
      '- The database schema appears to be missing the `attributes` column on the `carts` table.',
      '- The backend cart contract expects cart attributes to exist and exposes them through `CartCreate`, `GetCart`, and `CartAttributesUpdate`.',
      '- The backend team should add the missing column through the backend ORM/migration layer and redeploy.'
    );
  } else {
    lines.push('- No single missing schema field could be inferred from the probe output alone.');
  }

  lines.push(
    '',
    '## Reproduction',
    '',
    '```bash',
    `node scripts/cart-endpoints-probe.mjs --endpoint ${endpoint} --channel ${channel}`,
    '```',
    ''
  );

  return `${lines.join('\n')}\n`;
}

function printUsage(exitCode = 0, errorMessage = null) {
  if (errorMessage) {
    console.error(`Error: ${errorMessage}`);
    console.error('');
  }

  console.log('Usage: node scripts/cart-endpoints-probe.mjs [options]');
  console.log('');
  console.log('Options:');
  console.log(`  --endpoint <url>   GraphQL endpoint to probe (default: ${getDefaultEndpoint()})`);
  console.log(`  --channel <slug>   Storefront channel slug (default: ${getDefaultChannel()})`);
  console.log('  --output <path>    Write a markdown report to the given path');
  console.log('  --help             Show this help message');

  process.exit(exitCode);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    endpoint: getDefaultEndpoint(),
    channel: getDefaultChannel(),
    output: null,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--help') {
      printUsage(0);
    }

    if (!arg.startsWith('--')) {
      printUsage(1, `Unexpected argument "${arg}"`);
    }

    const separatorIndex = arg.indexOf('=');
    const inlineValue = separatorIndex >= 0 ? arg.slice(separatorIndex + 1) : null;
    const key = separatorIndex >= 0 ? arg.slice(2, separatorIndex) : arg.slice(2);
    const value = inlineValue ?? args[index + 1];

    if (value == null || value.startsWith('--')) {
      printUsage(1, `Missing value for "${arg}"`);
    }

    switch (key) {
      case 'endpoint':
        options.endpoint = value;
        break;
      case 'channel':
        options.channel = value;
        break;
      case 'output':
        options.output = value;
        break;
      default:
        printUsage(1, `Unknown option "${arg}"`);
    }

    if (inlineValue == null) {
      index += 1;
    }
  }

  return options;
}

function writeReport(filePath, content) {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, 'utf8');
  return absolutePath;
}

async function main() {
  const options = parseArgs();
  const operations = buildCartOperations(options.channel);
  const results = await probeEndpoint(options.endpoint, operations);

  const textReport = buildTextReport(results);
  console.log(textReport);

  if (options.output) {
    const markdownReport = buildMarkdownReport({
      endpoint: options.endpoint,
      channel: options.channel,
      generatedAt: new Date().toISOString(),
      results,
    });
    const writtenPath = writeReport(options.output, markdownReport);
    console.log('');
    console.log(`Markdown report written to ${writtenPath}`);
  }

  process.exit(results.every((result) => result.ok) ? 0 : 1);
}

const entryPointPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (entryPointPath === path.resolve(new URL(import.meta.url).pathname.replace(/^\//, process.platform === 'win32' ? '' : '/'))) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
