import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  createGoogleOAuthNonce,
  GOOGLE_OAUTH_NONCE_MAX_AGE_SECONDS,
  hasCustomerAuthBffSecret,
  normalizeCustomerAuthBffSecret,
  normalizeCustomerAuthGraphqlUrl,
  normalizeGoogleClientId,
} from '../src/lib/auth/google-oauth.ts';
import {
  isTrackingAllowedRoute,
  shouldReloadForTrackingPrivacy,
} from '../src/lib/tracking-policy.ts';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const envExampleSource = read('../.env.example');
const startRouteSource = read('../src/app/api/auth/google/start/route.ts');
const exchangeRouteSource = read('../src/app/api/auth/google/route.ts');
const serverServiceSource = read('../src/lib/auth/server-service.ts');
const upstreamSource = read('../src/lib/auth/upstream.ts');
const authStoreSource = read('../src/stores/auth-store.ts');
const componentSource = read('../src/components/auth/GoogleSignIn.tsx');
const socialComponentSource = read('../src/components/auth/SocialSignIn.tsx');
const authFormSource = read('../src/components/auth/AuthForm.tsx');
const trackingSource = read('../src/components/TrackingScripts.tsx');
const sensitiveBoundarySource = read('../src/components/SensitiveRouteBoundary.tsx');
const rootLayoutSource = read('../src/app/layout.tsx');
const proxyPolicySource = read('../src/lib/auth/proxy-policy.ts');
const plMessages = JSON.parse(read('../src/messages/pl.json'));
const enMessages = JSON.parse(read('../src/messages/en.json'));

test('Google OAuth nonce is strong, URL-safe and short-lived', () => {
  const nonces = new Set(Array.from({ length: 32 }, () => createGoogleOAuthNonce()));
  assert.equal(nonces.size, 32);
  for (const nonce of nonces) {
    assert.match(nonce, /^[A-Za-z0-9_-]{43}$/);
  }
  assert.equal(GOOGLE_OAUTH_NONCE_MAX_AGE_SECONDS, 300);
});

