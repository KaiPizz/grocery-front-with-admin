import { expect, test } from '@playwright/test';

import { mockMobileStorefront } from './mobile-fixtures';

// Regression: AUTH-005 — production-configured Polish navigation copy leaked onto English pages.
// Found by /qa on 2026-07-20.
// Report: .gstack/qa-reports/qa-report-asiandeligo-eshoper-pro-2026-07-20.md
test('English header and footer localize known links from the Polish production config', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'pixel-7', 'One mobile browser covers configured navigation copy');

  await mockMobileStorefront(page, { wishlist: 'empty' });
  await page.route('http://127.0.0.1:4199/api/config/**', async (route) => {
    const upstream = await route.fetch();
    const payload = await upstream.json() as Record<string, any>;
    payload.config.branding.storeName = 'Asia Deli Go';
    payload.config.layout.footer = {
      tagline: 'Azjatyckie produkty spożywcze na co dzień — zamów online!',
      columns: [
        {
          title: 'Sklep',
          links: [
            { label: 'Kategorie', href: '/categories' },
            { label: 'Produkty', href: '/products' },
            { label: 'Koreańska spiżarnia', href: '/collections/korean-pantry' },
          ],
        },
        {
          title: 'Informacje',
          links: [
            { label: 'Polityka prywatności', href: '/privacy' },
            { label: 'Regulamin', href: '/terms' },
          ],
        },
      ],
      copyrightText: '© {year} Asia Deli Go.',
    };
    payload.config.commercial.quickLinks = payload.config.commercial.quickLinks.map(
      (link: Record<string, unknown>) => link.id === 'quick-korean-pantry'
        ? { ...link, label: 'Koreańska spiżarnia' }
        : link,
    );
    await route.fulfill({
      response: upstream,
      json: payload,
    });
  });

  await page.goto('/en/login');

  const footer = page.locator('footer');
  await expect(footer).toContainText('Asian groceries for everyday shopping. Order online and collect in store.');
  await expect(footer.getByRole('heading', { name: 'Shop', exact: true })).toBeVisible();
  await expect(footer.getByRole('heading', { name: 'Info', exact: true })).toBeVisible();
  await expect(footer.getByRole('link', { name: 'Categories', exact: true })).toBeVisible();
  await expect(footer.getByRole('link', { name: 'Products', exact: true })).toBeVisible();
  await expect(footer.getByRole('link', { name: 'Korean pantry', exact: true })).toBeVisible();
  await expect(footer.getByRole('link', { name: 'Privacy policy', exact: true })).toBeVisible();
  await expect(footer.getByRole('link', { name: 'Terms of service', exact: true })).toBeVisible();
  await expect(footer).not.toContainText('Azjatyckie produkty spożywcze');
  await expect(footer).not.toContainText('Koreańska spiżarnia');
  await expect(footer).not.toContainText('Polityka prywatności');
  await expect(footer).not.toContainText('Regulamin');

  await page.getByRole('button', { name: 'Open menu' }).click();
  const mobileNavigation = page.getByRole('navigation', { name: 'Mobile navigation' });
  await expect(mobileNavigation.getByRole('link', { name: 'Korean pantry', exact: true })).toBeVisible();
  await expect(mobileNavigation).not.toContainText('Koreańska spiżarnia');

  await page.screenshot({
    path: testInfo.outputPath('english-auth-footer-after.png'),
    fullPage: true,
  });
});
