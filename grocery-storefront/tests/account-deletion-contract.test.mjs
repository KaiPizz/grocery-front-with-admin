import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const serverServiceSource = read('../src/lib/auth/server-service.ts');
const deleteRouteSource = read('../src/app/api/auth/delete-account/route.ts');
const deletePanelSource = read('../src/components/account/DeleteAccountPanel.tsx');
const securityPanelSource = read('../src/components/account/SecurityPanel.tsx');
const proxyPolicySource = read('../src/lib/auth/proxy-policy.ts');
const authStoreSource = read('../src/stores/auth-store.ts');
const enMessages = JSON.parse(read('../src/messages/en.json'));
const plMessages = JSON.parse(read('../src/messages/pl.json'));

test('account deletion uses a dedicated authenticated server operation', () => {
  assert.match(
    serverServiceSource,
    /mutation CustomerAccountDelete\(\$password: String!\)[\s\S]*customerAccountDelete\(password: \$password\)/,
  );
  assert.match(
    serverServiceSource,
    /deleteCustomerAccount\([\s\S]*CUSTOMER_ACCOUNT_DELETE_OPERATION,[\s\S]*\{ password \},[\s\S]*accessToken/,
  );
  assert.match(deleteRouteSource, /validateJsonMutationRequest\(request\)/);
  assert.match(deleteRouteSource, /readCustomerTokens\(request\)/);
  assert.match(deleteRouteSource, /Object\.keys\(input\)/);
  assert.match(deleteRouteSource, /keys\.length !== 1/);
  assert.match(deleteRouteSource, /keys\[0\] !== 'password'/);
  assert.doesNotMatch(deleteRouteSource, /emailConfirmation|profile\.email/);
});

test('account deletion refreshes once, preserves wrong-password sessions and clears success cookies', () => {
  assert.match(
    deleteRouteSource,
    /!result\.payload && isDefinitiveAuthenticationFailure\(result\)/,
  );
  assert.match(
    deleteRouteSource,
    /renewCustomerSessionSingleFlight\(tokens\.refreshToken\)/,
  );
  assert.match(deleteRouteSource, /isRefreshAlreadyRotated\(renewal\.payload\)/);
  assert.match(deleteRouteSource, /isDefinitiveRefreshFailure\(renewal\.payload\)/);
  assert.match(deleteRouteSource, /errorCode\?\.toUpperCase\(\) === 'TOO_MANY_REQUESTS'/);
  assert.match(deleteRouteSource, /status: rateLimited \? 429/);
  assert.match(
    deleteRouteSource,
    /wrong password must not sign the customer out[\s\S]*setRenewedCookies\(response, renewed, tokens\.refreshToken\)/i,
  );
  assert.match(
    deleteRouteSource,
    /Account deletion revokes every server session[\s\S]*clearCustomerCookies\(response\)/,
  );
  assert.match(
    deleteRouteSource,
    /catch \{[\s\S]*setRenewedCookies\(response, renewed, tokens\.refreshToken\)/,
  );
  assert.doesNotMatch(deleteRouteSource, /accessToken\s*:/);
  assert.doesNotMatch(deleteRouteSource, /refreshToken\s*:/);
});

test('danger zone requires explicit password capability and keeps email confirmation browser-only', () => {
  assert.match(securityPanelSource, /<DeleteAccountPanel profile=\{profile\} \/>/);
  assert.match(deletePanelSource, /profile\?\.hasPassword === true/);
  assert.match(
    deletePanelSource,
    /normalizeEmail\(emailConfirmation\) !== normalizeEmail\(profile\.email\)/,
  );
  assert.match(deletePanelSource, /fetch\('\/api\/auth\/delete-account'/);
  assert.match(deletePanelSource, /JSON\.stringify\(\{ password \}\)/);
  assert.match(
    deletePanelSource,
    /response\.status === 409 \|\| response\.status === 429/,
  );
  assert.match(deletePanelSource, /response\.status >= 500/);
  assert.match(deletePanelSource, /window\.location\.replace\(/);
  assert.doesNotMatch(deletePanelSource, /JSON\.stringify\([^)]*email/s);
  assert.match(deletePanelSource, /clearSession\(\)/);
  assert.match(authStoreSource, /clearSession: \(\) => \{[\s\S]*clearCustomerScopedState\(\)/);
  assert.doesNotMatch(deletePanelSource, /\/api\/graphql|Authorization/);
  assert.doesNotMatch(deletePanelSource, /localStorage|sessionStorage|googleId|facebookId|passwordHash/);
});

test('PL and EN copy accurately distinguishes erasure, anonymization and legal retention', () => {
  for (const messages of [plMessages, enMessages]) {
    for (const key of [
      'deleteAccountTitle',
      'deleteAccountDescription',
      'deleteAccountRetentionNotice',
      'deleteAccountConfirmationDescription',
      'deleteAccountEmailMismatch',
      'deleteAccountPasswordRequired',
      'deleteAccountFailed',
      'deleteAccountRetryLater',
      'deleteAccountTemporarilyUnavailable',
      'deleteAccountSuccess',
      'deleteAccountSocialOnly',
    ]) {
      assert.equal(typeof messages.account[key], 'string', key);
      assert.ok(messages.account[key].length > 0, key);
    }
  }
  assert.match(enMessages.account.deleteAccountRetentionNotice, /removed or anonymized/i);
  assert.match(enMessages.account.deleteAccountRetentionNotice, /may be retained/i);
  assert.match(plMessages.account.deleteAccountRetentionNotice, /usunięte lub zanonimizowane/i);
  assert.match(plMessages.account.deleteAccountRetentionNotice, /może zostać zachowana/i);
});

test('generic GraphQL proxy remains unable to invoke account deletion', () => {
  assert.match(proxyPolicySource, /'customerAccountDelete'/);
});
