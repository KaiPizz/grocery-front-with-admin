#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const LIVE_ENDPOINT = 'https://zira-ai.com/graphql/storefront';
const PROXY_ENDPOINT = 'http://localhost:3008/api/graphql';
const DEFAULT_PRODUCT_COUNT = 3;

const LOGIN_MUTATION = `
  mutation CustomerLogin($input: LoginInput!) {
    customerLogin(input: $input) {
      accessToken
      refreshToken
      success
      message
      customer { id email fullName }
      errors { field message code }
    }
  }
`;

const ME_QUERY = `
  query Me {
    me { id email fullName phone createdAt }
  }
`;

const WISHLIST_QUERY = `
  query Wishlist {
    wishlist {
      items { productId variantId addedAt name price }
    }
  }
`;

const WISHLIST_SYNC_MUTATION = `
  mutation WishlistSync($productIds: [ID!]!) {
    wishlistSync(productIds: $productIds) {
      success
      message
      items { productId variantId addedAt name price }
    }
  }
`;

const PRODUCTS_QUERY = `
  query Products($channel: String!, $first: Int!) {
    products(channel: $channel, first: $first) {
      edges {
        node { id name }
      }
    }
  }
`;

function printUsage(exitCode = 0, errorMessage = null) {
  if (errorMessage) {
    console.error(`Error: ${errorMessage}`);
    console.error('');
  }

  console.log('Usage: node scripts/auth-probe.mjs --email <email> --password <password> [options]');
  console.log('');
  console.log('Options:');
  console.log('  --channel <slug>         Channel slug to use for product lookup');
  console.log(`  --product-count <n>      Number of products to probe (default: ${DEFAULT_PRODUCT_COUNT})`);
  console.log('  --product-ids <ids>      Comma-separated product IDs to sync');
  console.log('  --output <path>          Write a markdown report to the given path');
  console.log('  --help                   Show this help message');

  process.exit(exitCode);
}

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

      const value = trimmed.slice(separatorIndex + 1);
      return unquoteEnvValue(value);
    }
  }

  return null;
}

function getDefaultChannel() {
  return process.env.NEXT_PUBLIC_CHANNEL || loadEnvValue('NEXT_PUBLIC_CHANNEL') || 'chesaigon';
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    email: null,
    password: null,
    channel: getDefaultChannel(),
    productCount: DEFAULT_PRODUCT_COUNT,
    productIds: [],
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

    const key = arg.slice(2);
    const value = args[index + 1];

    if (value == null || value.startsWith('--')) {
      printUsage(1, `Missing value for "${arg}"`);
    }

    switch (key) {
      case 'email':
        options.email = value;
        break;
      case 'password':
        options.password = value;
        break;
      case 'channel':
        options.channel = value;
        break;
      case 'product-count': {
        const parsed = Number.parseInt(value, 10);

        if (!Number.isInteger(parsed) || parsed < 1) {
          printUsage(1, `Invalid --product-count "${value}"`);
        }

        options.productCount = parsed;
        break;
      }
      case 'product-ids':
        options.productIds = value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
        break;
      case 'output':
        options.output = value;
        break;
      default:
        printUsage(1, `Unknown option "${arg}"`);
    }

    index += 1;
  }

  if (!options.email || !options.password) {
    printUsage(1, 'Both --email and --password are required');
  }

  return options;
}

async function gql(endpoint, request, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });

  const interestingHeaders = {};
  for (const name of ['www-authenticate', 'x-request-id', 'x-error', 'set-cookie']) {
    const value = response.headers.get(name);
    if (value) {
      interestingHeaders[name] = value;
    }
  }

  response.headers.forEach((value, name) => {
    if (name.startsWith('x-')) {
      interestingHeaders[name] = value;
    }
  });

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  return {
    status: response.status,
    headers: interestingHeaders,
    body,
    request,
  };
}

function collectMessages(result) {
  const errors = result.body?.errors ?? [];
  const messages = errors.map((error) => String(error.message || '')).filter(Boolean);
  const payloadMessage = result.body?.data?.wishlistSync?.message;

  if (payloadMessage) {
    messages.push(String(payloadMessage));
  }

  return messages.map((message) => message.toLowerCase());
}

