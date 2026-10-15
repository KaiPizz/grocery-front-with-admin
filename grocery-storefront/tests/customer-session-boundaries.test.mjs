import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../', import.meta.url));

// Execute the real TypeScript modules. Only network/server-only boundaries are replaced.
function moduleLoader(overrides = {}) {
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
    new Function('require', 'module', 'exports', source)((next) => load(next, dirname(path)), module, module.exports);
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

function browser() {
  globalThis.window = Object.assign(new EventTarget(), { localStorage: storage(), sessionStorage: storage(), location: { reload() {} } });
  globalThis.localStorage = window.localStorage;
  globalThis.document = { cookie: '' };
}

function customer(id) {
  return { id, email: `${id}@example.test`, fullName: `Shopper ${id}`, phone: null };
}

function seedPrivateState() {
  for (const key of ['adg-checkout-contact', 'adg-p24-cart-snapshot']) window.localStorage.setItem(key, 'private');
  for (const key of ['oms-checkout-draft-v2', 'oms-pending-checkout', 'adg-p24-pending', 'adg-last-order']) window.sessionStorage.setItem(key, 'private');
}

function assertPrivateStateCleared() {
  for (const key of ['adg-checkout-contact', 'adg-p24-cart-snapshot']) assert.equal(window.localStorage.getItem(key), null, key);
  for (const key of ['oms-checkout-draft-v2', 'oms-pending-checkout', 'adg-p24-pending', 'adg-last-order']) assert.equal(window.sessionStorage.getItem(key), null, key);
}

for (const action of ['login', 'googleLogin', 'facebookLogin', 'register']) {
  test(`${action}: retain the first guest cart, then discard customer A data when switching to B`, async () => {
    browser();
    const load = moduleLoader();
    const { useAuthStore } = load('@/stores/auth-store');
    const { useCartStore } = load('@/stores/cart-store');
    const { useWishlistStore } = load('@/stores/wishlist-store');
    let active = customer('A');
    globalThis.fetch = async () => Response.json({ success: true, customer: active });
    useCartStore.setState({ cartId: 'guest-cart' });
    await useAuthStore.getState()[action]({ email: 'guest@example.test', password: 'test' });
    assert.equal(useCartStore.getState().cartId, 'guest-cart');
    seedPrivateState();
    useWishlistStore.setState({ items: [{ productId: 'A-private' }], guestItems: [{ productId: 'A-private' }] });
    active = customer('B');
    await useAuthStore.getState()[action]({ email: 'b@example.test', password: 'test' });
    assert.equal(useAuthStore.getState().session.user.id, 'B');
    assert.equal(useCartStore.getState().cartId, null);
    assert.deepEqual(useWishlistStore.getState().items, []);
    assertPrivateStateCleared();
  });
}

test('logout invalidates mounted checkout revision and late wishlist/cart responses cannot resurrect private data', async () => {
  browser();
  const load = moduleLoader();
  const { useAuthStore } = load('@/stores/auth-store');
  const { useWishlistStore } = load('@/stores/wishlist-store');
  const { useCartStore } = load('@/stores/cart-store');
  globalThis.fetch = async () => Response.json({ success: true, customer: customer('A') });
  await useAuthStore.getState().googleLogin('credential');
  const revision = useAuthStore.getState().customerStateRevision;
  seedPrivateState();
  useCartStore.setState({ cartId: 'private-cart' });
  useWishlistStore.setState({ items: [{ productId: 'private-product' }], guestItems: [{ productId: 'private-product' }] });
  const pending = [];
  globalThis.fetch = async (url) => url === '/api/auth/logout'
    ? Response.json({ success: true })
    : new Promise((resolve) => pending.push(resolve));
  const wishlist = useWishlistStore.getState().loadWishlist();
  const cart = useCartStore.getState().hydrateCart();
  await useAuthStore.getState().logout();
  globalThis.fetch = async () => Response.json({ data: {} });
  for (const resolve of pending) resolve(Response.json({ data: { wishlist: { items: [{ productId: 'private-product' }] }, cart: { id: 'private-cart', lines: [], buyerIdentity: { email: 'A@example.test' } } } }));
  await Promise.all([wishlist, cart]);
  assertPrivateStateCleared();
  assert.ok(useAuthStore.getState().customerStateRevision > revision);
  assert.deepEqual(useWishlistStore.getState().items, []);
  assert.equal(useCartStore.getState().cartId, null);
  assert.equal(useCartStore.getState().buyerIdentity, null);
  assert.equal(useCartStore.getState().error, null);
});

test('post-login wishlist import uses current-owner state, preserving guests without importing A into B', async () => {
  for (const previousCustomer of [null, customer('A')]) {
    browser();
    const load = moduleLoader();
    const { useAuthStore } = load('@/stores/auth-store');
    const { useWishlistStore } = load('@/stores/wishlist-store');
    globalThis.fetch = async () => Response.json({ success: true, customer: previousCustomer });
    if (previousCustomer) await useAuthStore.getState().googleLogin('A');
    const items = [{ productId: previousCustomer ? 'A-private' : 'guest-item' }];
    useWishlistStore.setState({ items, guestItems: items });
    const staleSnapshot = [...items];
    globalThis.fetch = async () => Response.json({ success: true, customer: customer('B') });
    await useAuthStore.getState().googleLogin('B');
    let submittedProductIds;
    globalThis.fetch = async (_url, init) => {
      submittedProductIds = JSON.parse(init.body).variables.productIds;
      return Response.json({ data: { wishlistSync: { success: true, items: [] } } });
    };
    // Old JS callers must not be able to override the current boundary with a
    // snapshot captured before sign-in; TypeScript callers now take no argument.
    await useWishlistStore.getState().syncGuestWishlist(staleSnapshot);
    assert.deepEqual(submittedProductIds, previousCustomer ? [] : ['guest-item']);
    assert.equal(useWishlistStore.getState().items.some((item) => item.productId === 'A-private'), false);
  }
});

test('initialize removes persisted A data when shared cookies now identify B or guest', async () => {
  for (const nextCustomer of [customer('B'), null]) {
    browser();
    const load = moduleLoader();
    const { useAuthStore } = load('@/stores/auth-store');
    globalThis.fetch = async () => Response.json({ success: true, customer: customer('A') });
    await useAuthStore.getState().googleLogin('credential');
    seedPrivateState();
    globalThis.fetch = async () => Response.json({ authenticated: Boolean(nextCustomer), customer: nextCustomer, code: nextCustomer ? undefined : 'NO_SESSION_COOKIE' });
    await useAuthStore.getState().initialize();
    assertPrivateStateCleared();
    assert.equal(useAuthStore.getState().session.user?.id ?? null, nextCustomer?.id ?? null);
  }
});

test('logout publishes the guest boundary only after cookie-clearing response, and never after a network failure', async () => {
  for (const fails of [false, true]) {
    browser();
    const load = moduleLoader();
    const { CUSTOMER_STATE_OWNER_KEY, useAuthStore } = load('@/stores/auth-store');
    globalThis.fetch = async () => Response.json({ success: true, customer: customer('A') });
    await useAuthStore.getState().googleLogin('credential');
    let complete;
    globalThis.fetch = () => new Promise((resolve, reject) => { complete = () => fails ? reject(new Error('offline')) : resolve(Response.json({ success: false })); });
    const logout = useAuthStore.getState().logout();
    assert.equal(window.localStorage.getItem(CUSTOMER_STATE_OWNER_KEY), 'A');
    assert.equal(useAuthStore.getState().session.user, null);
    complete();
    if (fails) await assert.rejects(logout);
    else await logout;
    assert.equal(window.localStorage.getItem(CUSTOMER_STATE_OWNER_KEY), fails ? 'A' : null);
  }
});

test('a stale tab reloads current B state without erasing shared B cart or processing an obsolete event', () => {
  browser();
  const load = moduleLoader();
  const { CUSTOMER_STATE_OWNER_KEY, useAuthStore } = load('@/stores/auth-store');
  window.localStorage.setItem(CUSTOMER_STATE_OWNER_KEY, 'B');
  window.localStorage.setItem('grocery-cart', 'B-cart');
  window.localStorage.setItem('grocery-wishlist', 'B-wishlist');
  window.localStorage.setItem('adg-checkout-contact', 'B-contact');
  window.sessionStorage.setItem('oms-checkout-draft-v2', 'A-draft');
  let reloads = 0;
  window.location.reload = () => { reloads++; };
  useAuthStore.getState().synchronizeSession('obsolete-owner');
  assert.equal(reloads, 0);
  useAuthStore.getState().synchronizeSession('B');
  assert.equal(reloads, 1);
  assert.equal(window.localStorage.getItem('grocery-cart'), 'B-cart');
  assert.equal(window.localStorage.getItem('grocery-wishlist'), 'B-wishlist');
  assert.equal(window.localStorage.getItem('adg-checkout-contact'), 'B-contact');
  assert.equal(window.sessionStorage.getItem('oms-checkout-draft-v2'), null);
  assert.equal(useAuthStore.getState().initialized, false);
});

test('a restored tab purges its A draft when the shared owner is already B, preserving B shared state', async () => {
  browser();
  const ownerKey = 'grocery-customer-state-owner';
  window.localStorage.setItem(ownerKey, 'B');
  window.sessionStorage.setItem(ownerKey, 'A');
  window.localStorage.setItem('grocery-cart', JSON.stringify({ state: { cartId: 'B-cart' }, version: 1 }));
  window.localStorage.setItem('adg-checkout-contact', 'B-contact');
  window.sessionStorage.setItem('oms-checkout-draft-v2', 'A-draft');
  const load = moduleLoader();
  const { useAuthStore } = load('@/stores/auth-store');
  const { useCartStore } = load('@/stores/cart-store');
  globalThis.fetch = async () => Response.json({ authenticated: true, customer: customer('B') });
  await useAuthStore.getState().initialize();
  assert.equal(window.sessionStorage.getItem('oms-checkout-draft-v2'), null);
  assert.equal(window.localStorage.getItem('adg-checkout-contact'), 'B-contact');
  assert.equal(useCartStore.getState().cartId, 'B-cart');
});

test('explicit wishlist removal uses server delete; clear stops at a failure or a customer boundary', async () => {
  browser();
  const load = moduleLoader();
  const { useAuthStore } = load('@/stores/auth-store');
  const { useWishlistStore } = load('@/stores/wishlist-store');
  globalThis.fetch = async () => Response.json({ success: true, customer: customer('A') });
  await useAuthStore.getState().googleLogin('credential');
  const items = [{ productId: 'one' }, { productId: 'two' }];
  useWishlistStore.setState({ items, guestItems: items });
  const operations = [];
  globalThis.fetch = async (_url, init) => {
    const operation = JSON.parse(init.body);
    operations.push(operation);
    return Response.json({ data: { wishlistRemoveProduct: { success: true } } });
  };
  assert.equal(await useWishlistStore.getState().removeItem('one'), true);
  assert.match(operations[0].query, /wishlistRemoveProduct/);
  assert.deepEqual(operations[0].variables, { productId: 'one' });
  assert.deepEqual(useWishlistStore.getState().items, [{ productId: 'two' }]);
  globalThis.fetch = async () => Response.json({ errors: [{ message: 'Temporarily unavailable' }] });
  await useWishlistStore.getState().clear();
  assert.deepEqual(useWishlistStore.getState().items, [{ productId: 'two' }]);
  useWishlistStore.setState({ items, guestItems: items });
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    useAuthStore.getState().clearSession();
    return Response.json({ data: { wishlistRemoveProduct: { success: true } } });
  };
  await useWishlistStore.getState().clear();
  assert.equal(calls, 1);
  assert.deepEqual(useWishlistStore.getState().items, []);
});