test('Google client ID is feature-gated by a server-only runtime variable', () => {
  assert.equal(normalizeGoogleClientId(undefined), null);
  assert.equal(normalizeGoogleClientId('not-a-client-id'), null);
  assert.equal(
    normalizeGoogleClientId(' 123-example.apps.googleusercontent.com '),
    '123-example.apps.googleusercontent.com',
  );
  assert.match(envExampleSource, /CUSTOMER_GOOGLE_CLIENT_ID=/);
  assert.doesNotMatch(envExampleSource, /NEXT_PUBLIC_GOOGLE_CLIENT_ID/);
  assert.match(startRouteSource, /process\.env\.CUSTOMER_GOOGLE_CLIENT_ID/);
  assert.doesNotMatch(startRouteSource, /NEXT_PUBLIC_GOOGLE_CLIENT_ID/);
  assert.equal(hasCustomerAuthBffSecret(undefined), false);
  assert.equal(hasCustomerAuthBffSecret('too-short'), false);
  assert.equal(hasCustomerAuthBffSecret('x'.repeat(32)), true);
  assert.equal(normalizeCustomerAuthBffSecret(' xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx '), 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
  assert.equal(normalizeCustomerAuthBffSecret('ą'.repeat(32)), null);
  assert.equal(normalizeCustomerAuthGraphqlUrl('http://127.0.0.1:4000/graphql'), 'http://127.0.0.1:4000/graphql');
  assert.equal(normalizeCustomerAuthGraphqlUrl('https://localhost/graphql'), 'https://localhost/graphql');
  assert.equal(normalizeCustomerAuthGraphqlUrl('https://public.example/graphql'), null);
  assert.equal(normalizeCustomerAuthGraphqlUrl('http://127.0.0.1:4000/graphql?secret=value'), null);
  assert.equal(normalizeCustomerAuthGraphqlUrl('http://127.0.0.1:4000/graphql#secret'), null);
  assert.match(envExampleSource, /CUSTOMER_AUTH_BFF_SECRET=/);
  assert.match(envExampleSource, /CUSTOMER_AUTH_GRAPHQL_URL=/);
  assert.doesNotMatch(envExampleSource, /NEXT_PUBLIC_CUSTOMER_AUTH_BFF_SECRET/);
  assert.doesNotMatch(envExampleSource, /NEXT_PUBLIC_CUSTOMER_AUTH_GRAPHQL_URL/);
  assert.match(startRouteSource, /hasCustomerAuthBffSecret\(process\.env\.CUSTOMER_AUTH_BFF_SECRET\)/);
  assert.match(startRouteSource, /normalizeCustomerAuthGraphqlUrl\(process\.env\.CUSTOMER_AUTH_GRAPHQL_URL\)/);
  assert.match(exchangeRouteSource, /hasCustomerAuthBffSecret\(process\.env\.CUSTOMER_AUTH_BFF_SECRET\)/);
  assert.match(exchangeRouteSource, /normalizeCustomerAuthGraphqlUrl\(process\.env\.CUSTOMER_AUTH_GRAPHQL_URL\)/);
});

test('Google start route issues an HttpOnly same-site nonce and never caches config', () => {
  assert.match(startRouteSource, /validateSameOriginRequest\(request\)/);
  assert.match(startRouteSource, /createGoogleOAuthNonce\(\)/);
  assert.match(startRouteSource, /httpOnly:\s*true/);
  assert.match(startRouteSource, /sameSite:\s*'lax'/);
  assert.match(startRouteSource, /path:\s*'\/api\/auth\/google'/);
  assert.match(startRouteSource, /GOOGLE_OAUTH_NONCE_MAX_AGE_SECONDS/);
  assert.match(startRouteSource, /setNoStoreHeaders/);
  assert.match(startRouteSource, /\{ enabled: true, clientId, nonce \}/);
});

test('Google exchange stays in the dedicated same-origin BFF and consumes its nonce', () => {
  assert.match(exchangeRouteSource, /validateJsonMutationRequest\(request\)/);
  assert.match(exchangeRouteSource, /request\.cookies\.get\(GOOGLE_OAUTH_NONCE_COOKIE_NAME\)/);
  assert.match(exchangeRouteSource, /MAX_GOOGLE_CREDENTIAL_LENGTH\s*=\s*4096/);
  assert.match(exchangeRouteSource, /googleLoginCustomer\(\{ token: credential, nonce \}\)/);
  assert.match(exchangeRouteSource, /consumeGoogleNonce\(response\)/);
  assert.match(exchangeRouteSource, /setCustomerCookies\(response, payload\.accessToken/);
  assert.doesNotMatch(exchangeRouteSource, /console\.(?:log|warn|error)/);
  assert.doesNotMatch(exchangeRouteSource, /accessToken:\s*payload\.accessToken/);
  assert.doesNotMatch(exchangeRouteSource, /refreshToken:\s*payload\.refreshToken/);
  assert.match(proxyPolicySource, /customerGoogleAuth/);
});

test('server service forwards the provider credential and nonce without exposing auth GraphQL to the browser', () => {
  assert.match(serverServiceSource, /mutation CustomerGoogleLogin\(\$input: OAuthLoginInput!\)/);
  assert.match(serverServiceSource, /customerGoogleAuth\(input: \$input\)/);
  assert.match(serverServiceSource, /googleLoginCustomer\(input: \{ token: string; nonce: string \}\)/);
  assert.match(authStoreSource, /googleLogin: async \(credential\)/);
  assert.match(authStoreSource, /fetch\(path/);
  assert.doesNotMatch(authStoreSource, /localStorage\.setItem|sessionStorage\.setItem/);
  assert.match(serverServiceSource, /privateCustomerAuthGraphqlRequest<GoogleLoginResult>/);
  assert.match(serverServiceSource, /'x-customer-auth-bff-secret': bffSecret/);
  assert.match(serverServiceSource, /normalizeCustomerAuthGraphqlUrl\(process\.env\.CUSTOMER_AUTH_GRAPHQL_URL\)/);
  assert.match(serverServiceSource, /redirect: 'error'/);
  assert.match(serverServiceSource, /signal: AbortSignal\.timeout\(10_000\)/);
  assert.doesNotMatch(upstreamSource, /x-customer-auth-bff-secret|CUSTOMER_AUTH_BFF_SECRET/);
  assert.doesNotMatch(componentSource, /CUSTOMER_AUTH_BFF_SECRET|x-customer-auth-bff-secret/);
  assert.doesNotMatch(startRouteSource, /customerAuthBffSecret[,}]/);
});

test('official responsive Google button appears on both auth modes with localized email fallback', () => {
  assert.match(authFormSource, /<SocialSignIn mode=\{mode\} returnTo=\{returnTo\} \/>/);
  assert.match(socialComponentSource, /<GoogleSignIn/);
  assert.match(socialComponentSource, /role="separator"/);
  assert.match(socialComponentSource, /t\('emailDivider'\)/);
  assert.match(componentSource, /accounts\.google\.com\/gsi\/client\?hl=\$\{locale\}/);
  assert.match(componentSource, /googleIdentity\.renderButton/);
  assert.match(componentSource, /mode === 'login' \? 'signin_with' : 'signup_with'/);
  assert.match(componentSource, /ResizeObserver/);
  assert.match(componentSource, /if \(providerEnabled !== true \|\| !config\) return null/);
  assert.doesNotMatch(componentSource, /role="separator"|t\('emailDivider'\)/);
  assert.doesNotMatch(componentSource, /localStorage|sessionStorage|console\.(?:log|warn|error)/);
  for (const messages of [plMessages, enMessages]) {
    assert.equal(typeof messages.auth.googleLoginLabel, 'string');
    assert.equal(typeof messages.auth.googleRegisterLabel, 'string');
    assert.equal(typeof messages.auth.googleFailed, 'string');
    assert.equal(typeof messages.auth.emailDivider, 'string');
  }
});

test('marketing trackers are allowlisted to public catalog routes and excluded from every auth/account route', () => {
  for (const route of [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
    '/account',
    '/checkout',
    '/cart',
    '/wishlist',
  ]) {
    assert.equal(isTrackingAllowedRoute(route), false, route);
  }
  for (const route of ['/', '/products', '/pl/products', '/en/products', '/products/test', '/categories', '/collections/sale', '/recipes']) {
    assert.equal(isTrackingAllowedRoute(route), true, route);
  }
  assert.equal(shouldReloadForTrackingPrivacy('/pl/products', '/pl/login'), true);
  assert.equal(shouldReloadForTrackingPrivacy('/en/products', '/en/register'), true);
  assert.equal(shouldReloadForTrackingPrivacy('/pl/login', '/pl/register'), false);
  assert.equal(shouldReloadForTrackingPrivacy('/en/products', '/en/categories'), false);
  assert.match(trackingSource, /!isTrackingAllowedRoute\(pathname\)/);
  assert.match(sensitiveBoundarySource, /shouldReloadForTrackingPrivacy\(previousPathRef\.current, pathname\)/);
  assert.match(sensitiveBoundarySource, /window\.location\.replace\(window\.location\.href\)/);
  assert.match(sensitiveBoundarySource, /if \(leftTrackableRoute\) return null/);
  assert.match(rootLayoutSource, /<SensitiveRouteBoundary>/);
  assert.match(rootLayoutSource, /<TrackingScripts \/>/);
});
