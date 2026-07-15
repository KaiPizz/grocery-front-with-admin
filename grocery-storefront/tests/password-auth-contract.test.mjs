import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isDefinitiveRefreshFailure,
  isRefreshAlreadyRotated,
} from '../src/lib/auth/refresh-policy.ts';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const serverServiceSource = read('../src/lib/auth/server-service.ts');
const forgotRouteSource = read('../src/app/api/auth/forgot-password/route.ts');
const resetRouteSource = read('../src/app/api/auth/reset-password/route.ts');
const changeRouteSource = read('../src/app/api/auth/change-password/route.ts');
const refreshRouteSource = read('../src/app/api/auth/refresh/route.ts');
const graphqlProxySource = read('../src/app/api/graphql/route.ts');
const loginRouteSource = read('../src/app/api/auth/login/route.ts');
const registerRouteSource = read('../src/app/api/auth/register/route.ts');
const sessionRouteSource = read('../src/app/api/auth/session/route.ts');
const authenticationPolicySource = read('../src/lib/auth/authentication-policy.ts');
const authStoreSource = read('../src/stores/auth-store.ts');
const cookiesSource = read('../src/lib/auth/server-cookies.ts');
const resetFormSource = read('../src/components/auth/ResetPasswordForm.tsx');
const securityPanelSource = read('../src/components/account/SecurityPanel.tsx');
const trackingSource = read('../src/components/TrackingScripts.tsx');
const middlewareSource = read('../src/middleware.ts');
const restProxySource = read('../src/app/api/proxy/[...path]/route.ts');
const verifyEmailRouteSource = read('../src/app/api/auth/verify-email/route.ts');
const verifyEmailPanelSource = read('../src/components/auth/VerifyEmailPanel.tsx');

test('password mutations stay server-side and forgot uses only trusted channel locale input', () => {
  assert.match(serverServiceSource, /forgotPassword\(input: \$input\)/);
  assert.match(serverServiceSource, /\{ input: \{ email, locale \} \}/);
  assert.doesNotMatch(serverServiceSource, /redirectUrl/);
  assert.doesNotMatch(serverServiceSource, /resetOrigin/);
  assert.match(forgotRouteSource, /result\.payload\?\.success !== true/);
  assert.match(forgotRouteSource, /Keep account existence private/);
  assert.doesNotMatch(forgotRouteSource, /result\.payload\?\.message/);
});