test('sign-in cannot race an in-flight logout cookie response', async () => {
  browser();
  const load = moduleLoader();
  const { useAuthStore } = load('@/stores/auth-store');
  let finish;
  let calls = 0;
  globalThis.fetch = () => { calls++; return new Promise((resolve) => { finish = () => resolve(Response.json({ success: true })); }); };
  const logout = useAuthStore.getState().logout();
  assert.equal(useAuthStore.getState().isSubmitting, true);
  assert.deepEqual(await useAuthStore.getState().googleLogin('B'), { success: false, message: null, errors: [] });
  assert.equal(calls, 1);
  finish();
  await logout;
});

test('an unowned legacy draft is discarded on guest bootstrap without deleting the guest cart', async () => {
  browser();
  window.sessionStorage.setItem('oms-checkout-draft-v2', 'historical-private-draft');
  window.localStorage.setItem('grocery-cart', JSON.stringify({ state: { cartId: 'guest-cart' }, version: 1 }));
  const load = moduleLoader();
  const { useAuthStore } = load('@/stores/auth-store');
  const { useCartStore } = load('@/stores/cart-store');
  globalThis.fetch = async () => Response.json({ authenticated: false, customer: null, code: 'NO_SESSION_COOKIE' });
  await useAuthStore.getState().initialize();
  assert.equal(window.sessionStorage.getItem('oms-checkout-draft-v2'), null);
  assert.equal(useCartStore.getState().cartId, 'guest-cart');
});

