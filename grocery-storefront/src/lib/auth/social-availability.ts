import 'server-only';

import {
  hasCustomerAuthBffSecret,
  normalizeCustomerAuthGraphqlUrl,
  normalizeGoogleClientId,
} from '@/lib/auth/google-oauth';

export interface SocialAuthProviders {
  google: boolean;
  facebook: boolean;
}

// Provider visibility is evaluated while rendering
// the auth page so the provider section is laid out from the first paint
// instead of popping in (and pushing the form down) after client discovery.
export function getSocialAuthAvailability(): SocialAuthProviders {
  const bffReady = hasCustomerAuthBffSecret(process.env.CUSTOMER_AUTH_BFF_SECRET)
    && Boolean(normalizeCustomerAuthGraphqlUrl(process.env.CUSTOMER_AUTH_GRAPHQL_URL));
  return {
    google: Boolean(
      bffReady && normalizeGoogleClientId(process.env.CUSTOMER_GOOGLE_CLIENT_ID),
    ),
    // Temporarily hidden until the Facebook sign-in rollout resumes.
    facebook: false,
  };
}
