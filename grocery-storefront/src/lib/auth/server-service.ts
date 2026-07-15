import 'server-only';

import type { CustomerProfile } from '@/types';
import { resolveChannel } from '@/lib/channel';
import {
  normalizeCustomerAuthBffSecret,
  normalizeCustomerAuthGraphqlUrl,
} from './google-oauth';
import {
  authGraphqlRequest,
  firstGraphqlError,
  firstGraphqlErrorCode,
  firstGraphqlErrorStatus,
  type UpstreamGraphqlPayload,
} from './upstream';

export const CUSTOMER_LOGIN_OPERATION = `
  mutation CustomerLogin($input: LoginInput!) {
    customerLogin(input: $input) {
      accessToken
      refreshToken
      expiresIn
      success
      message
      customer { id email fullName phone emailVerified createdAt hasPassword linkedProviders }
      errors { field message code }
    }
  }
`;

export const CUSTOMER_REGISTER_OPERATION = `
  mutation CustomerRegister($input: RegisterInput!) {
    customerRegister(input: $input) {
      accessToken
      refreshToken
      expiresIn
      success
      message
      customer { id email fullName phone emailVerified createdAt hasPassword linkedProviders }
      errors { field message code }
    }
  }
`;

export const CUSTOMER_GOOGLE_LOGIN_OPERATION = `
  mutation CustomerGoogleLogin($input: OAuthLoginInput!) {
    customerGoogleAuth(input: $input) {
      accessToken
      refreshToken
      expiresIn
      success
      message
      customer { id email fullName phone emailVerified createdAt hasPassword linkedProviders }
      errors { field message code }
    }
  }
`;

export const CUSTOMER_FACEBOOK_LOGIN_OPERATION = `
  mutation CustomerFacebookLogin($input: OAuthLoginInput!) {
    customerFacebookAuth(input: $input) {
      accessToken
      refreshToken
      expiresIn
      success
      message
      customer { id email fullName phone emailVerified createdAt hasPassword linkedProviders }
      errors { field message code }
    }
  }
`;

export const CUSTOMER_GOOGLE_LINK_OPERATION = `
  mutation CustomerGoogleLink($token: String!, $nonce: String!, $stepUpProof: String!) {
    customerGoogleLink(token: $token, nonce: $nonce, stepUpProof: $stepUpProof) {
      success
      message
    }
  }
`;

export const CUSTOMER_FACEBOOK_LINK_OPERATION = `
  mutation CustomerFacebookLink($token: String!, $stepUpProof: String!) {
    customerFacebookLink(token: $token, stepUpProof: $stepUpProof) {
      success
      message
    }
  }
`;

export const CUSTOMER_LOGIN_PROVIDER_UNLINK_OPERATION = `
  mutation CustomerLoginProviderUnlink($provider: String!, $stepUpProof: String!) {
    customerLoginProviderUnlink(provider: $provider, stepUpProof: $stepUpProof) {
      success
      message
    }
  }
`;

export const CUSTOMER_CREDENTIAL_STEP_UP_OPERATION = `
  mutation CustomerCredentialStepUp($currentPassword: String!) {
    customerCredentialStepUp(currentPassword: $currentPassword) {
      success
      message
      stepUpProof
      expiresIn
    }
  }
`;

export const CUSTOMER_RENEW_OPERATION = `
  mutation CustomerAccessTokenRenew($input: TokenRefreshInput!) {
    customerAccessTokenRenew(input: $input) {
      success
      accessToken
      refreshToken
      expiresIn
      errorCode
      message
    }
  }
`;

export const CUSTOMER_LOGOUT_OPERATION = `
  mutation CustomerAccessTokenDelete {
    customerAccessTokenDelete {
      success
      message
    }
  }
`;

export const CUSTOMER_SESSION_OPERATION = `
  query CustomerSession {
    me { id email fullName phone emailVerified createdAt hasPassword linkedProviders }
  }
`;

export const CUSTOMER_FORGOT_PASSWORD_OPERATION = `
  mutation CustomerForgotPassword($input: ForgotPasswordInput!) {
    forgotPassword(input: $input) {
      success
      message
    }
  }
`;

export const CUSTOMER_RESET_PASSWORD_OPERATION = `
  mutation CustomerResetPassword($input: ResetPasswordInput!) {
    resetPassword(input: $input) {
      success
      message
      errors { field message code }
    }
  }
`;