test('denied browser storage does not interrupt logout memory and tab-private cleanup', async () => {
  browser();
  const load = moduleLoader();
  const { useAuthStore } = load('@/stores/auth-store');
  const { useCartStore } = load('@/stores/cart-store');
  const { useWishlistStore } = load('@/stores/wishlist-store');
  const { readLegacyAuthTokens } = load('@/lib/auth');
  globalThis.fetch = async () => Response.json({ success: true, customer: customer('A') });
  await useAuthStore.getState().googleLogin('credential');
  useCartStore.setState({ cartId: 'private-cart', buyerIdentity: { email: 'private@example.test' } });
  useWishlistStore.setState({ items: [{ productId: 'private' }], guestItems: [{ productId: 'private' }] });
  window.sessionStorage.setItem('oms-checkout-draft-v2', 'private-draft');
  for (const method of ['getItem', 'setItem', 'removeItem']) {
    window.localStorage[method] = () => { throw new DOMException('Denied', 'SecurityError'); };
  }
  Object.defineProperty(document, 'cookie', { set() { throw new DOMException('Denied', 'SecurityError'); } });
  await useAuthStore.getState().logout();
  assert.deepEqual(readLegacyAuthTokens(), { accessToken: null, refreshToken: null });
  assert.equal(useAuthStore.getState().session.status, 'guest');
  assert.equal(useCartStore.getState().cartId, null);
  assert.equal(useCartStore.getState().buyerIdentity, null);
  assert.deepEqual(useWishlistStore.getState().items, []);
  assert.equal(window.sessionStorage.getItem('oms-checkout-draft-v2'), null);
});

