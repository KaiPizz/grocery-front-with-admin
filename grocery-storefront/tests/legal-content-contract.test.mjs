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

// Kurier DPD copy (ADG, behind fulfillment.courier = 'dpd' + courierTermsVersion). The old keys stay
// byte-identical so Kenmito and a pickup-only ADG keep the text they render today.
const baseline = JSON.parse(readFileSync(new URL('./fixtures/legal-baseline.json', import.meta.url), 'utf8'));
const COURIER_LEGAL_KEYS = [
  'termsIntroCourier',
  'termsPaymentsContentCourier',
  'termsDeliveryTitleCourier',
  'termsDeliveryCourierSubtitle',
  'termsDeliveryPickupSubtitle',
  'termsDeliveryCourierContent',
  'termsDeliveryCutoffCourier',
  'termsWithdrawalContentCourier',
  'termsWithdrawalFormCourier',
  'termsComplaintsContentCourier',
  'privacyIntroCourier',
  'privacyDataContentCourier',
  'privacyRecipientsContentCourier',
  'termsEffectiveDateCourier',
];
const COURIER_FULFILLMENT_KEYS = [
  'pickupAndCourierService',
  'productCourierNotice',
  'productColdChainNotice',
  'cartCourierNotice',
  'cartColdChainNotice',
  'checkoutCourierNotice',
  'confirmationCourier',
];

for (const locale of ['pl', 'en']) {
  test(`${locale}: Kurier DPD copy exists and states prepayment, price, threshold and parcel limit`, () => {
    const { legal, fulfillment, cart } = messages[locale];
    for (const key of COURIER_LEGAL_KEYS) assert.ok(legal[key]?.trim(), `legal.${key} missing`);
    for (const key of COURIER_FULFILLMENT_KEYS) assert.ok(fulfillment[key]?.trim(), `fulfillment.${key} missing`);
    assert.match(cart.freeShippingRemainingCourier, /\{amount\}/);
    assert.match(legal.termsPaymentsContentCourier, /Przelewy24/);
    assert.match(legal.termsDeliveryCourierContent, /19[,.]99/);
    assert.match(legal.termsDeliveryCourierContent, /200/);
    assert.match(legal.termsDeliveryCourierContent, /31[,.]5/);
    assert.doesNotMatch(legal.termsDeliveryCourierContent, /CHỜ|TODO|\{cutoff\}/);
    assert.match(legal.termsDeliveryCutoffCourier, /\{cutoff\}/);
    assert.match(legal.termsEffectiveDateCourier, /\{date\}/);
    assert.match(legal.termsEffectiveDateCourier, /\{version\}/);
    assert.match(legal.privacyRecipientsContentCourier, /DPD Polska/);
    assert.match(legal.privacyRecipientsContentCourier, /5272616887/);
    assert.doesNotMatch(legal.privacyRecipientsContentCourier, /Royal Fashion/i);
    // No draft markers; the model withdrawal form is the one text with [blanks] for the customer to fill.
    const published = [
      ...COURIER_LEGAL_KEYS.filter((k) => k !== 'termsWithdrawalFormCourier').map((k) => legal[k]),
      ...COURIER_FULFILLMENT_KEYS.map((k) => fulfillment[k]),
    ];
    for (const value of published) assert.doesNotMatch(value, /CHỜ|TODO|\[|\]/, value);
    assert.doesNotMatch(legal.termsWithdrawalFormCourier, /CHỜ|TODO/);
    assert.match(legal.termsWithdrawalFormCourier, locale === 'pl' ? /odbioru \/ doręczenia/ : /Collected \/ delivered on/);
  });

  test(`${locale}: Kurier DPD prepayment rules out cash on delivery`, () => {
    const pattern = locale === 'pl' ? /pobraniem/ : /cash on delivery/i;
    assert.match(messages[locale].legal.termsPaymentsContentCourier, pattern);
  });

  test(`${locale}: the pre-DPD copy is unchanged (Kenmito and pickup-only ADG)`, () => {
    const { legal, fulfillment, cart } = messages[locale];
    for (const [key, value] of Object.entries(baseline[locale].legal)) assert.equal(legal[key], value, `legal.${key}`);
    for (const [key, value] of Object.entries(baseline[locale].fulfillment)) assert.equal(fulfillment[key], value, `fulfillment.${key}`);
    assert.equal(cart.freeShippingRemaining, baseline[locale].cart.freeShippingRemaining);
  });
}
