import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const privacyPageSource = read('../src/app/[locale]/(shop)/privacy/page.tsx');
const authFormSource = read('../src/components/auth/AuthForm.tsx');
const securityPanelSource = read('../src/components/account/SecurityPanel.tsx');
const enMessages = JSON.parse(read('../src/messages/en.json'));
const plMessages = JSON.parse(read('../src/messages/pl.json'));

test('privacy page publishes a stable social-data deletion URL and configured contact', () => {
  assert.match(privacyPageSource, /useStorefrontConfig\(\)/);
  assert.match(privacyPageSource, /siteConfig\?\.general\.email/);
  assert.match(privacyPageSource, /id="data-deletion"/);
  assert.ok(privacyPageSource.includes('href={`mailto:${contactEmail}`}'));
  assert.doesNotMatch(
    privacyPageSource,
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
    'privacy contact must come from storefront configuration',
  );
});

test('PL and EN disclose provider data handling without claiming a missing contact form', () => {
  const expectations = [
    {
      messages: enMessages,
      notStored: /not stored/i,
      contactForm: /contact form/i,
    },
    {
      messages: plMessages,
      notStored: /nie są przechowywane/i,
      contactForm: /formularz(?:a|u|em)? kontaktow/i,
    },
  ];

  for (const { messages, notStored, contactForm } of expectations) {
    const socialCopy = messages.legal.privacySocialContent;
    const deletionCopy = messages.legal.privacyDeletionInstructions;
    assert.match(socialCopy, /Google/i);
    assert.match(socialCopy, /Facebook/i);
    assert.match(socialCopy, notStored);
    assert.match(socialCopy, /token/i);
    assert.match(deletionCopy, /Google/i);
    assert.match(deletionCopy, /Facebook/i);
    assert.doesNotMatch(messages.legal.privacyContactContent, contactForm);
    assert.ok(messages.legal.privacyDeletionContact.length > 0);
    assert.ok(messages.legal.privacyContactUnavailable.length > 0);
  }
});

test('authentication and account security link visibly to legal and deletion guidance', () => {
  assert.match(authFormSource, /href="\/terms"/);
  assert.match(authFormSource, /href="\/privacy"/);
  assert.match(authFormSource, /legalNoticePrivacy/);
  assert.match(securityPanelSource, /href="\/privacy#data-deletion"/);
  assert.match(securityPanelSource, /dataDeletionLink/);

  for (const messages of [enMessages, plMessages]) {
    assert.ok(messages.auth.legalNoticeTerms.length > 0);
    assert.ok(messages.auth.legalNoticePrivacy.length > 0);
    assert.match(messages.account.dataDeletionHelp, /Google/i);
    assert.match(messages.account.dataDeletionHelp, /Facebook/i);
  }
});
