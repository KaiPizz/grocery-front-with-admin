import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  consumeGoogleLinkNonce,
  consumeGoogleLoginNonce,
  GOOGLE_OAUTH_NONCE_MAX_AGE_SECONDS,
  issueGoogleOAuthNonce,
} from '../src/lib/auth/google-oauth.ts';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const serverServiceSource = read('../src/lib/auth/server-service.ts');
const revokingActionSource = read('../src/lib/auth/server-revoking-action.ts');
const stepUpRouteSource = read('../src/app/api/auth/provider/step-up/route.ts');
const stepUpCookieSource = read('../src/lib/auth/provider-step-up.ts');
const challengeStoreSource = read('../src/lib/auth/oauth-challenge-store.js');
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

test('provider mutations use a short-lived step-up proof behind the private BFF', () => {
  assert.match(serverServiceSource, /mutation CustomerCredentialStepUp\(\$currentPassword: String!\)/);
  assert.match(serverServiceSource, /customerCredentialStepUp\(currentPassword: \$currentPassword\)/);
  assert.match(serverServiceSource, /stepUpProof[\s\S]*expiresIn/);
  assert.match(serverServiceSource, /mutation CustomerGoogleLink\(\$token: String!, \$nonce: String!, \$stepUpProof: String!\)/);
  assert.match(serverServiceSource, /customerGoogleLink\(token: \$token, nonce: \$nonce, stepUpProof: \$stepUpProof\)/);
  assert.match(serverServiceSource, /mutation CustomerFacebookLink\(\$token: String!, \$stepUpProof: String!\)/);
  assert.match(serverServiceSource, /customerLoginProviderUnlink\(provider: \$provider, stepUpProof: \$stepUpProof\)/);
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
    assert.doesNotMatch(operation, /accessToken|refreshToken|currentPassword/);
    assert.match(operation, /success[\s\S]*message/);
  }
});

test('Google challenges are issued-only, purpose-bound, one-time and expiring', () => {
  const now = 1_000_000;
  const forged = nonce(40);
  assert.equal(consumeGoogleLinkNonce(forged, forged, now), false);

  const linkNonce = issueGoogleOAuthNonce('link', now);
  assert.equal(typeof linkNonce, 'string');
  assert.equal(consumeGoogleLoginNonce(linkNonce, now), false);
  assert.equal(consumeGoogleLinkNonce(linkNonce, forged, now), false);
  assert.equal(consumeGoogleLinkNonce(linkNonce, linkNonce, now), true);
  assert.equal(consumeGoogleLinkNonce(linkNonce, linkNonce, now), false);

  const expired = issueGoogleOAuthNonce('link', now);
  assert.equal(typeof expired, 'string');
  assert.equal(
    consumeGoogleLinkNonce(
      expired,
      expired,
      now + GOOGLE_OAUTH_NONCE_MAX_AGE_SECONDS * 1000 + 1,
    ),
    false,
  );
  assert.match(challengeStoreSource, /globalThis/);
  assert.match(challengeStoreSource, /this\.pending\.delete\(digest\)/);
});