function isAuthFailure(result) {
  if (result.status === 401 || result.status === 403) {
    return true;
  }

  return collectMessages(result).some((message) =>
    message.includes('auth')
    || message.includes('unauthorized')
    || message.includes('forbidden')
    || message.includes('not authenticated')
    || message.includes('access denied')
  );
}

function classifyAuthResult(operation, result) {
  if (isAuthFailure(result)) {
    return 'FAIL (auth)';
  }

  const errors = result.body?.errors ?? [];
  if (errors.length > 0) {
    return 'FAIL (other)';
  }

  switch (operation) {
    case 'me':
      return result.body?.data?.me?.id ? 'PASS' : 'FAIL (other)';
    case 'wishlist':
      return Array.isArray(result.body?.data?.wishlist?.items) ? 'PASS' : 'FAIL (other)';
    case 'wishlistSync':
      return (
        result.body?.data?.wishlistSync?.success === true
        && Array.isArray(result.body?.data?.wishlistSync?.items)
      )
        ? 'PASS'
        : 'FAIL (other)';
    default:
      return 'FAIL (other)';
  }
}

function printResult(title, result, verdict) {
  console.log('');
  console.log('='.repeat(72));
  console.log(title);
  console.log('='.repeat(72));
  console.log(`Verdict: ${verdict}`);
  console.log(`HTTP:    ${result.status}`);
  if (Object.keys(result.headers).length > 0) {
    console.log(`Headers: ${JSON.stringify(result.headers, null, 2)}`);
  }
  console.log('Request:');
  console.log(JSON.stringify(result.request, null, 2));
  console.log('Body:');
  console.log(JSON.stringify(result.body, null, 2));
}

function isProxyUnavailable(result) {
  return result.body == null && result.status >= 400;
}

function buildSection(title, result, verdict) {
  return [
    `## ${title}`,
    '',
    `- Verdict: \`${verdict}\``,
    `- HTTP: \`${result.status}\``,
    '',
    '### Request',
    '```json',
    JSON.stringify(result.request, null, 2),
    '```',
    '',
    '### Response',
    '```json',
    JSON.stringify(result.body, null, 2),
    '```',
  ].join('\n');
}

async function fetchExistingWishlistItems(endpoint, token) {
  const result = await gql(endpoint, { query: WISHLIST_QUERY }, token);
  const items = result.body?.data?.wishlist?.items;

  if (!Array.isArray(items)) {
    throw new Error(`Could not read wishlist from ${endpoint}`);
  }

  return items;
}

async function fetchCandidateProductIds(channel, productCount, excludeProductIds) {
  const result = await gql(LIVE_ENDPOINT, {
    query: PRODUCTS_QUERY,
    variables: { channel, first: Math.max(productCount * 3, productCount) },
  });

  const errors = result.body?.errors ?? [];
  if (errors.length > 0) {
    throw new Error(`Products query failed: ${JSON.stringify(errors)}`);
  }

  const edges = result.body?.data?.products?.edges;
  if (!Array.isArray(edges) || edges.length === 0) {
    throw new Error(`No products found for channel "${channel}"`);
  }

  const preferredIds = [];
  const fallbackIds = [];

  for (const edge of edges) {
    const productId = edge?.node?.id;
    if (!productId) continue;

    fallbackIds.push(productId);

    if (!excludeProductIds.has(productId)) {
      preferredIds.push(productId);
    }
  }

  const combined = [...preferredIds, ...fallbackIds];
  return Array.from(new Set(combined)).slice(0, productCount);
}

