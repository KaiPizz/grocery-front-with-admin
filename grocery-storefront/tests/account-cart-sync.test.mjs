import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../', import.meta.url));

// Independent browser modules use real Zustand/persistence and one shared fake server.
function moduleLoader(browser, network) {
  const overrides = {
    'zustand/middleware': { ...require('zustand/middleware'), persist: (creator, options) => require('zustand/middleware').persist(creator, { ...options, storage: require('zustand/middleware').createJSONStorage(() => browser.localStorage) }) },
  };
  const cache = new Map();
  function load(name, parent = root) {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    if (name === 'server-only') return {};
    if (!name.startsWith('@/') && !name.startsWith('.') && !name.startsWith('/')) return require(name);
    let path = name.startsWith('@/') ? resolve(root, 'src', name.slice(2)) : resolve(parent, name);
    if (existsSync(`${path}.ts`)) path += '.ts';
    else if (!existsSync(path)) path += '.ts';
    if (cache.has(path)) return cache.get(path).exports;
    const module = { exports: {} };
    cache.set(path, module);
    const source = ts.transpileModule(readFileSync(path, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
      fileName: path,
    }).outputText;
    new Function('require', 'module', 'exports', 'window', 'document', 'fetch', source)((next) => load(next, dirname(path)), module, module.exports, browser, { cookie: '' }, network);
    return module.exports;
  }
  return (name) => load(name);
}

function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

function backend() {
  const carts = new Map();
  const accounts = new Map();
  const consumed = new Set();
  const calls = [];
  let revision = 0;
  let syncUnavailable = false;
  let delayedRead = null;
  let delayedMutation = null;
  let loseSyncResponse = false;
  let attention = false;
  let mutationStarted = null;
  function cart(id) {
    return { id, lines: [], updatedAt: String(++revision), buyerIdentity: null };
  }
  function snapshot(value) { return structuredClone(value); }
  function add(value, lines) {
    for (const line of lines) {
      const existing = value.lines.find((item) => item.merchandiseId === line.merchandiseId);
      if (existing) existing.quantity += line.quantity;
      else value.lines.push({ id: `${value.id}:${line.merchandiseId}`, merchandiseId: line.merchandiseId, quantity: line.quantity });
    }
    value.updatedAt = String(++revision);
  }
  async function request(device, url, init = {}) {
    if (url === '/api/auth/session') return Response.json(device.customer
      ? { authenticated: true, customer: device.customer }
      : { authenticated: false, customer: null, code: 'NO_SESSION_COOKIE' });
    if (url === '/api/auth/logout') { device.customer = null; return Response.json({ success: true }); }
    if (url.startsWith('/api/auth/')) return Response.json({ success: true, customer: device.customer });
    const { query, variables = {} } = JSON.parse(init.body);
    const name = /(?:mutation|query)\s+(\w+)/.exec(query)?.[1];
    calls.push({ name, variables: snapshot(variables), customer: device.customer?.id ?? null });
    const payload = (field, value, userErrors = []) => Response.json({ data: { [field]: { cart: snapshot(value), userErrors } } });
    if (name === 'AccountCartSync') {
      if (syncUnavailable) return Response.json({ errors: [{ message: 'Unavailable' }] }, { status: 502 });
      const owner = device.customer.id;
      let id = accounts.get(owner);
      if (!id) { id = `account-${owner}-${revision}`; accounts.set(owner, id); carts.set(id, cart(id)); }
      const value = carts.get(id);
      if (variables.guestCartId && !consumed.has(variables.guestCartId)) {
        const guest = carts.get(variables.guestCartId);
        if (guest) { add(value, guest.lines); consumed.add(guest.id); }
      }
      const result = payload('accountCartSync', value, attention && value.lines.length ? [{ code: 'CART_REQUIRES_ATTENTION', message: 'Unavailable item' }] : []);
      if (loseSyncResponse) { loseSyncResponse = false; throw new Error('Connection lost after commit'); }
      if (delayedRead) { const pause = delayedRead; delayedRead = null; await pause; }
      return result;
    }
    if (name === 'CartCreate') {
      const id = `guest-${revision}`;
      const value = cart(id); add(value, variables.input?.lines ?? []); carts.set(id, value);
      return payload('cartCreate', value);
    }
    if (name === 'GetCart') {
      const result = Response.json({ data: { cart: snapshot(carts.get(variables.id)) } });
      if (delayedRead) { const pause = delayedRead; delayedRead = null; await pause; }
      return result;
    }
    const value = carts.get(variables.cartId);
    if (name === 'CartLinesAdd') {
      add(value, variables.lines);
      mutationStarted?.(); mutationStarted = null;
      const result = payload('cartLinesAdd', value);
      if (delayedMutation) { const pause = delayedMutation; delayedMutation = null; await pause; }
      return result;
    }
    if (name === 'CartLinesUpdate') {
      for (const line of variables.lines) value.lines.find((item) => item.id === line.id).quantity = line.quantity;
      value.updatedAt = String(++revision);
      return payload('cartLinesUpdate', value);
    }
    if (name === 'CartLinesRemove') {
      value.lines = value.lines.filter((line) => !variables.lineIds.includes(line.id));
      value.updatedAt = String(++revision);
      return payload('cartLinesRemove', value);
    }
    if (query.includes('CartProductMetadata')) return Response.json({ data: { products: { edges: [], pageInfo: { hasNextPage: false } } } });
    throw new Error(`Unhandled ${name}`);
  }
  return {
    request, calls, carts, accounts,
    failSync(value) { syncUnavailable = value; },
    pauseNextRead(pause) { delayedRead = pause; },
    pauseNextMutation(pause) { delayedMutation = pause; },
    loseNextSyncResponse() { loseSyncResponse = true; },
    attention(value) { attention = value; },
    nextMutation() { return new Promise((resolve) => { mutationStarted = resolve; }); },
  };
}

