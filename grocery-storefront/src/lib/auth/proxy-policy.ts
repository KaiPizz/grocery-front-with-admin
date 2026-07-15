import { parse, visit } from 'graphql';

const BLOCKED_AUTH_FIELDS = new Set([
  'customerLogin',
  'customerRegister',
  'customerGoogleAuth',
  'customerFacebookAuth',
  'customerCredentialStepUp',
  'customerGoogleLink',
  'customerFacebookLink',
  'customerLoginProviderUnlink',
  'customerAccessTokenCreate',
  'customerAccessTokenRenew',
  'customerAccessTokenDelete',
  'forgotPassword',
  'resetPassword',
  'verifyEmail',
  'resendVerification',
  'customerActivate',
  'changePassword',
  'logout',
  'customerAccountDelete',
  'refreshToken',
  'accessToken',
  'metafieldsSet',
  'metafieldDelete',
]);

export function containsBlockedAuthField(query: string): boolean {
  let blocked = false;
  const document = parse(query);
  visit(document, {
    Field(node) {
      if (BLOCKED_AUTH_FIELDS.has(node.name.value)) {
        blocked = true;
      }
    },
  });
  return blocked;
}