function buildPersistenceFailureReport({
  channel,
  productIds,
  syncResult,
  directWishlistResult,
  proxyWishlistResult,
}) {
  return [
    '# Backend Escalation: Wishlist Sync Does Not Persist Items',
    '',
    '## Expected Contract',
    '- `wishlistSync(productIds)` should persist the provided items for the authenticated customer.',
    '- A fresh `wishlist` query immediately after sync should include those product IDs.',
    '',
    '## Probe Inputs',
    `- Channel: \`${channel}\``,
    `- Product IDs: ${productIds.map((productId) => `\`${productId}\``).join(', ')}`,
    '',
    '## Exact Sync Request',
    '```json',
    JSON.stringify(syncResult.request, null, 2),
    '```',
    '',
    '## Sync Response',
    '```json',
    JSON.stringify(syncResult.body, null, 2),
    '```',
    '',
    '## Follow-up Wishlist Response (Direct)',
    '```json',
    JSON.stringify(directWishlistResult.body, null, 2),
    '```',
    '',
    '## Follow-up Wishlist Response (Proxy)',
    '```json',
    JSON.stringify(proxyWishlistResult.body, null, 2),
    '```',
  ].join('\n');
}

async function runPersistenceProbe(token, channel, productIdsFromArgs, productCount) {
  const existingWishlistItems = await fetchExistingWishlistItems(LIVE_ENDPOINT, token);
  const existingProductIds = new Set(existingWishlistItems.map((item) => item.productId).filter(Boolean));

  const productIds = productIdsFromArgs.length > 0
    ? productIdsFromArgs
    : await fetchCandidateProductIds(channel, productCount, existingProductIds);

  if (productIds.length === 0) {
    throw new Error('No product IDs available for persistence probe');
  }

  const syncRequest = {
    query: WISHLIST_SYNC_MUTATION,
    variables: { productIds },
  };

  const syncResult = await gql(LIVE_ENDPOINT, syncRequest, token);
  const directWishlistResult = await gql(LIVE_ENDPOINT, { query: WISHLIST_QUERY }, token);
  let proxyWishlistResult = null;
  let proxyAvailable = true;

  try {
    const candidate = await gql(PROXY_ENDPOINT, { query: WISHLIST_QUERY }, token);

    if (isProxyUnavailable(candidate)) {
      proxyAvailable = false;
    } else {
      proxyWishlistResult = candidate;
    }
  } catch {
    proxyAvailable = false;
  }

  const directItems = directWishlistResult.body?.data?.wishlist?.items;
  const proxyItems = proxyWishlistResult?.body?.data?.wishlist?.items;
  const directIds = new Set(Array.isArray(directItems) ? directItems.map((item) => item.productId) : []);
  const proxyIds = new Set(Array.isArray(proxyItems) ? proxyItems.map((item) => item.productId) : []);

  const missingFromDirect = productIds.filter((productId) => !directIds.has(productId));
  const missingFromProxy = proxyAvailable
    ? productIds.filter((productId) => !proxyIds.has(productId))
    : [];
  const passed = missingFromDirect.length === 0 && (!proxyAvailable || missingFromProxy.length === 0);

  console.log('');
  console.log('='.repeat(72));
  console.log('Persistence Probe');
  console.log('='.repeat(72));
  console.log(`Channel:       ${channel}`);
  console.log(`Product IDs:   ${productIds.join(', ')}`);
  console.log(`Sync success:  ${syncResult.body?.data?.wishlistSync?.success === true}`);
  console.log(`Direct saved:  ${missingFromDirect.length === 0 ? 'yes' : `no (missing ${missingFromDirect.join(', ')})`}`);
  console.log(
    `Proxy read:    ${
      proxyAvailable
        ? (missingFromProxy.length === 0 ? 'yes' : `no (missing ${missingFromProxy.join(', ')})`)
        : 'skipped (proxy unavailable)'
    }`
  );
  console.log('');
  console.log('Sync request:');
  console.log(JSON.stringify(syncResult.request, null, 2));
  console.log('Sync response:');
  console.log(JSON.stringify(syncResult.body, null, 2));
  console.log('Follow-up wishlist (direct):');
  console.log(JSON.stringify(directWishlistResult.body, null, 2));
  if (proxyAvailable && proxyWishlistResult) {
    console.log('Follow-up wishlist (proxy):');
    console.log(JSON.stringify(proxyWishlistResult.body, null, 2));
  } else {
    console.log('Follow-up wishlist (proxy): skipped because /api/graphql was unavailable.');
  }

  const failureReport = passed
    ? null
    : buildPersistenceFailureReport({
        channel,
        productIds,
        syncResult,
        directWishlistResult,
        proxyWishlistResult: proxyWishlistResult ?? { body: { skipped: true } },
      });

  if (failureReport) {
    console.log('');
    console.log('Persistence escalation packet:');
    console.log(failureReport);
  }

  return {
    passed,
    productIds,
    missingFromDirect,
    missingFromProxy,
    proxyAvailable,
    syncResult,
    directWishlistResult,
    proxyWishlistResult,
  };
}