test('a stale sign-in response cannot restore the account and uses the localized caller fallback', async () => {
  browser();
  const load = moduleLoader();
  const { useAuthStore } = load('@/stores/auth-store');
  let finish;
  globalThis.fetch = () => new Promise((resolve) => { finish = () => resolve(Response.json({ success: true, customer: customer('A') })); });
  const login = useAuthStore.getState().googleLogin('credential');
  useAuthStore.getState().clearSession();
  finish();
  assert.deepEqual(await login, { success: false, message: null, errors: [] });
  assert.equal(useAuthStore.getState().session.status, 'guest');
});

test('discarding an unowned draft does not cancel valid in-flight guest cart hydration', async () => {
  browser();
  const load = moduleLoader();
  const { useAuthStore } = load('@/stores/auth-store');
  const { useCartStore } = load('@/stores/cart-store');
  useCartStore.setState({ cartId: 'guest-cart' });
  window.sessionStorage.setItem('oms-checkout-draft-v2', 'unowned-draft');
  let finishCart;
  globalThis.fetch = async (url, init) => {
    if (url === '/api/auth/session') return Response.json({ authenticated: false, customer: null, code: 'NO_SESSION_COOKIE' });
    if (JSON.parse(init.body).query.includes('query GetCart')) return new Promise((resolve) => {
      finishCart = () => resolve(Response.json({ data: { cart: { id: 'guest-cart', lines: [{ id: 'line', merchandiseId: 'variant', quantity: 1 }] } } }));
    });
    return Response.json({ data: {} });
  };
  const hydration = useCartStore.getState().hydrateCart();
  await useAuthStore.getState().initialize();
  finishCart();
  await hydration;
  assert.equal(window.sessionStorage.getItem('oms-checkout-draft-v2'), null);
  assert.equal(useCartStore.getState().cartId, 'guest-cart');
  assert.equal(useCartStore.getState().items.length, 1);
  assert.equal(useCartStore.getState().error, null);
});

