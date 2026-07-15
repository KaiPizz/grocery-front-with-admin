import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  consumeGoogleLinkNonce,
  GOOGLE_OAUTH_NONCE_MAX_AGE_SECONDS,
} from '../src/lib/auth/google-oauth.ts';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const serverServiceSource = read('../src/lib/auth/server-service.ts');
const revokingActionSource = read('../src/lib/auth/server-revoking-action.ts');
const googleStartSource = read('../src/app/api/auth/google/link/start/route.ts');
const googleLinkSource = read('../src/app/api/auth/google/link/route.ts');
const facebookStartSource = read('../src/app/api/auth/facebook/link/start/route.ts');
const facebookLinkSource = read('../src/app/api/auth/facebook/link/route.ts');
const unlinkSource = read('../src/app/api/auth/provider/unlink/route.ts');
const providerPanelSource = read('../src/components/account/ProviderConnectionsPanel.tsx');
const securityPanelSource = read('../src/components/account/SecurityPanel.tsx');
const proxyPolicySource = read('../src/lib/auth/proxy-policy.ts');
const enMessages = JSON.parse(read('../src/messages/en.json'));
const plMessages = JSON.parse(read('../src/messages/pl.json'));

function nonce(byte) {
  return Buffer.alloc(32, byte).toString('base64url');
}

test('provider mutations require the server BFF guard and customer bearer without returning tokens', () => {
  assert.match(serverServiceSource, /mutation CustomerGoogleLink\(\$token: String!, \$nonce: String!, \$currentPassword: String!\)/);
  assert.match(serverServiceSource, /customerGoogleLink\(token: \$token, nonce: \$nonce, currentPassword: \$currentPassword\)/);
  assert.match(serverServiceSource, /mutation CustomerFacebookLink\(\$token: String!, \$currentPassword: String!\)/);
  assert.match(serverServiceSource, /customerLoginProviderUnlink\(provider: \$provider, currentPassword: \$currentPassword\)/);
  assert.match(serverServiceSource, /'x-customer-auth-bff-secret': bffSecret/);
  assert.match(serverServiceSource, /Authorization: `Bearer \$\{options\.accessToken\}`/);

  for (const operationName of [
    'CUSTOMER_GOOGLE_LINK_OPERATION',
    'CUSTOMER_FACEBOOK_LINK_OPERATION',
    'CUSTOMER_LOGIN_PROVIDER_UNLINK_OPERATION',
  ]) {
    const start = serverServiceSource.indexOf(`export const ${operationName}`);
    const end = serverServiceSource.indexOf('`;', start);
    assert.notEqual(start, -1, operationName);
    const operation = serverServiceSource.slice(start, end);
    assert.doesNotMatch(operation, /accessToken|refreshToken/);
    assert.match(operation, /success[\s\S]*message/);
  }
});

test('Google link nonce is purpose-bound, timing-safe and one-time', () => {
  const now = 1_000_000;
  const first = nonce(41);
  const second = nonce(42);
  assert.equal(consumeGoogleLinkNonce(first, second, now), false);
  assert.equal(consumeGoogleLinkNonce(first, first, now), true);
  assert.equal(consumeGoogleLinkNonce(first, first, now), false);
  assert.equal(
    consumeGoogleLinkNonce(
      first,
      first,
      now + GOOGLE_OAUTH_NONCE_MAX_AGE_SECONDS * 1000 + 1,
    ),
    true,
  );
});

test('provider link challenges are separate from login and exact request bodies are enforced', () => {
  assert.match(googleStartSource, /GOOGLE_LINK_NONCE_COOKIE_NAME/);
  assert.match(googleStartSource, /path: '\/api\/auth\/google\/link'/);
  assert.doesNotMatch(googleStartSource, /GOOGLE_OAUTH_NONCE_COOKIE_NAME/);
  assert.match(googleLinkSource, /consumeGoogleLinkNonce\(cookieNonce, submittedNonce\)/);
  assert.match(googleLinkSource, /keys\.length !== 3/);
  assert.match(googleLinkSource, /keys\[0\] !== 'credential'/);
  assert.match(googleLinkSource, /keys\[2\] !== 'nonce'/);

  assert.match(facebookStartSource, /FACEBOOK_LINK_STATE_COOKIE_NAME/);
  assert.match(facebookStartSource, /path: '\/api\/auth\/facebook\/link'/);
  assert.match(facebookLinkSource, /consumeFacebookOAuthState\(cookieState, submittedState\)/);
  assert.match(facebookLinkSource, /keys\.length !== 3/);
  assert.match(unlinkSource, /keys\.length !== 2/);
  assert.match(unlinkSource, /value === 'google' \|\| value === 'facebook'/);
  for (const source of [googleLinkSource, facebookLinkSource, unlinkSource]) {
    assert.match(source, /validateJsonMutationRequest\(request\)/);
    assert.match(source, /Buffer\.byteLength\(value, 'utf8'\) <= 72/);
  }
});

test('revoking account actions refresh once, preserve rotations on failure and clear success sessions', () => {
  assert.match(revokingActionSource, /renewCustomerSessionSingleFlight\(tokens\.refreshToken\)/);
  assert.match(revokingActionSource, /result = await action\(renewal\.payload\.accessToken\)/);
  assert.match(revokingActionSource, /setRenewedCookies\(response, renewed, tokens\.refreshToken\)/);
  assert.match(revokingActionSource, /Linking or unlinking a provider revokes every backend session/);
  assert.match(revokingActionSource, /clearCustomerCookies\(response\)/);
  assert.match(revokingActionSource, /message: rateLimited[\s\S]*messages\.failed/);
});

test('account UI requires authoritative password capability and never handles bearer tokens', () => {
  assert.match(securityPanelSource, /<ProviderConnectionsPanel profile=\{profile\} \/>/);
  assert.match(providerPanelSource, /typeof profile\?\.hasPassword === 'boolean'[\s\S]*Array\.isArray\(profile\.linkedProviders\)/);
  assert.match(providerPanelSource, /profile\?\.hasPassword === true/);
  assert.match(providerPanelSource, /linkedProviders\.size > 1/);
  assert.match(providerPanelSource, /fetch\('\/api\/auth\/google\/link'/);
  assert.match(providerPanelSource, /fetch\('\/api\/auth\/facebook\/link'/);
  assert.match(providerPanelSource, /fetch\('\/api\/auth\/provider\/unlink'/);
  assert.match(providerPanelSource, /clearSession\(\)/);
  assert.match(providerPanelSource, /router\.replace\('\/login\?returnTo=%2Faccount%23security'\)/);
  assert.doesNotMatch(providerPanelSource, /\/api\/graphql|Authorization|localStorage|sessionStorage/);
});

test('provider mutations cannot bypass the BFF and PL/EN copy covers every state', () => {
  for (const field of [
    'customerGoogleLink',
    'customerFacebookLink',
    'customerLoginProviderUnlink',
  ]) {
    assert.match(proxyPolicySource, new RegExp(`'${field}'`));
  }
  for (const messages of [enMessages, plMessages]) {
    for (const key of [
      'providerCurrentPassword',
      'providerPasswordSetupRequired',
      'providerConnected',
      'providerNotConnected',
      'providerConnectGoogle',
      'providerConnectFacebook',
      'providerDisconnect',
      'providerLastMethod',
      'providerSessionRevocationNotice',
      'providerLinkConflict',
      'providerUnlinkConflict',
      'providerActionRateLimited',
      'providerActionUnavailable',
      'providerActionFailed',
    ]) {
      assert.equal(typeof messages.account[key], 'string', key);
      assert.ok(messages.account[key].length > 0, key);
    }
  }
});
