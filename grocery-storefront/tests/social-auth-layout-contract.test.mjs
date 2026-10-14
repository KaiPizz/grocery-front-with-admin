import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const loginPageSource = read('../src/app/[locale]/(shop)/login/page.tsx');
const registerPageSource = read('../src/app/[locale]/(shop)/register/page.tsx');
const availabilitySource = read('../src/lib/auth/social-availability.ts');
const authFormSource = read('../src/components/auth/AuthForm.tsx');
const socialComponentSource = read('../src/components/auth/SocialSignIn.tsx');
const googleSource = read('../src/components/auth/GoogleSignIn.tsx');
const facebookSource = read('../src/components/auth/FacebookSignIn.tsx');

test('login and register pages decide provider availability on the server per request', () => {
  for (const [source, mode] of [[loginPageSource, 'login'], [registerPageSource, 'register']]) {
    assert.doesNotMatch(source, /'use client'/);
    assert.match(source, /import \{ connection \} from 'next\/server'/);
    assert.match(source, /await connection\(\)/);
    assert.match(source, /const socialProviders = getSocialAuthAvailability\(\)/);
    assert.match(source, new RegExp(`<AuthForm mode="${mode}" socialProviders=\\{socialProviders\\} />`));
  }
});

test('server availability mirrors the start routes and exposes booleans only', () => {
  assert.match(availabilitySource, /^import 'server-only';/);
  assert.match(availabilitySource, /normalizeGoogleClientId\(process\.env\.CUSTOMER_GOOGLE_CLIENT_ID\)/);
  assert.match(availabilitySource, /normalizeFacebookAppId\(process\.env\.CUSTOMER_FACEBOOK_APP_ID\)/);
  assert.match(availabilitySource, /normalizeFacebookGraphVersion\(process\.env\.CUSTOMER_FACEBOOK_GRAPH_VERSION\)/);
  assert.match(availabilitySource, /hasCustomerAuthBffSecret\(process\.env\.CUSTOMER_AUTH_BFF_SECRET\)/);
  assert.match(availabilitySource, /normalizeCustomerAuthGraphqlUrl\(process\.env\.CUSTOMER_AUTH_GRAPHQL_URL\)/);
  assert.match(availabilitySource, /google: Boolean\(/);
  assert.match(availabilitySource, /facebook: Boolean\(/);
  assert.doesNotMatch(availabilitySource, /clientId:|appId:|SECRET[^)]*:/);
});

test('social section reserves its space from the first paint', () => {
  assert.match(authFormSource, /<SocialSignIn mode=\{mode\} returnTo=\{returnTo\} providers=\{socialProviders\} \/>/);
  assert.match(socialComponentSource, /useState\(providers\.google\)/);
  assert.match(socialComponentSource, /useState\(providers\.facebook\)/);
  assert.match(socialComponentSource, /\{providers\.google && \(/);
  assert.match(socialComponentSource, /\{providers\.facebook && \(/);
  assert.equal((socialComponentSource.match(/role="separator"/g) ?? []).length, 1);
});

test('provider buttons hide only after discovery says disabled', () => {
  for (const source of [googleSource, facebookSource]) {
    assert.match(source, /if \(providerEnabled === null\) return;\s*onAvailabilityChange\(providerEnabled\)/);
    assert.match(source, /if \(providerEnabled === false\) return null;/);
    assert.doesNotMatch(source, /providerEnabled !== true \|\| !config\) return null/);
  }
});

test('Google button keeps a fixed-height placeholder until the Google frame has loaded', () => {
  assert.match(googleSource, /const \[buttonReady, setButtonReady\] = useState\(false\)/);
  assert.match(googleSource, /className="relative h-11 w-full/);
  assert.match(googleSource, /\{!buttonReady && \(/);
  assert.match(googleSource, /buttonReady \? 'opacity-100' : 'opacity-0'/);
  assert.match(googleSource, /addEventListener\('load', markReady, \{ once: true \}\)/);
  assert.match(googleSource, /new MutationObserver/);
  assert.match(googleSource, /setTimeout\(markReady, GOOGLE_BUTTON_REVEAL_FALLBACK_MS\)/);
});