function device(server, local = storage()) {
  const browser = Object.assign(new EventTarget(), { localStorage: local, sessionStorage: storage(), location: { reload() {} } });
  const state = { customer: null };
  const load = moduleLoader(browser, (url, init) => server.request(state, url, init));
  return {
    state, browser, auth: load('@/stores/auth-store').useAuthStore, cart: load('@/stores/cart-store').useCartStore,
    async guest() { state.customer = null; await this.auth.getState().initialize(); },
    async signIn(id, verified = true) {
      state.customer = { id, email: `${id}@example.test`, fullName: id, emailVerified: verified };
      await this.auth.getState().googleLogin('credential');
    },
  };
}

const APPLE = { productId: 'apple', variantId: 'apple', name: 'Apple', price: 1, currency: 'PLN' };

test('guest cart imports once and a second independent device discovers the same account cart', async () => {
  const server = backend();
  const first = device(server); await first.guest();
  await first.cart.getState().addItem({ ...APPLE, quantity: 2 });
  const guestId = first.cart.getState().cartId;
  await first.signIn('A');
  assert.equal(await first.cart.getState().syncAccountCart(), true);
  await first.cart.getState().syncAccountCart();
  const second = device(server); await second.signIn('A');
  await second.cart.getState().syncAccountCart();
  assert.equal(second.cart.getState().cartId, first.cart.getState().cartId);
  assert.equal(second.cart.getState().items[0].quantity, 2);
  assert.equal(server.calls.filter((call) => call.name === 'AccountCartSync' && call.variables.guestCartId === guestId).length, 1);
});

test('simultaneous first account adds use one canonical discovery and never create an anonymous cart', async () => {
  const server = backend(); const first = device(server); await first.signIn('A');
  await Promise.all([first.cart.getState().addItem(APPLE), first.cart.getState().addItem(APPLE)]);
  assert.equal(first.cart.getState().items[0].quantity, 2);
  assert.equal(server.calls.filter((call) => call.name === 'CartCreate').length, 0);
  assert.equal(server.calls.filter((call) => call.name === 'AccountCartSync').length, 1);
});

test('another device sees quantity updates and removal; logout is local and switching to B never imports A', async () => {
  const server = backend(); const first = device(server); const second = device(server);
  await first.signIn('A'); await first.cart.getState().addItem(APPLE);
  await second.signIn('A'); await second.cart.getState().syncAccountCart();
  await first.cart.getState().updateQuantity('apple', 4);
  await second.cart.getState().syncAccountCart();
  assert.equal(second.cart.getState().items[0].quantity, 4);
  await first.auth.getState().logout();
  assert.equal(second.cart.getState().items[0].quantity, 4);
  await first.signIn('B'); await first.cart.getState().syncAccountCart();
  assert.deepEqual(first.cart.getState().items, []);
  await second.cart.getState().removeItem('apple');
  const third = device(server); await third.signIn('A'); await third.cart.getState().syncAccountCart();
  assert.deepEqual(third.cart.getState().items, []);
});

