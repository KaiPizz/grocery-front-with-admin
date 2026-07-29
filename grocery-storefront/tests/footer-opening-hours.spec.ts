import { expect, test } from '@playwright/test';

// PRD trust goal (contact wave): shoppers must see the store's real contact
// details and opening hours, and search engines must receive LocalBusiness
// structured data. Deterministic values come from tests/config-server.mjs.
test.describe('Footer opening hours and local business data', () => {
  test('renders configured opening hours rows including the closed day', async ({ page }) => {
    await page.goto('/pl');

    const footer = page.locator('footer');
    await expect(footer.getByText('Pon. – Sob.: 7:00 – 19:00')).toBeVisible();
    await expect(footer.getByText('Niedziela: Zamknięte')).toBeVisible();
    await expect(footer.getByText('kontakt@example.test')).toBeVisible();
    await expect(footer.getByText('Testowa 1, 00-001 Warszawa')).toBeVisible();
  });

  test('localizes the closed label outside Polish', async ({ page }) => {
    await page.goto('/en');

    await expect(page.locator('footer').getByText('Niedziela: Closed')).toBeVisible();
  });

  test('shows no phone row while no phone is configured', async ({ page }) => {
    await page.goto('/pl');

    await expect(page.locator('footer a[href^="tel:"]')).toHaveCount(0);
  });

  test('publishes LocalBusiness JSON-LD with a zero-padded hours specification', async ({ page }) => {
    await page.goto('/pl');

    const payload = await page.locator('script#local-business-json-ld').textContent();
    expect(payload).toBeTruthy();
    const data = JSON.parse(payload as string) as {
      '@type': string;
      email?: string;
      address?: string;
      telephone?: string;
      openingHoursSpecification?: Array<{
        dayOfWeek: string[];
        opens: string;
        closes: string;
      }>;
    };

    expect(data['@type']).toBe('GroceryStore');
    expect(data.email).toBe('kontakt@example.test');
    expect(data.address).toBe('Testowa 1, 00-001 Warszawa');
    expect(data.telephone).toBeUndefined();
    expect(data.openingHoursSpecification).toHaveLength(1);
    expect(data.openingHoursSpecification?.[0]).toMatchObject({
      opens: '07:00',
      closes: '19:00',
    });
    expect(data.openingHoursSpecification?.[0].dayOfWeek).toEqual(
      expect.arrayContaining(['Monday', 'Saturday']),
    );
  });
});
