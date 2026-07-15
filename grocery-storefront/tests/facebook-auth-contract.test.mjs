import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  consumeFacebookOAuthState,
  createFacebookOAuthState,
  FACEBOOK_OAUTH_MAX_PENDING_STATES,
  FACEBOOK_OAUTH_STATE_MAX_AGE_SECONDS,
  issueFacebookOAuthState,
  normalizeFacebookAppId,
  normalizeFacebookGraphVersion,
} from '../src/lib/auth/facebook-oauth.ts';
import { PendingOAuthChallengeStore } from '../src/lib/auth/oauth-challenge-store.js';
import { isTrackingAllowedRoute } from '../src/lib/tracking-policy.ts';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const envExampleSource = read('../.env.example');
const helperSource = read('../src/lib/auth/facebook-oauth.ts');
const challengeStoreSource = read('../src/lib/auth/oauth-challenge-store.js');
const startRouteSource = read('../src/app/api/auth/facebook/start/route.ts');
const exchangeRouteSource = read('../src/app/api/auth/facebook/route.ts');
const requestSecuritySource = read('../src/lib/auth/request-security.ts');
const serverServiceSource = read('../src/lib/auth/server-service.ts');
const upstreamSource = read('../src/lib/auth/upstream.ts');
const authStoreSource = read('../src/stores/auth-store.ts');
const componentSource = read('../src/components/auth/FacebookSignIn.tsx');
const socialComponentSource = read('../src/components/auth/SocialSignIn.tsx');
const authFormSource = read('../src/components/auth/AuthForm.tsx');
const proxyPolicySource = read('../src/lib/auth/proxy-policy.ts');
const trackingPolicySource = read('../src/lib/tracking-policy.ts');
const plMessages = JSON.parse(read('../src/messages/pl.json'));
const enMessages = JSON.parse(read('../src/messages/en.json'));