test('a real A-to-B account switch still rejects A cart hydration already in flight', async () => {
  browser();
  const load = moduleLoader();
  const { useAuthStore } = load('@/stores/auth-store');
  const { useCartStore } = load('@/stores/cart-store');
  globalThis.fetch = async () => Response.json({ success: true, customer: customer('A') });
  await useAuthStore.getState().googleLogin('A');
  useCartStore.setState({ cartId: 'A-cart' });
  let finishCart;
  globalThis.fetch = async (url) => url === '/api/auth/google'
    ? Response.json({ success: true, customer: customer('B') })
    : new Promise((resolve) => { finishCart = () => resolve(Response.json({ data: { cart: { id: 'A-cart', lines: [], buyerIdentity: { email: 'A@example.test' } } } })); });
  const hydration = useCartStore.getState().hydrateCart();
  await useAuthStore.getState().googleLogin('B');
  finishCart();
  await hydration;
  assert.equal(useAuthStore.getState().session.user.id, 'B');
  assert.equal(useCartStore.getState().cartId, null);
  assert.equal(useCartStore.getState().buyerIdentity, null);
  assert.equal(useCartStore.getState().error, null);
});

test('failed sign-in leaves pending bootstrap usable and subsequent initialization can fetch again', async () => {
  for (const action of ['login', 'googleLogin', 'facebookLogin', 'register']) {
    browser();
    const load = moduleLoader();
    const { useAuthStore } = load('@/stores/auth-store');
    let finishBootstrap;
    globalThis.fetch = async (url) => url === '/api/auth/session'
      ? new Promise((resolve) => { finishBootstrap = () => resolve(Response.json({ authenticated: true, customer: customer('A') })); })
      : Response.json({ success: false, message: 'Rejected' }, { status: 401 });
    const bootstrap = useAuthStore.getState().initialize();
    assert.equal((await useAuthStore.getState()[action]({ email: 'B@example.test', password: 'test' })).success, false);
    finishBootstrap();
    await bootstrap;
    assert.equal(useAuthStore.getState().initialized, true, action);
    assert.equal(useAuthStore.getState().session.user.id, 'A', action);
    let calls = 0;
    globalThis.fetch = async () => { calls++; return Response.json({ authenticated: true, customer: customer('A') }); };
    await useAuthStore.getState().initialize();
    assert.equal(calls, 1, `${action} retry`);
  }
});

test('successful sign-in wins over pending bootstrap and does not leave a cached initialization', async () => {
  browser();
  const load = moduleLoader();
  const { useAuthStore } = load('@/stores/auth-store');
  let finishBootstrap;
  globalThis.fetch = async (url) => url === '/api/auth/session'
    ? new Promise((resolve) => { finishBootstrap = () => resolve(Response.json({ authenticated: true, customer: customer('A') })); })
    : Response.json({ success: true, customer: customer('B') });
  const bootstrap = useAuthStore.getState().initialize();
  await useAuthStore.getState().googleLogin('B');
  finishBootstrap();
  await bootstrap;
  assert.equal(useAuthStore.getState().session.user.id, 'B');
  let calls = 0;
  globalThis.fetch = async () => { calls++; return Response.json({ authenticated: true, customer: customer('B') }); };
  await useAuthStore.getState().initialize();
  assert.equal(calls, 1);
});