export const CUSTOMER_VERIFY_EMAIL_OPERATION = `
  mutation CustomerVerifyEmail($token: String!) {
    verifyEmail(token: $token) {
      success
      message
      requiresPasswordReset
    }
  }
`;

export const CUSTOMER_CHANGE_PASSWORD_OPERATION = `
  mutation CustomerChangePassword($input: ChangePasswordInput!) {
    changePassword(input: $input) {
      success
      message
      errors { field message code }
    }
  }
`;

export const CUSTOMER_ACCOUNT_DELETE_OPERATION = `
  mutation CustomerAccountDelete($password: String!) {
    customerAccountDelete(password: $password) {
      success
      message
    }
  }
`;

export const CUSTOMER_RESEND_VERIFICATION_OPERATION = `
  mutation CustomerResendVerification($locale: String) {
    resendVerification(locale: $locale) {
      success
      message
    }
  }
`;

export interface AuthErrorPayload {
  field?: string | null;
  message: string;
  code?: string | null;
}

export interface TokenPayload {
  success: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  expiresIn: number | null;
  errorCode?: string | null;
  message: string | null;
}

export interface LoginPayload extends TokenPayload {
  customer: CustomerProfile | null;
  errors: AuthErrorPayload[] | null;
}

interface LoginResult {
  customerLogin: LoginPayload | null;
}

interface RegisterResult {
  customerRegister: LoginPayload | null;
}

interface GoogleLoginResult {
  customerGoogleAuth: LoginPayload | null;
}

interface FacebookLoginResult {
  customerFacebookAuth: LoginPayload | null;
}

export interface CustomerProviderActionPayload {
  success: boolean;
  message: string | null;
}

export interface CustomerCredentialStepUpPayload {
  success: boolean;
  message: string | null;
  stepUpProof: string | null;
  expiresIn: number | null;
}

interface GoogleLinkResult {
  customerGoogleLink: CustomerProviderActionPayload | null;
}

interface FacebookLinkResult {
  customerFacebookLink: CustomerProviderActionPayload | null;
}

interface LoginProviderUnlinkResult {
  customerLoginProviderUnlink: CustomerProviderActionPayload | null;
}

interface CredentialStepUpResult {
  customerCredentialStepUp: CustomerCredentialStepUpPayload | null;
}

interface RenewResult {
  customerAccessTokenRenew: TokenPayload | null;
}

interface SessionResult {
  me: CustomerProfile | null;
}

interface LogoutResult {
  customerAccessTokenDelete: {
    success: boolean;
    message: string | null;
  } | null;
}

interface PasswordActionPayload {
  success: boolean;
  message: string | null;
  errors?: AuthErrorPayload[] | null;
  requiresPasswordReset?: boolean;
}

interface ForgotPasswordResult {
  forgotPassword: PasswordActionPayload | null;
}

interface ResetPasswordResult {
  resetPassword: PasswordActionPayload | null;
}

interface VerifyEmailResult {
  verifyEmail: PasswordActionPayload | null;
}

interface ChangePasswordResult {
  changePassword: PasswordActionPayload | null;
}

interface AccountDeleteResult {
  customerAccountDelete: PasswordActionPayload | null;
}

interface ResendVerificationResult {
  resendVerification: PasswordActionPayload | null;
}

async function privateCustomerAuthGraphqlRequest<TData>(
  query: string,
  variables: Record<string, unknown>,
  options: { locale?: 'pl' | 'en'; accessToken?: string } = {},
): Promise<{ payload: UpstreamGraphqlPayload<TData>; status: number }> {
  const endpoint = normalizeCustomerAuthGraphqlUrl(process.env.CUSTOMER_AUTH_GRAPHQL_URL);
  const bffSecret = normalizeCustomerAuthBffSecret(process.env.CUSTOMER_AUTH_BFF_SECRET);
  if (!endpoint || !bffSecret) {
    return {
      payload: { errors: [{ message: 'Social sign-in service is unavailable.' }] },
      status: 503,
    };
  }

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-channel': resolveChannel(process.env.NEXT_PUBLIC_SALON_SLUG),
        'x-customer-auth-bff-secret': bffSecret,
        ...(options.locale ? { 'x-locale': options.locale } : {}),
        ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
      },
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({ query, variables }),
    });
  } catch {
    return {
      payload: { errors: [{ message: 'Social sign-in service is unavailable.' }] },
      status: 503,
    };
  }

  let payload: UpstreamGraphqlPayload<TData> = {};
  try {
    payload = await response.json() as UpstreamGraphqlPayload<TData>;
  } catch {
    payload = { errors: [{ message: 'Social sign-in service returned an invalid response.' }] };
  }
  return { payload, status: response.status };
}

