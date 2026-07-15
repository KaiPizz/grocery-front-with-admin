import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const cookiesSource = read('../src/lib/auth/server-cookies.ts');
const proxySource = read('../src/app/api/graphql/route.ts');
const proxyPolicySource = read('../src/lib/auth/proxy-policy.ts');
const authStoreSource = read('../src/stores/auth-store.ts');
const clientAuthSource = read('../src/lib/auth.ts');
const refreshSource = read('../src/app/api/auth/refresh/route.ts');
const logoutSource = read('../src/app/api/auth/logout/route.ts');
const singleFlightSource = read('../src/lib/auth/server-refresh.ts');
const requestSource = read('../src/lib/graphql/request.ts');
const graphqlClientSource = read('../src/lib/graphql/client.ts');
const authenticationPolicySource = read('../src/lib/auth/authentication-policy.ts');

test('customer session cookies are HttpOnly, host-only and production-secure', () => {
  assert.match(cookiesSource, /httpOnly:\s*true/);
  assert.match(cookiesSource, /secure:\s*process\.env\.NODE_ENV === 'production'/);
  assert.match(cookiesSource, /sameSite:\s*'lax'/);
  assert.match(cookiesSource, /path:\s*'\/'/);
  assert.doesNotMatch(cookiesSource, /domain:/i);
});

test('browser auth state is memory-only and never writes credentials or profile PII', () => {
  assert.doesNotMatch(clientAuthSource, /localStorage\.setItem/);
  assert.doesNotMatch(authStoreSource, /setAuthToken|setRefreshToken|decodeTokenPayload|window\.atob/);
  assert.match(clientAuthSource, /localStorage\.removeItem\(LEGACY_ACCESS_STORAGE_KEY\)/);
  assert.match(clientAuthSource, /localStorage\.removeItem\(LEGACY_PROFILE_STORAGE_KEY\)/);
});

test('generic GraphQL proxy ignores browser bearer and blocks token operations', () => {
  assert.doesNotMatch(proxySource, /request\.headers\.get\(['"]authorization['"]\)/);
  assert.match(proxySource, /readCustomerTokens\(request\)/);
  assert.match(proxySource, /containsBlockedAuthField/);
  assert.match(proxyPolicySource, /customerAccessTokenRenew/);
  assert.match(proxyPolicySource, /customerLogin/);
  assert.match(proxyPolicySource, /'logout'/);
  assert.match(proxySource, /isGraphqlAuthenticationFailure/);
  assert.match(requestSource, /isGraphqlAuthenticationFailure/);
  assert.match(requestSource, /payload\.code === 'NO_REFRESH_COOKIE'\) return 'missing'/);
  assert.match(authenticationPolicySource, /originalError\?\.statusCode/);
  assert.doesNotMatch(proxySource, /export async function GET/);
  assert.match(proxySource, /setNoStoreHeaders/);
});

test('browser GraphQL queries stay POST-only for the same-origin BFF', () => {
  assert.match(graphqlClientSource, /url:\s*getGraphqlUrl\(\)/);
  assert.match(graphqlClientSource, /preferGetMethod:\s*false/);
  assert.match(graphqlClientSource, /method:\s*'POST'/);
  assert.doesNotMatch(proxySource, /export async function GET/);
});

test('refresh is single-flight and logout renews before revoke when access is unavailable', () => {
  assert.match(singleFlightSource, /createHash\('sha256'\)/);
  assert.match(singleFlightSource, /renewalsInFlight\.get\(key\)/);
  assert.match(singleFlightSource, /RESOLVED_RENEWAL_TTL_MS\s*=\s*10_000/);
  assert.match(refreshSource, /renewCustomerSessionSingleFlight\(tokens\.refreshToken\)/);
  assert.match(logoutSource, /refreshToken && \(!success \|\| !accessToken\)/);
  assert.match(logoutSource, /renewCustomerSessionSingleFlight\(refreshToken\)/);
  assert.match(logoutSource, /revokeCustomerSession\(renewal\.payload\.accessToken\)/);
  assert.doesNotMatch(logoutSource, /accessToken:\s*renewal/);
});
