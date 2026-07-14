import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const operationsSource = readFileSync(new URL('../src/lib/graphql/operations/grocery.ts', import.meta.url), 'utf8');
const addressPanelSource = readFileSync(new URL('../src/components/account/AddressesPanel.tsx', import.meta.url), 'utf8');
const checkoutSource = readFileSync(new URL('../src/app/[locale]/(shop)/checkout/page.tsx', import.meta.url), 'utf8');
const proxySource = readFileSync(new URL('../src/app/api/graphql/route.ts', import.meta.url), 'utf8');
const typesSource = readFileSync(new URL('../src/types/index.ts', import.meta.url), 'utf8');
const localAddressRoute = new URL('../src/app/api/addresses/route.ts', import.meta.url);

function exportedConstantBlock(name) {
  const start = operationsSource.indexOf(`export const ${name}`);

  assert.notEqual(start, -1, `Missing exported GraphQL operation ${name}`);

  const nextExport = operationsSource.indexOf('\nexport const ', start + 1);
  return operationsSource.slice(start, nextExport === -1 ? operationsSource.length : nextExport);
}

test('customer addresses use authenticated GraphQL only and the local JSON API is gone', () => {
  assert.equal(existsSync(localAddressRoute), false, 'The insecure local address route must stay removed');
  assert.doesNotMatch(addressPanelSource, /\/api\/addresses/);
  assert.doesNotMatch(checkoutSource, /\/api\/addresses/);
  assert.match(addressPanelSource, /CUSTOMER_ADDRESSES_QUERY/);
  assert.match(addressPanelSource, /CUSTOMER_ADDRESS_CREATE_MUTATION/);
  assert.match(addressPanelSource, /CUSTOMER_ADDRESS_UPDATE_MUTATION/);
  assert.match(addressPanelSource, /CUSTOMER_ADDRESS_DELETE_MUTATION/);
  assert.match(addressPanelSource, /CUSTOMER_ADDRESS_SET_DEFAULT_MUTATION/);
  assert.match(checkoutSource, /CUSTOMER_ADDRESSES_QUERY/);
});

test('address phone is required by both the TypeScript and form contracts', () => {
  const inputStart = typesSource.indexOf('export interface CustomerAddressInput');
  const inputEnd = typesSource.indexOf('\n}', inputStart);
  const inputBlock = typesSource.slice(inputStart, inputEnd);

  assert.match(inputBlock, /phone:\s*string;/);
  assert.doesNotMatch(inputBlock, /phone\?:|phone:\s*string\s*\|\s*null/);
  assert.match(addressPanelSource, /key:\s*'phone'[\s\S]*required:\s*true/);
  assert.match(addressPanelSource, /country:\s*'PL'/);
});

test('order list and detail operations require an explicit tenant channel', () => {
  const listBlock = exportedConstantBlock('CUSTOMER_ORDERS_QUERY');
  const detailBlock = exportedConstantBlock('ORDER_DETAIL_QUERY');

  assert.match(listBlock, /query CustomerOrders\(\$channel: String!/);
  assert.match(listBlock, /orders\(channel: \$channel,/);
  assert.match(detailBlock, /query OrderDetail\(\$channel: String!/);
  assert.match(detailBlock, /order\(channel: \$channel, id: \$id\)/);
});

test('GraphQL proxy derives x-channel from server configuration', () => {
  assert.match(proxySource, /'x-channel':\s*resolveChannel\(process\.env\.NEXT_PUBLIC_SALON_SLUG\)/);
  assert.doesNotMatch(proxySource, /request\.headers\.get\(['"]x-channel['"]\)/);
});
