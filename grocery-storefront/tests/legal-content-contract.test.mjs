import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

// The storefront's Terms version must match what the backend stamps on every
// P24 order (`termsVersion` in storefront-checkout.service.ts), so a dispute can
// be matched to the exact text the customer accepted.
const TERMS_VERSION = '2026-09-25';

const messages = Object.fromEntries(
  ['pl', 'en'].map((locale) => [
    locale,
    JSON.parse(readFileSync(new URL(`../src/messages/${locale}.json`, import.meta.url), 'utf8')),
  ])
);

for (const locale of ['pl', 'en']) {
  test(`${locale}: terms carry the accepted version and the sections P24 and consumer law require`, () => {
    const legal = messages[locale].legal;
    assert.match(legal.termsEffectiveDate, new RegExp(TERMS_VERSION));
    for (const key of [
      'termsSellerTitle',
      'termsOrdersContent',
      'termsPaymentsContent',
      'termsWithdrawalTitle',
      'termsWithdrawalContent',
      'termsWithdrawalForm',
      'termsComplaintsTitle',
      'termsComplaintsContent',
      'termsDisputesContent',
    ]) {
      assert.ok(typeof legal[key] === 'string' && legal[key].trim().length > (key.endsWith('Title') ? 3 : 40), `legal.${key} missing`);
    }
    assert.match(legal.termsPaymentsContent, /Przelewy24/);
    assert.match(legal.termsPaymentsContent, /PayPro S\.A\./);
    assert.match(legal.termsWithdrawalContent, /14/);
    assert.match(legal.termsComplaintsContent, /14/);
    // The EU ODR platform was discontinued on 2025-07-20 (Regulation (EU) 2024/3228); never link it.
    assert.doesNotMatch(legal.termsDisputesContent, /consumers\/odr|platform(?:y|a) ODR/i);
    assert.match(legal.termsDisputesContent, /uokik\.gov\.pl/);
  });

  test(`${locale}: privacy names legal bases, the payment operator as recipient, retention and the supervisory authority`, () => {
    const legal = messages[locale].legal;
    assert.match(legal.privacyLegalBasisContent, /6 ?\(1\)\(b\)|6 ust\. 1 lit\. b/);
    assert.match(legal.privacyRecipientsContent, /PayPro S\.A\./);
    assert.ok(legal.privacyRetentionContent.length > 40);
    assert.match(legal.privacyRightsContent, /uodo\.gov\.pl/);
  });

  test(`${locale}: contact page copy exists for every rendered label`, () => {
    const contact = messages[locale].contact;
    for (const key of ['title', 'intro', 'sellerTitle', 'sellerUnavailable', 'registeredAddress', 'complaintAddress', 'storeTitle', 'storeAddress', 'hoursTitle', 'closed', 'contactTitle', 'email', 'phone', 'contactUnavailable']) {
      assert.ok(typeof contact[key] === 'string' && contact[key].trim(), `contact.${key} missing`);
    }
  });
}

test('the checkout button label matches the Terms wording about the obligation to pay', () => {
  assert.equal(messages.pl.checkout.placeOrder, 'Zamówienie z obowiązkiem zapłaty');
  assert.match(messages.pl.legal.termsOrdersContent, /Zamówienie z obowiązkiem zapłaty/);
});
