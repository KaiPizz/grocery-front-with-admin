import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mockMobileStorefront, seedAuthSession, seedCartStorage } from './mobile-fixtures';

// SPEC SOURCES:
// - docs/superpowers/specs/2026-10-16-adg-dpd-shipping-design.md (eNail repo): a pickup shop with
//   fulfillment.courier = 'dpd' offers "Kurier DPD" (19,99 zł, free from 200 zł, prepaid only);
//   chilled/frozen carts are pickup only; a shop without the flag never shows the courier.

const ADG_COURIER = { mode: 'pickup', courier: 'dpd', courierTermsVersion: '2026-09-25' } as const;
const KENMITO_PICKUP = { mode: 'pickup', courier: 'none', courierTermsVersion: null } as const;

function deliveryRadio(page: Page, name: RegExp) {
  return page.getByTestId('checkout-block-delivery').getByRole('radio', { name });
}

function cashRadio(page: Page) {
  return page.getByTestId('checkout-block-payment').getByRole('radio', { name: /przy odbiorze/i });
}

test.describe('Pickup shop with Kurier DPD', () => {
  test('selecting Kurier DPD reveals the address form even when logged in', async ({ page }) => {
    await seedCartStorage(page);
    await seedAuthSession(page, 'Mobile Shopper', '+48500600700');
    await mockMobileStorefront(page, { cart: 'single-item', checkoutProfile: 'pickup-courier', siteConfigOverride: ADG_COURIER });
    await page.goto('/pl/checkout');

    await expect(page.getByTestId('checkout-contact-card')).toBeVisible();
    await expect(page.getByLabel(/^adres/i)).toHaveCount(0);

    await deliveryRadio(page, /kurier dpd/i).click();
    await expect(deliveryRadio(page, /kurier dpd/i)).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByLabel(/^adres/i)).toBeVisible();
    await expect(page.getByLabel(/^miasto/i)).toBeVisible();
    await expect(page.getByLabel(/^kod pocztowy/i)).toBeVisible();
    await expect(page.getByTestId('checkout-courier-notice')).toContainText(/Przelewy24/);
  });

  test('cash disappears when DPD is selected and returns for pickup', async ({ page }) => {
    await seedCartStorage(page);
    await mockMobileStorefront(page, { cart: 'single-item', checkoutProfile: 'pickup-courier', siteConfigOverride: ADG_COURIER });
    await page.goto('/pl/checkout');

    await expect(deliveryRadio(page, /^odbiór osobisty/i)).toHaveAttribute('aria-checked', 'true');
    await expect(cashRadio(page)).toBeVisible();

    await deliveryRadio(page, /kurier dpd/i).click();
    await expect(deliveryRadio(page, /kurier dpd/i)).toHaveAttribute('aria-checked', 'true');
    await expect(cashRadio(page)).toHaveCount(0);
    await expect(page.getByTestId('checkout-block-payment').getByRole('radio', { name: /przelewy24/i })).toBeVisible();

    await deliveryRadio(page, /^odbiór osobisty/i).click();
    await expect(deliveryRadio(page, /^odbiór osobisty/i)).toHaveAttribute('aria-checked', 'true');
    await expect(cashRadio(page)).toBeVisible();
  });

  test('a chilled item locks DPD and shows "tylko odbiór osobisty"', async ({ page }) => {
    await seedCartStorage(page);
    await mockMobileStorefront(page, { cart: 'cold-item', checkoutProfile: 'pickup-courier', siteConfigOverride: ADG_COURIER });
    await page.goto('/pl/checkout');

    const dpd = deliveryRadio(page, /kurier dpd/i);
    await expect(dpd).toHaveAttribute('aria-disabled', 'true');
    await expect(dpd).toBeDisabled();
    await expect(page.getByTestId('checkout-option-locked')).toContainText(/tylko odbiór osobisty/i);
    await expect(deliveryRadio(page, /^odbiór osobisty/i)).toHaveAttribute('aria-checked', 'true');
  });

  test('the free-shipping bar shows the remaining amount from freeAbove (200)', async ({ page }) => {
    await seedCartStorage(page);
    await mockMobileStorefront(page, { cart: 'single-item', checkoutProfile: 'pickup-courier', siteConfigOverride: ADG_COURIER });
    await page.goto('/pl/cart');

    // One line at 12,99 zł: 200 − 12,99 = 187,01 zł left to free Kurier DPD.
    await expect(page.getByTestId('mobile-cart-free-shipping')).toContainText(/187,01/);
    await expect(page.getByTestId('mobile-cart-free-shipping')).toContainText(/darmowej dostawy DPD/);
  });

  test('Kenmito config never shows DPD even when the backend returns it', async ({ page }) => {
    await seedCartStorage(page);
    await mockMobileStorefront(page, { cart: 'single-item', checkoutProfile: 'pickup-courier', siteConfigOverride: KENMITO_PICKUP });
    await page.goto('/pl/checkout');

    await expect(page.getByTestId('checkout-pickup-single')).toBeVisible();
    await expect(page.getByTestId('checkout-block-delivery').getByText(/kurier dpd/i)).toHaveCount(0);
    await expect(cashRadio(page)).toBeVisible();
  });
});
