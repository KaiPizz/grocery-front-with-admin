import {
  createHash,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

export const FACEBOOK_OAUTH_STATE_COOKIE_NAME = 'grocery_facebook_oauth_state';
export const FACEBOOK_OAUTH_STATE_MAX_AGE_SECONDS = 5 * 60;
export const FACEBOOK_LINK_STATE_COOKIE_NAME = 'grocery_facebook_link_state';
export const FACEBOOK_OAUTH_MAX_CONSUMED_STATES = 10_000;

const FACEBOOK_APP_ID_PATTERN = /^[0-9]{5,32}$/;
const FACEBOOK_GRAPH_VERSION_PATTERN = /^v[1-9][0-9]{0,2}\.(?:0|[1-9][0-9]?)$/;
const FACEBOOK_STATE_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const consumedStateDigests = new Map<string, number>();

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

export function consumeFacebookOAuthState(
  cookieState: string | null | undefined,
  submittedState: string | null | undefined,
  now = Date.now(),
): boolean {
  if (
    !cookieState
    || !submittedState
    || !FACEBOOK_STATE_PATTERN.test(cookieState)
    || !FACEBOOK_STATE_PATTERN.test(submittedState)
  ) {
    return false;
  }

  const cookieBuffer = Buffer.from(cookieState, 'ascii');
  const submittedBuffer = Buffer.from(submittedState, 'ascii');
  if (
    cookieBuffer.length !== submittedBuffer.length
    || !timingSafeEqual(cookieBuffer, submittedBuffer)
  ) {
    return false;
  }

  for (const [digest, expiresAt] of consumedStateDigests) {
    if (expiresAt <= now) consumedStateDigests.delete(digest);
  }

  const digest = createHash('sha256').update(cookieBuffer).digest('base64url');
  if (consumedStateDigests.has(digest)) return false;

  // This bounded in-process replay cache is suitable for the current single
  // storefront process. Move it to a shared Redis/DB atomic consume when the
  // storefront runs multiple instances. Fail closed instead of growing memory.
  if (consumedStateDigests.size >= FACEBOOK_OAUTH_MAX_CONSUMED_STATES) {
    return false;
  }

  consumedStateDigests.set(
    digest,
    now + FACEBOOK_OAUTH_STATE_MAX_AGE_SECONDS * 1000,
  );
  return true;
}
