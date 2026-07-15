import { randomBytes } from 'node:crypto';

import { PendingOAuthChallengeStore } from './oauth-challenge-store.js';

export const FACEBOOK_OAUTH_STATE_COOKIE_NAME = 'grocery_facebook_oauth_state';
export const FACEBOOK_OAUTH_STATE_MAX_AGE_SECONDS = 5 * 60;
export const FACEBOOK_LINK_STATE_COOKIE_NAME = 'grocery_facebook_link_state';
export const FACEBOOK_OAUTH_MAX_PENDING_STATES = 10_000;

const FACEBOOK_APP_ID_PATTERN = /^[0-9]{5,32}$/;
const FACEBOOK_GRAPH_VERSION_PATTERN = /^v[1-9][0-9]{0,2}\.(?:0|[1-9][0-9]?)$/;
type FacebookOAuthPurpose = 'login' | 'link';

const facebookLoginStates = new PendingOAuthChallengeStore(
  'customer-facebook-login',
  FACEBOOK_OAUTH_MAX_PENDING_STATES,
  FACEBOOK_OAUTH_STATE_MAX_AGE_SECONDS * 1000,
);
const facebookLinkStates = new PendingOAuthChallengeStore(
  'customer-facebook-link',
  FACEBOOK_OAUTH_MAX_PENDING_STATES,
  FACEBOOK_OAUTH_STATE_MAX_AGE_SECONDS * 1000,
);

export function normalizeFacebookAppId(value: string | undefined): string | null {
  const appId = value?.trim() ?? '';
  return FACEBOOK_APP_ID_PATTERN.test(appId) ? appId : null;
}

export function normalizeFacebookGraphVersion(value: string | undefined): string | null {
  const version = value?.trim() ?? '';
  return FACEBOOK_GRAPH_VERSION_PATTERN.test(version) ? version : null;
}

export function createFacebookOAuthState(): string {
  return randomBytes(32).toString('base64url');
}

export function issueFacebookOAuthState(
  purpose: FacebookOAuthPurpose,
  now = Date.now(),
): string | null {
  const store = purpose === 'login' ? facebookLoginStates : facebookLinkStates;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const state = createFacebookOAuthState();
    if (store.issue(state, now)) return state;
  }
  return null;
}

export function consumeFacebookOAuthState(
  purpose: FacebookOAuthPurpose,
  cookieState: string | null | undefined,
  submittedState: string | null | undefined,
  now = Date.now(),
): boolean {
  const store = purpose === 'login' ? facebookLoginStates : facebookLinkStates;
  return store.consume(cookieState, submittedState, now);
}
