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
      customer { id email fullName phone createdAt }
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
      customer { id email fullName phone createdAt }
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
      customer { id email fullName phone createdAt }
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
      customer { id email fullName phone emailVerified createdAt }
      errors { field message code }
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
    me { id email fullName phone emailVerified createdAt }
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

async function privateCustomerAuthGraphqlRequest<TData>(
  query: string,
  variables: Record<string, unknown>,
  locale?: 'pl' | 'en',
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
        ...(locale ? { 'x-locale': locale } : {}),
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
    locale,
  );
  return {
    payload: result.payload.data?.customerFacebookAuth ?? null,
    error: firstGraphqlError(result.payload),
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