function buildReport({
  email,
  channel,
  loginPayload,
  authSections,
  persistence,
}) {
  const lines = [
    '# Wishlist Persistence Probe',
    '',
    `- Generated: ${new Date().toISOString()}`,
    `- Email: \`${email}\``,
    `- Channel: \`${channel}\``,
    `- Customer: \`${loginPayload.customer?.email}\` (${loginPayload.customer?.fullName})`,
    '',
    '## Final Diagnosis',
    persistence.passed
      ? '- Wishlist auth and persistence both work.'
      : '- Wishlist auth works, but persistence still fails.',
    persistence.passed
      ? '- The synced product IDs were returned by a fresh `wishlist` read.'
      : '- `wishlistSync(productIds)` accepted the request, but the follow-up `wishlist` read did not contain the synced product IDs.',
    '',
    '## Auth Checks',
    ...authSections.flatMap((section) => [section, '']),
    '## Persistence Check',
    '',
    `- Product IDs: ${persistence.productIds.map((productId) => `\`${productId}\``).join(', ')}`,
    `- Direct saved: ${persistence.missingFromDirect.length === 0 ? 'yes' : `no (missing ${persistence.missingFromDirect.join(', ')})`}`,
    `- Proxy read: ${
      persistence.proxyAvailable
        ? (persistence.missingFromProxy.length === 0 ? 'yes' : `no (missing ${persistence.missingFromProxy.join(', ')})`)
        : 'skipped (proxy unavailable in local environment)'
    }`,
    '',
    '### Sync Request',
    '```json',
    JSON.stringify(persistence.syncResult.request, null, 2),
    '```',
    '',
    '### Sync Response',
    '```json',
    JSON.stringify(persistence.syncResult.body, null, 2),
    '```',
    '',
    '### Follow-up Wishlist (Direct)',
    '```json',
    JSON.stringify(persistence.directWishlistResult.body, null, 2),
    '```',
    '',
    '### Follow-up Wishlist (Proxy)',
    '```json',
    JSON.stringify(
      persistence.proxyWishlistResult?.body ?? { skipped: true, reason: 'proxy unavailable in local environment' },
      null,
      2
    ),
    '```',
  ];

  if (!persistence.passed) {
    lines.push(
      '',
      '## Backend Escalation Packet',
      '',
      '- Expected contract: after a successful `wishlistSync(productIds)`, a fresh `wishlist` query must return those product IDs for the authenticated customer.',
      '- Actual result: `success: true`, but `items: []` on sync and `items: []` on follow-up read.',
      '',
      '### Missing Product IDs',
      persistence.missingFromDirect.map((productId) => `- \`${productId}\``).join('\n') || '- None',
    );
  }

  return `${lines.join('\n')}\n`;
}

function writeReport(filePath, content) {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, 'utf8');
  return absolutePath;
}