test('failed initial merge retains the guest cart, blocks account writes, and retry imports without losing quantities', async () => {
  const server = backend(); const first = device(server); await first.guest();
  await first.cart.getState().addItem({ ...APPLE, quantity: 3 });
  const guestId = first.cart.getState().cartId;
  await first.signIn('A'); server.failSync(true);
  assert.equal(await first.cart.getState().addItem(APPLE), false);
  assert.equal(first.cart.getState().cartId, guestId);
  assert.equal(first.cart.getState().items[0].quantity, 3);
  assert.equal(first.cart.getState().syncStatus, 'error');
  server.failSync(false); await first.cart.getState().syncAccountCart();
  assert.equal(first.cart.getState().items[0].quantity, 3);
});

test('unverified customers retain a functional guest cart without attempting account sync', async () => {
  const server = backend(); const first = device(server); await first.signIn('A', false);
  await first.cart.getState().addItem(APPLE);
  assert.equal(first.cart.getState().syncStatus, 'unverified');
  assert.equal(first.cart.getState().items[0].quantity, 1);
  assert.equal(server.calls.some((call) => call.name === 'AccountCartSync'), false);
});

test('a late refresh response cannot overwrite a newer local cart mutation', async () => {
  const server = backend(); const first = device(server); await first.signIn('A');
  await first.cart.getState().addItem(APPLE);
  let release; const pause = new Promise((resolve) => { release = resolve; });
  server.pauseNextRead(pause);
  const hydration = first.cart.getState().syncAccountCart();
  await Promise.resolve();
  await first.cart.getState().addItem(APPLE);
  release(); await hydration;
  assert.equal(first.cart.getState().items[0].quantity, 2);
});

test('failed guest merge can be repaired with removal or quantity reduction before retry', async () => {
  const server = backend(); const first = device(server); await first.guest();
  await first.cart.getState().addItem({ ...APPLE, quantity: 3 });
  await first.signIn('A'); server.failSync(true);
  await first.cart.getState().syncAccountCart();
  assert.equal(await first.cart.getState().updateQuantity('apple', 2), true);
  assert.equal(first.cart.getState().items[0].quantity, 2);
  assert.equal(await first.cart.getState().updateQuantity('apple', 4), false);
  assert.equal(await first.cart.getState().removeItem('apple'), true);
  server.failSync(false);
  await first.cart.getState().syncAccountCart();
  assert.deepEqual(first.cart.getState().items, []);
});

test('an old mutation response cannot resurrect the source cart after atomic checkout completion', async () => {
  const server = backend(); const first = device(server); await first.signIn('A');
  await first.cart.getState().addItem(APPLE);
  const sourceId = first.cart.getState().cartId;
  let release; const pause = new Promise((resolve) => { release = resolve; });
  server.pauseNextMutation(pause);
  const mutationStarted = server.nextMutation();
  const oldMutation = first.cart.getState().addItem(APPLE);
  await mutationStarted;
  server.accounts.delete('A');
  await first.cart.getState().checkoutCompleted(sourceId, false);
  const replacementId = first.cart.getState().cartId;
  assert.notEqual(replacementId, sourceId);
  release();
  await oldMutation;
  assert.equal(first.cart.getState().cartId, replacementId);
  assert.deepEqual(first.cart.getState().items, []);
  assert.equal(first.cart.getState().error, null);
});

test('a committed merge with a lost response survives reload and retry without doubling quantities', async () => {
  const server = backend(); const first = device(server); await first.guest();
  await first.cart.getState().addItem({ ...APPLE, quantity: 2 });
  await first.signIn('A'); server.loseNextSyncResponse();
  assert.equal(await first.cart.getState().syncAccountCart(), false);
  const reloaded = device(server, first.browser.localStorage);
  reloaded.state.customer = { id: 'A', email: 'A@example.test', fullName: 'A', emailVerified: true };
  await reloaded.auth.getState().initialize();
  assert.equal(await reloaded.cart.getState().syncAccountCart(), true);
  assert.equal(reloaded.cart.getState().items[0].quantity, 2);
  assert.equal(server.carts.get(server.accounts.get('A')).lines[0].quantity, 2);
});

test('an authoritative saved cart with unavailable lines remains usable for removal', async () => {
  const server = backend(); const first = device(server); await first.signIn('A');
  await first.cart.getState().addItem(APPLE); server.attention(true);
  assert.equal(await first.cart.getState().syncAccountCart(), true);
  assert.equal(first.cart.getState().syncStatus, 'ready');
  assert.equal(first.cart.getState().syncNotice, 'attention');
  assert.equal(await first.cart.getState().removeItem('apple'), true);
  assert.deepEqual(first.cart.getState().items, []);
});

