import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

import {
  buildFacebookPixelScript,
  buildGoogleAnalyticsScript,
  buildGoogleAnalyticsUrl,
  buildGoogleTagManagerScript,
  buildHotjarScript,
  serializeInlineScriptValue,
} from '../src/lib/tracking-scripts.ts';

const MALICIOUS_IDS = [
  `quote'\";globalThis.__trackingInjected=true;//`,
  '</script><script>globalThis.__trackingInjected=true</script>',
  'line one\nglobalThis.__trackingInjected=true',
  `x');globalThis.__trackingInjected=true;//`,
];

const trackingComponentSource = readFileSync(
  new URL('../src/components/TrackingScripts.tsx', import.meta.url),
  'utf8',
);

function createScriptContext() {
  const insertedScripts = [];
  const firstScript = {
    parentNode: {
      insertBefore(script) {
        insertedScripts.push(script);
      },
    },
  };
  const head = {
    appendChild(script) {
      insertedScripts.push(script);
    },
  };
  const document = {
    createElement() {
      return {};
    },
    getElementsByTagName(tagName) {
      return tagName === 'head' ? [head] : [firstScript];
    },
  };
  const context = vm.createContext({
    __trackingInjected: false,
    document,
    insertedScripts,
  });
  context.window = context;
  context.globalThis = context;
  return context;
}

function executeInlineScript(script) {
  assert.doesNotMatch(script, /<\/script/i);
  const context = createScriptContext();
  vm.runInContext(script, context);
  assert.equal(context.__trackingInjected, false);
  return context;
}

test('inline value serialization survives quotes, newlines and script end tags', () => {
  for (const value of MALICIOUS_IDS) {
    const literal = serializeInlineScriptValue(value);
    assert.doesNotMatch(literal, /<\/script/i);
    assert.equal(vm.runInNewContext(literal), value);
  }
});

test('the tracking component delegates every config value to a safe builder', () => {
  for (const builderName of [
    'buildFacebookPixelScript',
    'buildGoogleAnalyticsScript',
    'buildGoogleAnalyticsUrl',
    'buildGoogleTagManagerScript',
    'buildHotjarScript',
  ]) {
    assert.match(trackingComponentSource, new RegExp(`${builderName}\\(tracking\\.`));
  }
  assert.doesNotMatch(trackingComponentSource, /\$\{tracking\./);
  assert.doesNotMatch(trackingComponentSource, /dangerouslySetInnerHTML/);
});

test('tracking providers treat malicious IDs as data instead of executable code', () => {
  for (const maliciousId of MALICIOUS_IDS) {
    const facebookContext = executeInlineScript(buildFacebookPixelScript(maliciousId));
    assert.equal(Array.from(facebookContext.fbq.queue[0])[1], maliciousId);

    const analyticsContext = executeInlineScript(buildGoogleAnalyticsScript(maliciousId));
    assert.equal(Array.from(analyticsContext.dataLayer[1])[1], maliciousId);

    const tagManagerContext = executeInlineScript(buildGoogleTagManagerScript(maliciousId));
    assert.equal(
      tagManagerContext.insertedScripts[0].src,
      `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(maliciousId)}`,
    );

    const hotjarContext = executeInlineScript(buildHotjarScript(maliciousId));
    assert.equal(hotjarContext._hjSettings.hjid, maliciousId);
    assert.equal(
      hotjarContext.insertedScripts[0].src,
      `https://static.hotjar.com/c/hotjar-${encodeURIComponent(maliciousId)}.js?sv=6`,
    );
  }
});

test('Google Analytics loader URL encodes the configured measurement ID', () => {
  for (const measurementId of MALICIOUS_IDS) {
    const url = new URL(buildGoogleAnalyticsUrl(measurementId));
    assert.equal(url.origin, 'https://www.googletagmanager.com');
    assert.equal(url.pathname, '/gtag/js');
    assert.equal(url.searchParams.get('id'), measurementId);
    assert.equal([...url.searchParams.keys()].join(','), 'id');
  }
});

test('known provider IDs keep their expected runtime values and destinations', () => {
  const facebookContext = executeInlineScript(buildFacebookPixelScript('1234567890'));
  assert.deepEqual(
    Array.from(facebookContext.fbq.queue, (entry) => Array.from(entry)),
    [['init', '1234567890'], ['track', 'PageView']],
  );

  const analyticsContext = executeInlineScript(buildGoogleAnalyticsScript('G-ADMINSEO1'));
  assert.equal(Array.from(analyticsContext.dataLayer[1])[1], 'G-ADMINSEO1');
  assert.equal(buildGoogleAnalyticsUrl('G-ADMINSEO1'), 'https://www.googletagmanager.com/gtag/js?id=G-ADMINSEO1');

  const tagManagerContext = executeInlineScript(buildGoogleTagManagerScript('GTM-ADMINSEO'));
  assert.equal(
    tagManagerContext.insertedScripts[0].src,
    'https://www.googletagmanager.com/gtm.js?id=GTM-ADMINSEO',
  );

  const hotjarContext = executeInlineScript(buildHotjarScript('999999'));
  assert.equal(hotjarContext._hjSettings.hjid, 999999);
  assert.equal(
    hotjarContext.insertedScripts[0].src,
    'https://static.hotjar.com/c/hotjar-999999.js?sv=6',
  );
});