test('Facebook app/version config is strict and the OAuth state is strong and one-time', () => {
  assert.equal(normalizeFacebookAppId(undefined), null);
  assert.equal(normalizeFacebookAppId('abc123'), null);
  assert.equal(normalizeFacebookAppId(' 123456789012345 '), '123456789012345');

  assert.equal(normalizeFacebookGraphVersion(undefined), null);
  assert.equal(normalizeFacebookGraphVersion('25.0'), null);
  assert.equal(normalizeFacebookGraphVersion('v25'), null);
  assert.equal(normalizeFacebookGraphVersion('v01.0'), null);
  assert.equal(normalizeFacebookGraphVersion('v1000.0'), null);
  assert.equal(normalizeFacebookGraphVersion(' v25.0 '), 'v25.0');

  const states = new Set(Array.from({ length: 32 }, () => createFacebookOAuthState()));
  assert.equal(states.size, 32);
  for (const state of states) assert.match(state, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(FACEBOOK_OAUTH_STATE_MAX_AGE_SECONDS, 300);

  const now = 10_000;
  const forged = createFacebookOAuthState();
  assert.equal(consumeFacebookOAuthState('login', forged, forged, now), false);

  const loginState = issueFacebookOAuthState('login', now);
  assert.equal(typeof loginState, 'string');
  assert.equal(consumeFacebookOAuthState('link', loginState, loginState, now), false);
  assert.equal(consumeFacebookOAuthState('login', loginState, loginState, now), true);
  assert.equal(consumeFacebookOAuthState('login', loginState, loginState, now), false);

  const linkState = issueFacebookOAuthState('link', now);
  assert.equal(typeof linkState, 'string');
  assert.equal(consumeFacebookOAuthState('login', linkState, linkState, now), false);
  assert.equal(consumeFacebookOAuthState('link', linkState, linkState, now), true);
});

test('Facebook is fail-closed behind server-only app, version, BFF secret and loopback URL config', () => {
  assert.match(envExampleSource, /CUSTOMER_FACEBOOK_APP_ID=/);
  assert.match(envExampleSource, /CUSTOMER_FACEBOOK_GRAPH_VERSION=/);
  assert.doesNotMatch(envExampleSource, /NEXT_PUBLIC_FACEBOOK_(?:APP_ID|GRAPH_VERSION)/);
  assert.match(startRouteSource, /process\.env\.CUSTOMER_FACEBOOK_APP_ID/);
  assert.match(startRouteSource, /process\.env\.CUSTOMER_FACEBOOK_GRAPH_VERSION/);
  assert.match(startRouteSource, /normalizeFacebookGraphVersion/);
  assert.match(startRouteSource, /hasCustomerAuthBffSecret\(process\.env\.CUSTOMER_AUTH_BFF_SECRET\)/);
  assert.match(startRouteSource, /normalizeCustomerAuthGraphqlUrl\(process\.env\.CUSTOMER_AUTH_GRAPHQL_URL\)/);
  assert.match(exchangeRouteSource, /process\.env\.CUSTOMER_FACEBOOK_APP_ID/);
  assert.match(exchangeRouteSource, /process\.env\.CUSTOMER_FACEBOOK_GRAPH_VERSION/);
  assert.match(exchangeRouteSource, /hasCustomerAuthBffSecret\(process\.env\.CUSTOMER_AUTH_BFF_SECRET\)/);
  assert.match(exchangeRouteSource, /normalizeCustomerAuthGraphqlUrl\(process\.env\.CUSTOMER_AUTH_GRAPHQL_URL\)/);
});

test('Facebook start issues a short-lived HttpOnly proof-of-initiation cookie and never caches config', () => {
  assert.match(startRouteSource, /validateSameOriginRequest\(request\)/);
  assert.match(startRouteSource, /issueFacebookOAuthState\('login'\)/);
  assert.match(startRouteSource, /httpOnly:\s*true/);
  assert.match(startRouteSource, /sameSite:\s*'lax'/);
  assert.match(startRouteSource, /path:\s*'\/api\/auth\/facebook'/);
  assert.match(startRouteSource, /FACEBOOK_OAUTH_STATE_MAX_AGE_SECONDS/);
  assert.match(startRouteSource, /setNoStoreHeaders/);
  assert.match(startRouteSource, /\{[\s\S]*enabled: true,[\s\S]*appId,[\s\S]*apiVersion,[\s\S]*state/);
});

test('Facebook exchange is same-origin JSON only, consumes state before token exchange, and returns no tokens', () => {
  assert.match(exchangeRouteSource, /validateJsonMutationRequest\(request\)/);
  assert.match(requestSecuritySource, /sec-fetch-site.*cross-site/);
  assert.match(requestSecuritySource, /new URL\(origin\)\.origin !== expectedRequestOrigin\(request\)/);
  assert.match(requestSecuritySource, /contentType\.startsWith\('application\/json'\)/);
  assert.match(exchangeRouteSource, /request\.cookies\.get\(FACEBOOK_OAUTH_STATE_COOKIE_NAME\)/);
  assert.match(exchangeRouteSource, /MAX_FACEBOOK_ACCESS_TOKEN_LENGTH\s*=\s*4096/);
  assert.ok(
    exchangeRouteSource.indexOf("consumeFacebookOAuthState('login', cookieState, submittedState)")
      < exchangeRouteSource.indexOf('facebookLoginCustomer({ token: accessToken }, locale)'),
  );
  assert.match(exchangeRouteSource, /function normalizeLocale\(value: unknown\): 'pl' \| 'en'/);
  assert.match(exchangeRouteSource, /value === 'en' \? 'en' : 'pl'/);
  assert.match(exchangeRouteSource, /facebookLoginCustomer\(\{ token: accessToken \}, locale\)/);
  assert.match(exchangeRouteSource, /consumeFacebookStateCookie\(response\)/);
  assert.match(exchangeRouteSource, /setCustomerCookies\(response, payload\.accessToken/);
  assert.match(exchangeRouteSource, /setNoStoreHeaders/);
  assert.doesNotMatch(exchangeRouteSource, /console\.(?:log|warn|error)/);
  assert.doesNotMatch(exchangeRouteSource, /accessToken:\s*payload\.accessToken/);
  assert.doesNotMatch(exchangeRouteSource, /refreshToken:\s*payload\.refreshToken/);
  assert.match(proxyPolicySource, /customerFacebookAuth/);
});

test('private GraphQL contract forwards only the provider token plus trusted locale/channel headers', () => {
  assert.match(serverServiceSource, /mutation CustomerFacebookLogin\(\$input: OAuthLoginInput!\)/);
  assert.match(serverServiceSource, /customerFacebookAuth\(input: \$input\)/);
  assert.match(serverServiceSource, /customer \{ id email fullName phone emailVerified createdAt hasPassword linkedProviders \}/);
  assert.match(serverServiceSource, /facebookLoginCustomer\([\s\S]*input: \{ token: string \},[\s\S]*locale: 'pl' \| 'en'/);
  assert.match(serverServiceSource, /privateCustomerAuthGraphqlRequest<FacebookLoginResult>\([\s\S]*\{ input \},[\s\S]*locale/);
  assert.match(serverServiceSource, /'x-channel': resolveChannel\(process\.env\.NEXT_PUBLIC_SALON_SLUG\)/);
  assert.match(serverServiceSource, /'x-customer-auth-bff-secret': bffSecret/);
  assert.match(serverServiceSource, /\.\.\.\(options\.locale \? \{ 'x-locale': options\.locale \} : \{\}\)/);
  assert.match(serverServiceSource, /normalizeCustomerAuthGraphqlUrl\(process\.env\.CUSTOMER_AUTH_GRAPHQL_URL\)/);
  assert.match(serverServiceSource, /redirect: 'error'/);
  assert.match(serverServiceSource, /signal: AbortSignal\.timeout\(10_000\)/);
  assert.doesNotMatch(upstreamSource, /x-customer-auth-bff-secret|CUSTOMER_AUTH_BFF_SECRET/);
  assert.doesNotMatch(componentSource, /CUSTOMER_AUTH_BFF_SECRET|x-customer-auth-bff-secret/);
  assert.doesNotMatch(startRouteSource, /customerAuthBffSecret[,}]/);
});

test('official Facebook SDK is click-gated, privacy-reduced and keeps state/token in memory only', () => {
  const handleClickSource = componentSource.slice(componentSource.indexOf('const handleClick'));
  assert.doesNotMatch(componentSource, /from 'next\/script'/);
  assert.match(componentSource, /https:\/\/connect\.facebook\.net\/\$\{sdkLocale\}\/sdk\.js/);
  assert.match(handleClickSource, /await loadFacebookSdk\(locale\)/);
  assert.match(componentSource, /void startFlow\(\)/);
  assert.match(componentSource, /loginResponse\.status === 'connected'/);
  assert.match(componentSource, /authResponse\?\.accessToken/);
  assert.match(componentSource, /cookie: false/);
  assert.match(componentSource, /status: false/);
  assert.match(componentSource, /xfbml: false/);
  assert.match(componentSource, /autoLogAppEvents: false/);
  assert.match(componentSource, /version: activeConfig\.apiVersion/);
  assert.match(componentSource, /scope: 'public_profile,email'/);
  assert.match(componentSource, /return_scopes: true/);
  assert.match(componentSource, /if \(!accessToken\)[\s\S]*await startFlow\(\)/);
  assert.doesNotMatch(componentSource, /localStorage|sessionStorage|console\.(?:log|warn|error)/);
  assert.match(authStoreSource, /facebookLogin: async \(accessToken, state, locale\)/);
  assert.match(authStoreSource, /JSON\.stringify\(\{ accessToken, state, locale \}\)/);
  assert.doesNotMatch(authStoreSource, /localStorage\.setItem|sessionStorage\.setItem/);
});

test('PL/EN login and registration keep one localized email fallback and unverified-email prompt', () => {
  assert.match(authFormSource, /<SocialSignIn mode=\{mode\} returnTo=\{returnTo\} \/>/);
  assert.match(socialComponentSource, /<GoogleSignIn/);
  assert.match(socialComponentSource, /<FacebookSignIn/);
  assert.equal((socialComponentSource.match(/role="separator"/g) ?? []).length, 1);
  assert.match(componentSource, /session\.user\?\.emailVerified === false/);
  assert.match(componentSource, /toast\.info\(t\('facebookVerifyEmail'\)\)/);
  for (const messages of [plMessages, enMessages]) {
    for (const key of [
      'facebookLoginLabel',
      'facebookRegisterLabel',
      'facebookLoading',
      'facebookSuccess',
      'facebookFailed',
      'facebookVerifyEmail',
      'emailDivider',
    ]) {
      assert.equal(typeof messages.auth[key], 'string', key);
      assert.ok(messages.auth[key].length > 0, key);
    }
  }
  assert.equal(isTrackingAllowedRoute('/pl/login'), false);
  assert.equal(isTrackingAllowedRoute('/en/register'), false);
  assert.match(trackingPolicySource, /TRACKABLE_PUBLIC_ROUTE_PREFIXES/);
});

test('pending OAuth memory is global across route bundles, bounded, issued-only and expiring', () => {
  assert.equal(FACEBOOK_OAUTH_MAX_PENDING_STATES, 10_000);
  assert.match(challengeStoreSource, /globalThis/);
  assert.match(challengeStoreSource, /Move this registry to Redis before running multiple processes/);

  const namespace = `facebook-contract-${process.pid}`;
  const issuer = new PendingOAuthChallengeStore(namespace, 2, 300_000);
  const consumer = new PendingOAuthChallengeStore(namespace, 2, 300_000);
  const now = 1_000_000_000_000;
  const first = Buffer.alloc(32, 1).toString('base64url');
  const second = Buffer.alloc(32, 2).toString('base64url');
  const overflow = Buffer.alloc(32, 3).toString('base64url');

  assert.equal(consumer.consume(first, first, now), false, 'forged equal values fail');
  assert.equal(issuer.issue(first, now), true);
  assert.equal(consumer.consume(first, second, now), false, 'mismatch does not consume');
  assert.equal(consumer.consume(first, first, now), true, 'separate bundle instance consumes');
  assert.equal(consumer.consume(first, first, now), false, 'one shot');

  assert.equal(issuer.issue(first, now), true);
  assert.equal(issuer.issue(second, now), true);
  assert.equal(issuer.issue(overflow, now), false, 'bounded at capacity');
  assert.equal(consumer.consume(first, first, now + 300_001), false, 'expired challenge fails');
  assert.equal(issuer.issue(overflow, now + 300_001), true, 'expiry pruning frees capacity');
  assert.match(helperSource, /customer-facebook-login/);
  assert.match(helperSource, /customer-facebook-link/);
});
