import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mockMobileStorefront } from './mobile-fixtures';

// SPEC SOURCES:
// - Przelewy24 store verification checklist: a Contact page with legal name, NIP,
//   address, phone and email; Terms with seller data, complaints and withdrawal;
//   Privacy naming the data controller; all reachable from every page.
// - mockLegalConfig() adds a seller identity + phone on top of tests/config-server.mjs.

const LEGAL_NAME = 'Green Food Test Anna Kowalska';
const CONFIG_API = 'http://127.0.0.1:4199';

// Serve the shared fixture config with a seller identity and phone added, so the
// other footer specs (which assert no phone) keep their own fixture untouched.
async function mockLegalConfig(page: Page) {
  const response = await page.request.get(`${CONFIG_API}/api/config/test`);
  const envelope = await response.json();
  envelope.config.general = {
    ...envelope.config.general,
    phone: '+48 500 600 700',
    legalIdentity: {
      legalName: LEGAL_NAME,
      registrationType: 'ceidg',
      nip: '1234563218',
      regon: '123456785',
      krs: '',
      registeredAddress: 'Rejestrowa 5/8, 00-005 Warszawa',
      complaintAddress: 'Reklamacyjna 2, 00-002 Warszawa',
    },
  };
  await page.route('**/api/config/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(envelope) })
  );
  await mockMobileStorefront(page, {});
}

test.describe('P24 legal and contact pages', () => {
  test('contact page publishes the seller identity, store address, hours, phone and email', async ({ page }) => {
    await mockLegalConfig(page);
    const response = await page.goto('/en/contact');
    expect(response?.status()).toBe(200);

    const identity = page.getByTestId('contact-legal-identity');
    await expect(identity).toContainText(LEGAL_NAME);
    await expect(identity).toContainText('NIP: 1234563218');
    await expect(identity).toContainText('REGON: 123456785');
    await expect(identity).not.toContainText('KRS');
    await expect(identity).toContainText('Rejestrowa 5/8, 00-005 Warszawa');
    await expect(identity).toContainText('Reklamacyjna 2, 00-002 Warszawa');

    const channels = page.getByTestId('contact-channels');
    await expect(channels.getByRole('link', { name: 'kontakt@example.test' })).toHaveAttribute('href', 'mailto:kontakt@example.test');
    await expect(channels.getByRole('link', { name: '+48 500 600 700' })).toHaveAttribute('href', 'tel:+48500600700');
    await expect(page.locator('#main-content').getByText(/Pon\. – Sob\.: 7:00 – 19:00/)).toBeVisible();
  });

  test('/kontakt redirects to the contact page', async ({ page }) => {
    await mockLegalConfig(page);
    await page.goto('/pl/kontakt');
    await expect(page).toHaveURL(/\/contact$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Kontakt' })).toBeVisible();
  });

  test('terms carry seller data, effective date, withdrawal, complaints and the P24 operator', async ({ page }) => {
    await mockLegalConfig(page);
    const response = await page.goto('/pl/terms');
    expect(response?.status()).toBe(200);
    const main = page.locator('main');
    await expect(main).toContainText(LEGAL_NAME);
    await expect(main).toContainText('NIP: 1234563218');
    await expect(main).toContainText('Reklamacyjna 2, 00-002 Warszawa');
    await expect(main).toContainText('+48 500 600 700');
    await expect(main).toContainText('wersja 2026-09-25');
    await expect(main).toContainText('Odstąpienie od umowy');
    await expect(main).toContainText('art. 38 ust. 1 pkt 4 i 5');
    await expect(main).toContainText('Reklamacje');
    await expect(main).toContainText('PayPro S.A.');
    await expect(main).toContainText('Zamówienie z obowiązkiem zapłaty');
  });

  test('privacy policy names the controller, legal bases, recipients and retention', async ({ page }) => {
    await mockLegalConfig(page);
    const response = await page.goto('/pl/privacy');
    expect(response?.status()).toBe(200);
    const main = page.locator('main');
    await expect(main).toContainText(`Administratorem danych osobowych jest ${LEGAL_NAME}`);
    await expect(main).toContainText('art. 6 ust. 1 lit. b RODO');
    await expect(main).toContainText('PayPro S.A.');
    await expect(main).toContainText('Okres przechowywania');
    await expect(main).toContainText('Prezesa Urzędu Ochrony Danych Osobowych');
  });

  test('every page links to the contact page and shows the NIP in the footer', async ({ page }) => {
    await mockLegalConfig(page);
    await page.goto('/en/products');
    const footer = page.locator('footer');
    await expect(footer.getByRole('link', { name: 'Contact' })).toHaveAttribute('href', '/en/contact');
    await expect(footer.getByTestId('footer-legal-identity')).toContainText('NIP: 1234563218');
  });
});