test('provider routes keep proof HttpOnly and enforce exact challenge-bound request bodies', () => {
  assert.match(stepUpRouteSource, /keys\.length !== 1/);
  assert.match(stepUpRouteSource, /keys\[0\] !== 'currentPassword'/);
  assert.match(stepUpRouteSource, /stepUpCustomerCredential\(tokens\.accessToken, currentPassword\)/);
  assert.match(stepUpRouteSource, /setProviderStepUpCookie\(/);
  assert.match(stepUpRouteSource, /success: true,[\s\S]*message: result\.payload\.message/);
  assert.doesNotMatch(stepUpRouteSource, /stepUpProof\s*:/);
  assert.match(stepUpCookieSource, /createHmac\('sha256', secret\)/);
  assert.match(stepUpCookieSource, /timingSafeEqual/);
  assert.match(stepUpCookieSource, /httpOnly: true/);
  assert.match(stepUpCookieSource, /sameSite: 'strict'/);
  assert.match(stepUpCookieSource, /path: '\/api\/auth'/);
  assert.match(stepUpCookieSource, /PROVIDER_STEP_UP_MAX_COOKIE_VALUE_BYTES = 3_800/);
  assert.match(stepUpCookieSource, /Buffer\.byteLength\(cookieValue, 'utf8'\) > PROVIDER_STEP_UP_MAX_COOKIE_VALUE_BYTES/);

  assert.match(googleStartSource, /readProviderStepUpProof\(request\)/);
  assert.match(googleStartSource, /issueGoogleOAuthNonce\('link'\)/);
  assert.match(googleStartSource, /GOOGLE_LINK_NONCE_COOKIE_NAME/);
  assert.match(googleStartSource, /path: '\/api\/auth\/google\/link'/);
  assert.doesNotMatch(googleStartSource, /GOOGLE_OAUTH_NONCE_COOKIE_NAME/);
  assert.match(googleLinkSource, /consumeGoogleLinkNonce\(cookieNonce, submittedNonce\)/);
  assert.match(googleLinkSource, /keys\.length !== 2/);
  assert.match(googleLinkSource, /keys\[0\] !== 'credential'/);
  assert.match(googleLinkSource, /keys\[1\] !== 'nonce'/);

  assert.match(facebookStartSource, /readProviderStepUpProof\(request\)/);
  assert.match(facebookStartSource, /issueFacebookOAuthState\('link'\)/);
  assert.match(facebookStartSource, /FACEBOOK_LINK_STATE_COOKIE_NAME/);
  assert.match(facebookStartSource, /path: '\/api\/auth\/facebook\/link'/);
  assert.match(facebookLinkSource, /consumeFacebookOAuthState\('link', cookieState, submittedState\)/);
  assert.match(facebookLinkSource, /keys\.length !== 2/);
  assert.match(unlinkSource, /keys\.length !== 1/);
  assert.match(unlinkSource, /value === 'google' \|\| value === 'facebook'/);

  for (const source of [googleLinkSource, facebookLinkSource, unlinkSource]) {
    assert.match(source, /validateJsonMutationRequest\(request\)/);
    assert.match(source, /readProviderStepUpProof\(request\)/);
    assert.match(source, /clearProviderStepUpCookie\(/);
    assert.doesNotMatch(source, /currentPassword/);
  }
});

test('revoking actions map GraphQL 400 to client failure and keep BFF 503 non-destructive', () => {
  assert.match(revokingActionSource, /result\.errorStatus !== null[\s\S]*result\.errorStatus >= 400[\s\S]*result\.errorStatus < 500/);
  assert.match(revokingActionSource, /CLIENT_FAILURE_CODES\.has\(errorCode\(result\)\)/);
  assert.match(revokingActionSource, /result\.status >= 500/);
  assert.match(revokingActionSource, /setRenewedCookies\(response, renewed, tokens\.refreshToken\)/);
  assert.match(revokingActionSource, /Linking or unlinking a provider revokes every backend session/);
  assert.match(revokingActionSource, /clearCustomerCookies\(response\)/);
  assert.match(revokingActionSource, /unavailable[\s\S]*\? 502[\s\S]*authFailure[\s\S]*\? 401[\s\S]*: 400/);
});

test('account UI unmounts passwords before provider SDKs and serializes every provider action', () => {
  assert.match(securityPanelSource, /<ProviderConnectionsPanel[\s\S]*profile=\{profile\}[\s\S]*onPasswordIsolationChange=\{handleProviderPasswordIsolationChange\}/);
  assert.match(securityPanelSource, /useState\(true\)/);
  assert.match(securityPanelSource, /!providerPasswordIsolation && \(hasPassword/);
  assert.match(securityPanelSource, /!providerPasswordIsolation && <DeleteAccountPanel/);
  assert.match(securityPanelSource, /setCurrentPassword\(''\)[\s\S]*setNewPassword\(''\)[\s\S]*setConfirmPassword\(''\)/);
  assert.match(providerPanelSource, /typeof profile\?\.hasPassword === 'boolean'[\s\S]*Array\.isArray\(profile\.linkedProviders\)/);
  assert.match(providerPanelSource, /fetch\('\/api\/auth\/provider\/step-up'/);
  assert.match(providerPanelSource, /JSON\.stringify\(\{ currentPassword \}\)/);
  assert.match(providerPanelSource, /useState<PasswordDocumentSafety>\('checking'\)/);
  assert.match(providerPanelSource, /function hasProviderSdkExposure\(\)/);
  assert.match(providerPanelSource, /if \(hasProviderSdkExposure\(\)\) \{[\s\S]*setPasswordDocumentSafety\('reload-required'\)/);
  assert.match(providerPanelSource, /onPasswordIsolationChange\(true\)[\s\S]*setStepUpReady\(true\)/);
  assert.match(providerPanelSource, /onClick=\{\(\) => window\.location\.reload\(\)\}/);
  assert.match(providerPanelSource, /passwordDocumentSafety === 'safe'/);
  assert.match(providerPanelSource, /stepUpReady && googleConfig && !googleUnavailable/);
  assert.match(providerPanelSource, /actionInFlightRef\.current/);
  assert.match(providerPanelSource, /busyProvider \? 'pointer-events-none opacity-60'/);
  assert.doesNotMatch(providerPanelSource, /passwordRef|exchangeInFlightRef/);
  assert.doesNotMatch(providerPanelSource, /\/api\/graphql|Authorization|localStorage|sessionStorage/);
  for (const source of [googleLinkSource, facebookLinkSource, unlinkSource]) {
    assert.doesNotMatch(source, /Buffer\.byteLength\(value, 'utf8'\) <= 72/);
  }
});

test('provider mutations cannot bypass the BFF and PL/EN copy covers step-up states', () => {
  for (const field of [
    'customerCredentialStepUp',
    'customerGoogleLink',
    'customerFacebookLink',
    'customerLoginProviderUnlink',
  ]) {
    assert.match(proxyPolicySource, new RegExp(`'${field}'`));
  }
  for (const messages of [enMessages, plMessages]) {
    for (const key of [
      'providerCurrentPassword',
      'providerPasswordInvalid',
      'providerStepUpAction',
      'providerStepUpChecking',
      'providerStepUpReady',
      'providerStepUpExpired',
      'providerStepUpDocumentCheck',
      'providerStepUpReloadRequired',
      'providerStepUpReloadAction',
      'providerConnectGoogle',
      'providerConnectFacebook',
      'providerDisconnect',
      'providerSessionRevocationNotice',
      'providerActionRateLimited',
      'providerActionUnavailable',
      'providerActionFailed',
    ]) {
      assert.equal(typeof messages.account[key], 'string', key);
      assert.ok(messages.account[key].length > 0, key);
    }
  }
});
