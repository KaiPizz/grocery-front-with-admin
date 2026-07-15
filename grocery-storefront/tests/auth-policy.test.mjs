import { test } from 'node:test';
import assert from 'node:assert/strict';

import { containsBlockedAuthField } from '../src/lib/auth/proxy-policy.ts';
import { validateJsonMutationRequest } from '../src/lib/auth/request-security.ts';
import {
  isDefinitiveAuthenticationFailure,
  isGraphqlAuthenticationFailure,
} from '../src/lib/auth/authentication-policy.ts';

function requestFixture(headers = {}) {
  return {
    headers: new Headers({ 'content-type': 'application/json', ...headers }),
    nextUrl: new URL('https://shop.example.test/api/graphql'),
  };
}

test('GraphQL proxy policy blocks direct and aliased token operations', () => {
  for (const query of [
    'mutation { customerLogin(input: {email: "a", password: "b"}) { success } }',
    'mutation { signIn: customerLogin(input: {email: "a", password: "b"}) { success } }',
    'mutation { customerGoogleAuth(input: {token: "oauth"}) { success } }',
    'mutation { customerFacebookAuth(input: {token: "oauth"}) { success } }',
    'mutation { customerAccessTokenCreate(input: {email: "a", password: "b"}) { success } }',
    'mutation { customerAccessTokenRenew(input: {refreshToken: "x"}) { success } }',
    'mutation { forgotPassword(input: {email: "a@example.test"}) { success } }',
    'mutation { resetPassword(input: {token: "x", newPassword: "password"}) { success } }',
    'mutation { verifyEmail(token: "x") { success } }',
    'mutation { resendVerification(locale: "en") { success } }',
    'mutation { customerActivate(activationToken: "x") { success } }',
    'mutation { changePassword(input: {currentPassword: "old", newPassword: "new-password"}) { success } }',
    'mutation { customerAccountDelete { success } }',
    'mutation { logout { success } }',
    'query { viewer { accessToken } }',
    'fragment Secret on AuthPayload { refreshToken } query { viewer { ...Secret } }',
    'mutation { metafieldsSet(metafields: []) { errors { message } } }',
    'mutation { metafieldDelete(ownerId: "x", key: "private") { success } }',
  ]) {
    assert.equal(containsBlockedAuthField(query), true, query);
  }
});

test('GraphQL proxy policy allows normal customer account operations', () => {
  assert.equal(containsBlockedAuthField('query { customerAddresses { id city } }'), false);
  assert.equal(
    containsBlockedAuthField('query { products(channel: "test", first: 10) { totalCount } }'),
    false,
  );
});

test('JSON mutation policy enforces content type, size and same origin', () => {
  assert.equal(validateJsonMutationRequest(requestFixture()), null);
  assert.equal(validateJsonMutationRequest(requestFixture({ origin: 'https://shop.example.test' })), null);
  assert.equal(validateJsonMutationRequest(requestFixture({
    origin: 'https://public.example.test',
    host: 'public.example.test',
    'x-forwarded-proto': 'https',
  })), null);
  assert.match(validateJsonMutationRequest(requestFixture({
    origin: 'https://evil.example',
    host: 'shop.example.test',
    'x-forwarded-host': 'evil.example',
  })) ?? '', /origin/i);
  assert.match(validateJsonMutationRequest(requestFixture({ origin: 'https://evil.example' })) ?? '', /origin/i);
  assert.match(validateJsonMutationRequest(requestFixture({ 'sec-fetch-site': 'cross-site' })) ?? '', /cross-site/i);
  assert.match(validateJsonMutationRequest(requestFixture({ 'content-type': 'text/plain' })) ?? '', /content-type/i);
  assert.match(validateJsonMutationRequest(requestFixture({ 'content-length': String(1024 * 1024 + 1) })) ?? '', /large/i);
});

test('GraphQL HTTP 200 authentication errors trigger refresh independent of locale', () => {
  assert.equal(isDefinitiveAuthenticationFailure({
    status: 200,
    errorCode: 'UNAUTHENTICATED',
    errorStatus: 401,
    error: 'Nieprawidłowy lub wygasły token',
  }), true);
  assert.equal(isDefinitiveAuthenticationFailure({
    status: 200,
    errorCode: 'BAD_USER_INPUT',
    errorStatus: 400,
    error: 'Current password is incorrect.',
  }), false);
  assert.equal(isDefinitiveAuthenticationFailure({
    status: 502,
    error: 'Authentication service returned an invalid response.',
  }), false);
  assert.equal(isGraphqlAuthenticationFailure(200, [{
    message: 'Internal server error',
    extensions: {
      code: 'INTERNAL_SERVER_ERROR',
      originalError: {
        statusCode: 401,
        message: 'Nieprawidłowy lub wygasły token',
      },
    },
  }]), true);
});