async function main() {
  const options = parseArgs();

  console.log('');
  console.log(`Logging in as ${options.email} against ${LIVE_ENDPOINT}`);

  const loginResult = await gql(
    LIVE_ENDPOINT,
    {
      query: LOGIN_MUTATION,
      variables: {
        input: {
          email: options.email,
          password: options.password,
        },
      },
    }
  );

  const loginPayload = loginResult.body?.data?.customerLogin;
  if (!loginPayload?.success || !loginPayload?.accessToken) {
    printResult('Login', loginResult, 'FAIL');
    process.exit(1);
  }

  const token = loginPayload.accessToken;
  console.log(`Login successful. Token prefix: ${token.slice(0, 20)}...`);
  console.log(`Customer: ${loginPayload.customer?.email} (${loginPayload.customer?.fullName})`);

  const authOperations = [
    { key: 'me', label: 'Me', request: { query: ME_QUERY } },
    { key: 'wishlist', label: 'Wishlist', request: { query: WISHLIST_QUERY } },
    {
      key: 'wishlistSync',
      label: 'WishlistSync',
      request: {
        query: WISHLIST_SYNC_MUTATION,
        variables: { productIds: [] },
      },
    },
  ];

  let authFailed = false;
  const authSections = [];

  for (const operation of authOperations) {
    const directResult = await gql(LIVE_ENDPOINT, operation.request, token);
    const directVerdict = classifyAuthResult(operation.key, directResult);
    printResult(`${operation.label} -> direct`, directResult, directVerdict);
    authFailed = authFailed || directVerdict !== 'PASS';
    authSections.push(buildSection(`${operation.label} -> direct`, directResult, directVerdict));

    try {
      const proxyResult = await gql(PROXY_ENDPOINT, operation.request, token);

      if (isProxyUnavailable(proxyResult)) {
        console.log('');
        console.log('='.repeat(72));
        console.log(`${operation.label} -> proxy`);
        console.log('='.repeat(72));
        console.log('Verdict: SKIP (proxy unavailable)');
        console.log('Request:');
        console.log(JSON.stringify(proxyResult.request, null, 2));
        console.log('Body:');
        console.log('null');
        authSections.push(buildSection(`${operation.label} -> proxy`, proxyResult, 'SKIP (proxy unavailable)'));
      } else {
        const proxyVerdict = classifyAuthResult(operation.key, proxyResult);
        printResult(`${operation.label} -> proxy`, proxyResult, proxyVerdict);
        authFailed = authFailed || proxyVerdict !== 'PASS';
        authSections.push(buildSection(`${operation.label} -> proxy`, proxyResult, proxyVerdict));
      }
    } catch (error) {
      console.log('');
      console.log('='.repeat(72));
      console.log(`${operation.label} -> proxy`);
      console.log('='.repeat(72));
      console.log('Verdict: SKIP (proxy unavailable)');
      console.log(`Reason: ${error.message}`);
      authSections.push(
        [
          `## ${operation.label} -> proxy`,
          '',
          '- Verdict: `SKIP (proxy unavailable)`',
          `- Reason: ${error.message}`,
        ].join('\n')
      );
    }
  }

  if (authFailed) {
    console.log('');
    console.log('Diagnosis: protected auth is still broken. Fix auth before testing persistence.');
    if (options.output) {
      const report = buildReport({
        email: options.email,
        channel: options.channel,
        loginPayload,
        authSections,
        persistence: {
          passed: false,
          productIds: [],
          missingFromDirect: [],
          missingFromProxy: [],
          proxyAvailable: false,
          syncResult: { request: {}, body: { skipped: true } },
          directWishlistResult: { body: { skipped: true } },
          proxyWishlistResult: { body: { skipped: true } },
        },
      });
      const writtenPath = writeReport(options.output, report);
      console.log(`Report written to ${writtenPath}`);
    }
    process.exit(1);
  }

  const persistence = await runPersistenceProbe(
    token,
    options.channel,
    options.productIds,
    options.productCount
  );

  console.log('');
  console.log('='.repeat(72));
  console.log('Final diagnosis');
  console.log('='.repeat(72));

  if (persistence.passed) {
    if (persistence.proxyAvailable) {
      console.log('Wishlist persistence works. Auth and server-side save/read are both healthy.');
    } else {
      console.log('Wishlist persistence works on the live endpoint. Proxy verification was skipped because /api/graphql was unavailable.');
    }
    if (options.output) {
      const report = buildReport({
        email: options.email,
        channel: options.channel,
        loginPayload,
        authSections,
        persistence,
      });
      const writtenPath = writeReport(options.output, report);
      console.log(`Report written to ${writtenPath}`);
    }
    process.exit(0);
  }

  console.log('Wishlist auth works, but persistence still fails.');
  console.log('Backend accepted the sync request but the follow-up wishlist read did not contain the synced product IDs.');
  if (options.output) {
    const report = buildReport({
      email: options.email,
      channel: options.channel,
      loginPayload,
      authSections,
      persistence,
    });
    const writtenPath = writeReport(options.output, report);
    console.log(`Report written to ${writtenPath}`);
  }
  process.exit(1);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
