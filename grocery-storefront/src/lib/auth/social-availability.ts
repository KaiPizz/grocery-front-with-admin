import 'server-only';

import { normalizeFacebookAppId, normalizeFacebookGraphVersion } from '@/lib/auth/facebook-oauth';
import {
  hasCustomerAuthBffSecret,
  normalizeCustomerAuthGraphqlUrl,
  normalizeGoogleClientId,
} from '@/lib/auth/google-oauth';

export interface SocialAuthProviders {
  google: boolean;
  facebook: boolean;
}

// Same gates as /api/auth/{google,facebook}/start, evaluated while rendering
// the auth page so the provider section is laid out from the first paint
// instead of popping in (and pushing the form down) after client discovery.
export function getSocialAuthAvailability(): SocialAuthProviders {
  const bffReady = hasCustomerAuthBffSecret(process.env.CUSTOMER_AUTH_BFF_SECRET)
    && Boolean(normalizeCustomerAuthGraphqlUrl(process.env.CUSTOMER_AUTH_GRAPHQL_URL));
  return {
    google: Boolean(
      bffReady && normalizeGoogleClientId(process.env.CUSTOMER_GOOGLE_CLIENT_ID),
    ),
    facebook: Boolean(
      bffReady
      && normalizeFacebookAppId(process.env.CUSTOMER_FACEBOOK_APP_ID)
      && normalizeFacebookGraphVersion(process.env.CUSTOMER_FACEBOOK_GRAPH_VERSION),
    ),
  };
}
