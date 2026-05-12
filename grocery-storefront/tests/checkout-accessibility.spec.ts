import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mockMobileStorefront, seedCartStorage } from './mobile-fixtures';

// SPEC SOURCES:
// - PRD section 3.2: shoppers enter delivery details, choose shipping, and complete checkout on mobile.
// - PRD section 5.3: Checkout is a 4-step flow with saved address support.
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
  await page.getByLabel(/country/i).fill('PL');
}

test.describe('checkout accessibility', () => {
  test('moves focus to the first invalid delivery field and associates its error text', async ({ page }) => {
    await openCheckout(page);

    await page.getByRole('button', { name: /continue/i }).click();

    const firstName = page.getByLabel(/first name/i);
    await expect(firstName).toBeFocused();
    await expect(firstName).toHaveAttribute('aria-invalid', 'true');
    await expect(firstName).toHaveAttribute('aria-describedby', 'checkout-firstName-error');
    await expect(page.locator('#checkout-firstName-error')).toHaveText(/required/i);
  });

  test('exposes selected state on shipping and payment choices', async ({ page }) => {
    await openCheckout(page);
    await fillDeliveryForm(page);
    await page.getByRole('button', { name: /continue/i }).click();

    const shippingSection = page.getByTestId('checkout-section-shipping');
    const shippingPanel = page.locator('#checkout-panel-shipping');
    const standardShipping = shippingPanel.getByRole('button', { name: /standard courier/i });
    await expect(standardShipping).toHaveAttribute('aria-pressed', 'false');
    await standardShipping.press('Enter');

    await shippingSection.getByRole('button', { name: /shipping/i }).click();
    await expect(standardShipping).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#checkout-panel-payment').getByRole('button', { name: /credit\/debit card/i })).toHaveCount(0);
    await standardShipping.press('Enter');

    const paymentSection = page.getByTestId('checkout-section-payment');
    const paymentPanel = page.locator('#checkout-panel-payment');
    await expect(paymentSection.getByRole('button', { name: /payment/i })).toHaveAttribute('aria-expanded', 'true');

    const cardPayment = paymentPanel.getByRole('button', { name: /credit\/debit card/i });
    await expect(cardPayment).toHaveAttribute('aria-pressed', 'false');
    await expect(cardPayment).toBeEnabled();
    await cardPayment.press('Enter');

    await expect(page.getByTestId('checkout-section-review').getByRole('button', { name: /review/i })).toHaveAttribute('aria-expanded', 'true');
    await paymentSection.getByRole('button', { name: /payment/i }).press('Enter');
    await expect(cardPayment).toHaveAttribute('aria-pressed', 'true');
  });

  test('connects the mobile summary toggle to its expandable panel', async ({ page }) => {
    await openCheckout(page);

    const summaryToggle = page.getByTestId('mobile-checkout-summary-bar').locator('button');
    await expect(summaryToggle).toContainText(/summary/i);
    await expect(summaryToggle).toHaveAttribute('aria-expanded', 'false');
    await expect(summaryToggle).toHaveAttribute('aria-controls', 'mobile-checkout-summary-panel');

    await summaryToggle.click();

    await expect(summaryToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#mobile-checkout-summary-panel')).toBeVisible();
  });
});
