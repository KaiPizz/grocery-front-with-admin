import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mockMobileStorefront, seedCartStorage } from './mobile-fixtures';

// SPEC SOURCES:
// - PRD section 3.2: shoppers enter delivery details, choose shipping, and complete checkout on mobile.
// - PRD section 5.3 (revised 29/09/2026): checkout is one page — contact, pickup/delivery,
//   payment and confirm are always visible; saved address support stays.
// - `.claude/docs/progress.md`: page-by-page accessibility audit is in progress.

async function openCheckout(page: Page) {
  await seedCartStorage(page);
  await mockMobileStorefront(page, { cart: 'single-item' });
  await page.goto('/en/checkout');
  await expect(page.getByRole('heading', { name: /checkout/i })).toBeVisible();
}

async function fillDeliveryForm(page: Page) {
  await page.getByLabel(/first name/i).fill('Marta');
  await page.getByLabel(/last name/i).fill('Nowak');
  await page.getByLabel(/^email/i).fill('marta@example.com');
  await page.getByLabel(/phone/i).fill('+48123123123');
  await page.getByLabel(/address/i).fill('Marszalkowska 1');
  await page.getByLabel(/city/i).fill('Warsaw');
  await page.getByLabel(/postal code/i).fill('00-001');
}

test.describe('checkout accessibility', () => {
  test('moves focus to the first invalid contact field and associates its error text', async ({ page }) => {
    await openCheckout(page);

    await page.getByRole('button', { name: /order and pay/i }).click();

    const firstName = page.getByLabel(/first name/i);
    await expect(firstName).toBeFocused();
    await expect(firstName).toHaveAttribute('aria-invalid', 'true');
    await expect(firstName).toHaveAttribute('aria-describedby', 'checkout-firstName-error');
    await expect(page.locator('#checkout-firstName-error')).toHaveText(/required/i);
  });

  test('exposes selected state on shipping and payment choices as radio groups', async ({ page }) => {
    await openCheckout(page);
    await fillDeliveryForm(page);

    const standardShipping = page.getByTestId('checkout-block-delivery').getByRole('radio', { name: /standard courier/i });
    await expect(standardShipping).toHaveAttribute('aria-checked', 'false');
    await standardShipping.press('Enter');
    await expect(standardShipping).toHaveAttribute('aria-checked', 'true');

    const cardPayment = page.getByTestId('checkout-block-payment').getByRole('radio', { name: /credit\/debit card/i });
    await expect(cardPayment).toHaveAttribute('aria-checked', 'false');
    await expect(cardPayment).toBeEnabled();
    await cardPayment.press('Enter');
    await expect(cardPayment).toHaveAttribute('aria-checked', 'true');
  });

  test('asks for a payment method before placing the order', async ({ page }) => {
    await openCheckout(page);
    await fillDeliveryForm(page);
    await page.getByTestId('checkout-block-delivery').getByRole('radio', { name: /standard courier/i }).press('Enter');

    await page.getByRole('button', { name: /order and pay/i }).click();

    await expect(page.getByTestId('checkout-block-payment').getByRole('alert')).toHaveText(/select a payment method/i);
  });

  test('collapses the mobile order summary behind a toggle and keeps the order button in the bar', async ({ page }) => {
    await openCheckout(page);

    const toggle = page.getByTestId('mobile-checkout-summary').getByRole('button');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toContainText(/your order \(1 item\)/i);
    await expect(page.getByTestId('mobile-checkout-summary-panel')).toHaveCount(0);
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(toggle).toHaveAttribute('aria-controls', 'mobile-checkout-summary-panel');
    await expect(page.getByTestId('mobile-checkout-summary-panel')).toContainText(/organic gala apples/i);
    const barButton = page.getByTestId('mobile-checkout-summary-bar').getByRole('button');
    await expect(barButton).toHaveText(/order and pay · .*\d/i);
  });
});