test('logout still invalidates an earlier bootstrap response', async () => {
  browser();
  const load = moduleLoader();
  const { useAuthStore } = load('@/stores/auth-store');
  let finishBootstrap;
  globalThis.fetch = async (url) => url === '/api/auth/session'
    ? new Promise((resolve) => { finishBootstrap = () => resolve(Response.json({ authenticated: true, customer: customer('A') })); })
    : Response.json({ success: true });
  const bootstrap = useAuthStore.getState().initialize();
  await useAuthStore.getState().logout();
  finishBootstrap();
  await bootstrap;
  assert.equal(useAuthStore.getState().initialized, true);
  assert.equal(useAuthStore.getState().session.status, 'guest');
});

function token(exp) {
  return `header.${Buffer.from(JSON.stringify({ exp })).toString('base64url')}.signature`;
}

function proxyFixture({ access = null, refresh = 'refresh-A', renewal = { payload: { success: true, accessToken: 'renewed-access', refreshToken: 'renewed-refresh', expiresIn: 900 } }, downstreamFails = false } = {}) {
  const calls = [];
  const load = moduleLoader({
    '@/lib/auth/server-refresh': {
      renewCustomerSessionSingleFlight: async (value) => { calls.push(['refresh', value]); return renewal; },
    },
  });
  const { NextRequest } = require('next/server');
  const { POST } = load('@/app/api/graphql/route');
  globalThis.fetch = async (_url, init) => {
    calls.push(['mutation', init.headers.Authorization ?? null]);
    if (downstreamFails) throw new Error('network');
    return Response.json({ data: { checkoutComplete: { order: { id: 'one-order' } } } });
  };
  const cookies = [access && `grocery_customer_access=${access}`, refresh && `grocery_customer_refresh=${refresh}`].filter(Boolean).join('; ');
  const request = new NextRequest('https://shop.example.test/api/graphql', {
    method: 'POST', headers: { 'content-type': 'application/json', cookie: cookies },
    body: JSON.stringify({ query: 'mutation { checkoutComplete(checkoutId: "cart") { order { id } } }' }),
  });
  return { run: () => POST(request), calls };
}

for (const access of [null, token(1)]) {
  test(`optional-auth checkout renews ${access ? 'expired' : 'missing'} access before its only mutation`, async () => {
    const fixture = proxyFixture({ access });
    const response = await fixture.run();
    assert.equal(response.status, 200);
    assert.deepEqual(fixture.calls, [['refresh', 'refresh-A'], ['mutation', 'Bearer renewed-access']]);
    assert.match(response.headers.get('set-cookie'), /grocery_customer_refresh=renewed-refresh/);
    assert.doesNotMatch(await response.text(), /renewed-access|renewed-refresh/);
  });
}

for (const [code, status, clears] of [['INVALID_REFRESH_TOKEN', 401, true], ['REFRESH_TOKEN_REUSE', 401, true], ['REFRESH_ALREADY_ROTATED', 409, false], ['UPSTREAM_UNAVAILABLE', 502, false]]) {
  test(`optional-auth checkout does not run as guest after ${code}`, async () => {
    const fixture = proxyFixture({ renewal: { payload: { success: false, errorCode: code } } });
    const response = await fixture.run();
    assert.equal(response.status, status);
    assert.deepEqual(fixture.calls, [['refresh', 'refresh-A']]);
    assert.equal(Boolean(response.headers.get('set-cookie')), clears);
  });
}

test('normal guests submit once; a valid access cookie is forwarded once without refresh', async () => {
  for (const access of [null, token(Math.floor(Date.now() / 1000) + 900)]) {
    const fixture = proxyFixture({ access, refresh: access ? 'refresh-A' : null });
    const response = await fixture.run();
    assert.equal(response.status, 200);
    assert.deepEqual(fixture.calls, [['mutation', access ? `Bearer ${access}` : null]]);
  }
});

test('rotation cookies survive a downstream transport failure without replaying checkout', async () => {
  const fixture = proxyFixture({ downstreamFails: true });
  const response = await fixture.run();
  assert.equal(response.status, 502);
  assert.match(response.headers.get('set-cookie'), /grocery_customer_refresh=renewed-refresh/);
  assert.deepEqual(fixture.calls, [['refresh', 'refresh-A'], ['mutation', 'Bearer renewed-access']]);
});