export async function loginCustomer(input: Record<string, unknown>) {
  const result = await authGraphqlRequest<LoginResult>(CUSTOMER_LOGIN_OPERATION, { input });
  return {
    payload: result.payload.data?.customerLogin ?? null,
    error: firstGraphqlError(result.payload),
    status: result.status,
  };
}

export async function registerCustomer(input: Record<string, unknown>) {
  const result = await authGraphqlRequest<RegisterResult>(CUSTOMER_REGISTER_OPERATION, { input });
  return {
    payload: result.payload.data?.customerRegister ?? null,
    error: firstGraphqlError(result.payload),
    status: result.status,
  };
}

export async function googleLoginCustomer(input: { token: string; nonce: string }) {
  const result = await privateCustomerAuthGraphqlRequest<GoogleLoginResult>(
    CUSTOMER_GOOGLE_LOGIN_OPERATION,
    { input },
  );
  return {
    payload: result.payload.data?.customerGoogleAuth ?? null,
    error: firstGraphqlError(result.payload),
    status: result.status,
  };
}

export async function facebookLoginCustomer(
  input: { token: string },
  locale: 'pl' | 'en',
) {
  const result = await privateCustomerAuthGraphqlRequest<FacebookLoginResult>(
    CUSTOMER_FACEBOOK_LOGIN_OPERATION,
    { input },
    { locale },
  );
  return {
    payload: result.payload.data?.customerFacebookAuth ?? null,
    error: firstGraphqlError(result.payload),
    status: result.status,
  };
}

function providerActionResult<TData>(
  result: { payload: UpstreamGraphqlPayload<TData>; status: number },
  payload: CustomerProviderActionPayload | null,
) {
  return {
    payload,
    error: firstGraphqlError(result.payload),
    errorCode: firstGraphqlErrorCode(result.payload),
    errorStatus: firstGraphqlErrorStatus(result.payload),
    status: result.status,
  };
}

export async function linkGoogleCustomer(
  accessToken: string,
  token: string,
  nonce: string,
  stepUpProof: string,
) {
  const result = await privateCustomerAuthGraphqlRequest<GoogleLinkResult>(
    CUSTOMER_GOOGLE_LINK_OPERATION,
    { token, nonce, stepUpProof },
    { accessToken },
  );
  return providerActionResult(
    result,
    result.payload.data?.customerGoogleLink ?? null,
  );
}

export async function linkFacebookCustomer(
  accessToken: string,
  token: string,
  stepUpProof: string,
) {
  const result = await privateCustomerAuthGraphqlRequest<FacebookLinkResult>(
    CUSTOMER_FACEBOOK_LINK_OPERATION,
    { token, stepUpProof },
    { accessToken },
  );
  return providerActionResult(
    result,
    result.payload.data?.customerFacebookLink ?? null,
  );
}

export async function unlinkCustomerLoginProvider(
  accessToken: string,
  provider: 'google' | 'facebook',
  stepUpProof: string,
) {
  const result = await privateCustomerAuthGraphqlRequest<LoginProviderUnlinkResult>(
    CUSTOMER_LOGIN_PROVIDER_UNLINK_OPERATION,
    { provider, stepUpProof },
    { accessToken },
  );
  return providerActionResult(
    result,
    result.payload.data?.customerLoginProviderUnlink ?? null,
  );
}

export async function stepUpCustomerCredential(
  accessToken: string,
  currentPassword: string,
) {
  const result = await privateCustomerAuthGraphqlRequest<CredentialStepUpResult>(
    CUSTOMER_CREDENTIAL_STEP_UP_OPERATION,
    { currentPassword },
    { accessToken },
  );
  return {
    payload: result.payload.data?.customerCredentialStepUp ?? null,
    error: firstGraphqlError(result.payload),
    errorCode: firstGraphqlErrorCode(result.payload),
    errorStatus: firstGraphqlErrorStatus(result.payload),
    status: result.status,
  };
}