test('checkout revision conflict retains newer additions, while an atomic closed source is replaced on every device', async () => {
  const server = backend(); const first = device(server); await first.signIn('A');
  await first.cart.getState().addItem(APPLE);
  const sourceId = first.cart.getState().cartId;
  const second = device(server); await second.signIn('A'); await second.cart.getState().addItem(APPLE);
  await first.cart.getState().checkoutCompleted(sourceId, true);
  assert.equal(first.cart.getState().items[0].quantity, 2);
  assert.equal(first.cart.getState().syncNotice, 'changed');
  // Simulate a later successful exact-revision order commit closing the source.
  server.accounts.delete('A');
  await first.cart.getState().checkoutCompleted(sourceId, false);
  await second.cart.getState().syncAccountCart();
  assert.notEqual(second.cart.getState().cartId, sourceId);
  assert.deepEqual(second.cart.getState().items, []);
});

test('initial account discovery and a product click share one sync before the first write', async () => {
  const server = backend(); const first = device(server); await first.signIn('A');
  let release; const pause = new Promise((resolve) => { release = resolve; });
  server.pauseNextRead(pause);
  const initialSync = first.cart.getState().syncAccountCart();
  const addition = first.cart.getState().addItem(APPLE);
  await Promise.resolve(); release();
  await Promise.all([initialSync, addition]);
  assert.equal(first.cart.getState().items[0].quantity, 1);
  assert.equal(server.calls.filter((call) => call.name === 'AccountCartSync').length, 1);
  assert.equal(server.calls.filter((call) => call.name === 'CartCreate').length, 0);
});

test('replayed order metadata cannot erase a current cart when authoritative resync fails', async () => {
  const server = backend(); const first = device(server); await first.signIn('A');
  await first.cart.getState().addItem({ ...APPLE, quantity: 2 });
  const currentId = first.cart.getState().cartId;
  server.failSync(true);
  await first.cart.getState().checkoutCompleted(currentId, false);
  assert.equal(first.cart.getState().cartId, currentId);
  assert.equal(first.cart.getState().items[0].quantity, 2);
  assert.equal(first.cart.getState().cartOwnerId, 'A');
  assert.equal(first.cart.getState().syncStatus, 'error');
  server.failSync(false); await first.cart.getState().syncAccountCart();
  assert.equal(first.cart.getState().items[0].quantity, 2);
});

test('a pre-login guest hydrate arriving after merge cannot replace the canonical account cart', async () => {
  const server = backend(); const first = device(server); await first.guest();
  await first.cart.getState().addItem(APPLE);
  let release; const pause = new Promise((resolve) => { release = resolve; });
  server.pauseNextRead(pause);
  const oldHydration = first.cart.getState().hydrateCart();
  await first.signIn('A'); await first.cart.getState().syncAccountCart();
  const canonical = first.cart.getState().cartId;
  release(); await oldHydration;
  assert.equal(first.cart.getState().cartId, canonical);
  assert.equal(first.cart.getState().cartOwnerId, 'A');
});

test('guest writes already in flight finish before initial account merge', async () => {
  const server = backend(); const first = device(server); await first.guest();
  await first.cart.getState().addItem(APPLE);
  let release; const pause = new Promise((resolve) => { release = resolve; });
  server.pauseNextMutation(pause);
  const mutationStarted = server.nextMutation();
  const write = first.cart.getState().addItem(APPLE);
  await mutationStarted;
  await first.signIn('A');
  const merge = first.cart.getState().syncAccountCart();
  await Promise.resolve();
  assert.equal(server.accounts.has('A'), false);
  release(); await Promise.all([write, merge]);
  assert.equal(first.cart.getState().cartId, server.accounts.get('A'));
  assert.equal(first.cart.getState().items[0].quantity, 2);
});

test('B can sync and write while an old A network mutation remains deferred', { timeout: 5000 }, async () => {
  const server = backend(); const first = device(server); await first.signIn('A');
  await first.cart.getState().addItem(APPLE);
  let release; const pause = new Promise((resolve) => { release = resolve; });
  server.pauseNextMutation(pause);
  const started = server.nextMutation();
  const oldWrite = first.cart.getState().addItem(APPLE);
  await started;
  await first.signIn('B');
  await first.cart.getState().addItem(APPLE);
  await first.cart.getState().syncAccountCart();
  assert.equal(first.cart.getState().cartOwnerId, 'B');
  assert.equal(first.cart.getState().items[0].quantity, 1);
  release(); await oldWrite;
  assert.equal(first.cart.getState().cartOwnerId, 'B');
  assert.equal(first.cart.getState().items[0].quantity, 1);
});