test('registration forwards only a validated PL/EN locale for branded verification mail', () => {
  assert.match(registerRouteSource, /locale: body\.locale === 'en' \? 'en' : 'pl'/);
  assert.match(authStoreSource, /locale: 'pl' \| 'en'/);
  assert.match(authStoreSource, /register: async \(\{ fullName, email, password, phone, locale \}\)/);
  assert.match(authStoreSource, /JSON\.stringify\(\{ fullName, email, password, locale/);
});

test('successful reset and change revoke the browser session without returning credentials', () => {
  assert.match(resetRouteSource, /clearCustomerCookies\(response\)/);
  assert.match(changeRouteSource, /Changing a password revokes all sessions/);
  assert.match(changeRouteSource, /clearCustomerCookies\(response\)/);
  assert.doesNotMatch(resetRouteSource, /accessToken\s*:/);
  assert.doesNotMatch(resetRouteSource, /refreshToken\s*:/);
  assert.doesNotMatch(changeRouteSource, /accessToken\s*:/);
  assert.doesNotMatch(securityPanelSource, /localStorage\.setItem|sessionStorage\.setItem/);
});

test('change password refreshes GraphQL HTTP 200 expired access failures', () => {
  assert.match(serverServiceSource, /changeCustomerPassword[\s\S]*errorCode: firstGraphqlErrorCode/);
  assert.match(serverServiceSource, /changeCustomerPassword[\s\S]*errorStatus: firstGraphqlErrorStatus/);
  assert.match(changeRouteSource, /!result\.payload && isDefinitiveAuthenticationFailure\(result\)/);
  assert.match(changeRouteSource, /renewCustomerSessionSingleFlight\(tokens\.refreshToken\)/);
});

test('reset tokens use fragments, are scrubbed, and reset pages never load trackers', () => {
  assert.match(resetFormSource, /new URLSearchParams\(url\.hash\.replace/);
  assert.match(resetFormSource, /url\.searchParams\.get\('token'\)/);
  assert.match(resetFormSource, /url\.searchParams\.delete\('token'\)/);
  assert.match(resetFormSource, /url\.hash = ''/);
  assert.doesNotMatch(resetFormSource, /console\.(?:log|warn|error)/);
  assert.match(middlewareSource, /isSecretFragmentRoute && request\.nextUrl\.searchParams\.has\('token'\)/);
  assert.match(middlewareSource, /new URLSearchParams\(\{ token: legacyToken \}\)/);
  assert.match(trackingSource, /routePath === '\/reset-password'/);
});

test('verification tokens stay in fragments and use a dedicated same-origin BFF route', () => {
  assert.match(verifyEmailPanelSource, /new URLSearchParams\(url\.hash\.replace/);
  assert.match(verifyEmailPanelSource, /url\.searchParams\.delete\('token'\)/);
  assert.match(verifyEmailPanelSource, /url\.hash = ''/);
  assert.match(verifyEmailPanelSource, /fetch\('\/api\/auth\/verify-email'/);
  assert.match(verifyEmailRouteSource, /validateJsonMutationRequest\(request\)/);
  assert.match(verifyEmailRouteSource, /verifyCustomerEmail\(token\)/);
  assert.match(verifyEmailRouteSource, /requiresPasswordReset: result\.payload\.requiresPasswordReset === true/);
  assert.match(verifyEmailPanelSource, /requiresPasswordReset \? '\/forgot-password' : '\/login'/);
  assert.match(trackingSource, /routePath === '\/verify-email'/);
  assert.match(middlewareSource, /routePath === '\/verify-email'/);
});

test('refresh failures clear cookies only for definitive invalid or reuse codes', () => {
  assert.equal(isRefreshAlreadyRotated({ errorCode: 'REFRESH_ALREADY_ROTATED' }), true);
  assert.equal(isDefinitiveRefreshFailure({ errorCode: 'INVALID_REFRESH_TOKEN' }), true);
  assert.equal(isDefinitiveRefreshFailure({ errorCode: 'REFRESH_TOKEN_REUSE' }), true);
  assert.equal(isDefinitiveRefreshFailure({ errorCode: 'REFRESH_UNAVAILABLE' }), false);
  assert.equal(isDefinitiveRefreshFailure(null), false);

  assert.match(refreshRouteSource, /alreadyRotated \? 409/);
  assert.match(refreshRouteSource, /unavailable \? 502/);
  assert.match(refreshRouteSource, /if \(definitiveFailure\) \{\s*clearCustomerCookies/);
  assert.doesNotMatch(refreshRouteSource, /result\.status < 500[^\n]*clearCustomerCookies/);
  assert.match(graphqlProxySource, /isDefinitiveRefreshFailure\(renewal\.payload\)/);
  assert.match(graphqlProxySource, /isRefreshAlreadyRotated\(renewal\.payload\)/);
});

test('rotated tokens are attached even when the retried downstream call throws', () => {
  assert.match(graphqlProxySource, /catch \{[\s\S]*if \(renewed\?\.accessToken\)[\s\S]*setCustomerCookies\(/);
  assert.match(changeRouteSource, /catch \{[\s\S]*setRenewedCookies\(response, renewed, tokens\.refreshToken\)/);
});

test('legacy JavaScript-readable cookies are cleared whenever a server session wins', () => {
  assert.match(cookiesSource, /hasLegacyAccess:\s*Boolean\(legacyAccess\)/);
  assert.match(cookiesSource, /hasLegacyRefresh:\s*Boolean\(legacyRefresh\)/);
  assert.match(loginRouteSource, /setCustomerCookies\([\s\S]*clearLegacyCookies\(response\)/);
  assert.match(registerRouteSource, /setCustomerCookies\([\s\S]*clearLegacyCookies\(response\)/);
  assert.match(sessionRouteSource, /tokens\.hasLegacyAccess \|\| tokens\.hasLegacyRefresh/);
  assert.match(sessionRouteSource, /clearLegacyCookies\(response\)/);
});

test('session checks fail closed without discarding state on ambiguous GraphQL nulls', () => {
  assert.match(sessionRouteSource, /isDefinitiveAuthenticationFailure/);
  assert.match(sessionRouteSource, /authenticationRejected \? 401 : 502/);
  assert.match(authenticationPolicySource, /result\.errorStatus === 401/);
  assert.match(authenticationPolicySource, /code === 'UNAUTHENTICATED'/);
});

test('definitive local session clearing removes shared-device customer state', () => {
  assert.match(authStoreSource, /function clearCustomerScopedState[\s\S]*useCartStore\.getState\(\)\.clear\(\)/);
  assert.match(authStoreSource, /function clearCustomerScopedState[\s\S]*useWishlistStore\.getState\(\)\.resetLocal\(\)/);
  assert.match(authStoreSource, /if \(hadRejectedCredentials\) \{\s*clearCustomerScopedState\(\)/);
  assert.match(authStoreSource, /clearSession: \(\) => \{[\s\S]*clearCustomerScopedState\(\)/);
});

test('ordinary guests are distinct from rejected credentials during bootstrap', () => {
  assert.match(sessionRouteSource, /code: 'NO_ACCESS_COOKIE'/);
  assert.match(authStoreSource, /'invalid' \| 'missing' \| 'transient'/);
  assert.match(authStoreSource, /if \(hadRejectedCredentials\)/);
});

test('generic REST proxy cannot reach token-producing customer endpoints', () => {
  assert.doesNotMatch(restProxySource, /export async function POST/);
  assert.match(restProxySource, /params\.path\.length === 3/);
  assert.match(restProxySource, /params\.path\[0\] === 'public'/);
  assert.match(restProxySource, /params\.path\[1\] === 'salon'/);
  assert.match(restProxySource, /params\.path\[2\] === configuredSlug/);
  assert.doesNotMatch(restProxySource, /request\.text\(\)|headers\.Authorization/);
  assert.doesNotMatch(restProxySource, /customers\/login|customers\/register/);
});