export async function renewCustomerSession(refreshToken: string) {
  const result = await authGraphqlRequest<RenewResult>(CUSTOMER_RENEW_OPERATION, {
    input: { refreshToken },
  });
  return {
    payload: result.payload.data?.customerAccessTokenRenew ?? null,
    error: firstGraphqlError(result.payload),
    status: result.status,
  };
}

export async function loadCustomerSession(accessToken: string) {
  const result = await authGraphqlRequest<SessionResult>(
    CUSTOMER_SESSION_OPERATION,
    undefined,
    accessToken,
  );
  return {
    customer: result.payload.data?.me ?? null,
    error: firstGraphqlError(result.payload),
    errorCode: firstGraphqlErrorCode(result.payload),
    errorStatus: firstGraphqlErrorStatus(result.payload),
    status: result.status,
  };
}

export async function revokeCustomerSession(accessToken: string) {
  const result = await authGraphqlRequest<LogoutResult>(
    CUSTOMER_LOGOUT_OPERATION,
    undefined,
    accessToken,
  );
  return {
    payload: result.payload.data?.customerAccessTokenDelete ?? null,
    error: firstGraphqlError(result.payload),
    status: result.status,
  };
}

export async function requestCustomerPasswordReset(email: string, locale: 'pl' | 'en') {
  const result = await authGraphqlRequest<ForgotPasswordResult>(
    CUSTOMER_FORGOT_PASSWORD_OPERATION,
    { input: { email, locale } },
  );
  return {
    payload: result.payload.data?.forgotPassword ?? null,
    error: firstGraphqlError(result.payload),
    status: result.status,
  };
}

export async function resetCustomerPassword(token: string, newPassword: string) {
  const result = await authGraphqlRequest<ResetPasswordResult>(
    CUSTOMER_RESET_PASSWORD_OPERATION,
    { input: { token, newPassword } },
  );
  return {
    payload: result.payload.data?.resetPassword ?? null,
    error: firstGraphqlError(result.payload),
    status: result.status,
  };
}

export async function verifyCustomerEmail(token: string) {
  const result = await authGraphqlRequest<VerifyEmailResult>(
    CUSTOMER_VERIFY_EMAIL_OPERATION,
    { token },
  );
  return {
    payload: result.payload.data?.verifyEmail ?? null,
    error: firstGraphqlError(result.payload),
    status: result.status,
  };
}

export async function changeCustomerPassword(
  accessToken: string,
  currentPassword: string,
  newPassword: string,
) {
  const result = await authGraphqlRequest<ChangePasswordResult>(
    CUSTOMER_CHANGE_PASSWORD_OPERATION,
    { input: { currentPassword, newPassword } },
    accessToken,
  );
  return {
    payload: result.payload.data?.changePassword ?? null,
    error: firstGraphqlError(result.payload),
    errorCode: firstGraphqlErrorCode(result.payload),
    errorStatus: firstGraphqlErrorStatus(result.payload),
    status: result.status,
  };
}

export async function deleteCustomerAccount(
  accessToken: string,
  password: string,
) {
  const result = await authGraphqlRequest<AccountDeleteResult>(
    CUSTOMER_ACCOUNT_DELETE_OPERATION,
    { password },
    accessToken,
  );
  return {
    payload: result.payload.data?.customerAccountDelete ?? null,
    error: firstGraphqlError(result.payload),
    errorCode: firstGraphqlErrorCode(result.payload),
    errorStatus: firstGraphqlErrorStatus(result.payload),
    status: result.status,
  };
}

export async function resendCustomerVerification(
  accessToken: string,
  locale: 'pl' | 'en',
) {
  const result = await authGraphqlRequest<ResendVerificationResult>(
    CUSTOMER_RESEND_VERIFICATION_OPERATION,
    { locale },
    accessToken,
  );
  return {
    payload: result.payload.data?.resendVerification ?? null,
    error: firstGraphqlError(result.payload),
    errorCode: firstGraphqlErrorCode(result.payload),
    errorStatus: firstGraphqlErrorStatus(result.payload),
    status: result.status,
  };
}
