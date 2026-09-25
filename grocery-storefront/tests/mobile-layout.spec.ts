import { expect, test, type Page } from '@playwright/test';
import asiaDeliGoConfig from '../public/config/asiandeligo.json';
import { mockMobileStorefront, seedCartStorage } from './mobile-fixtures';

// SPEC SOURCES:
// - Mobile audit 2026-09-25 (asiadeligo.com at 360/390/430 + 768 tablet):
//   footer contact squeezed into half a column ("gmail." / "com"), footer and
//   cart links under the 24px WCAG 2.2 target size, the pickup-guide scroller
//   snapping its first card flush against the screen edge, "Zobacz wszystkie"
//   wrapping onto two lines, the checkout bar repeating one label twice, cart
//   hiding allergens without a "+N", and no add-to-cart on the first PDP screen.
// - Owner direction 2026-09-25: fluid layouts, not tuned to one screen size.

const MIN_TARGET = 24;

async function mockAsiaDeliGoConfig(page: Page) {
  // Production contact details (the repo config leaves them blank for the admin to fill).
  const envelope = structuredClone(asiaDeliGoConfig);
  Object.assign(envelope.config.general, {
    email: 'asiadelionline@gmail.com',
    address: 'Zamieniecka 80/12, 04-158 Warszawa (Centrum Handlowe Szembeka)',
    openingHours: [{ label: 'Pon. – Sob.', opens: '7:00', closes: '19:00' }],
  });
  await page.route('**/api/config/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(envelope) });
  });
}

test.describe('mobile layout', () => {
  test('footer contact uses the full width so the e-mail stays on one line', async ({ page }) => {
    await mockAsiaDeliGoConfig(page);
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto('/pl');

    const footer = page.locator('footer');
    const contact = footer.getByRole('navigation', { name: 'Kontakt' });
    await contact.scrollIntoViewIfNeeded();
    const grid = await contact.locator('xpath=..').boundingBox();
    const contactBox = await contact.boundingBox();
    expect(contactBox!.width).toBeGreaterThan(grid!.width * 0.9);

    const email = contact.locator('a[href^="mailto:"]').first();
    const emailBox = await email.boundingBox();
    expect(emailBox!.height).toBeLessThan(30);
  });

  test('tablet footer gives contact a full column so the e-mail stays on one line', async ({ page }) => {
    await mockAsiaDeliGoConfig(page);
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/pl');

    const contact = page.locator('footer').getByRole('navigation', { name: 'Kontakt' });
    await contact.scrollIntoViewIfNeeded();
    await page.waitForLoadState('networkidle');
    const contactBox = await contact.boundingBox();
    expect(contactBox!.width).toBeGreaterThanOrEqual(280);

    const emailBox = await contact.locator('a[href^="mailto:"]').first().boundingBox();
    expect(emailBox!.height).toBeLessThan(30);
  });

  test('home "see all" section links meet the 24px target size', async ({ page }) => {
    await mockAsiaDeliGoConfig(page);
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/pl');
    await page.waitForLoadState('networkidle');

    const links = await page.locator('main a').evaluateAll((anchors) =>
      anchors
        .filter((anchor) => anchor.getBoundingClientRect().width > 0 && /^Zobacz/.test(anchor.textContent?.trim() ?? ''))
        .map((anchor) => ({
          href: anchor.getAttribute('href'),
          height: Math.round(anchor.getBoundingClientRect().height),
        }))
    );
    expect(links.filter((link) => link.href !== '/categories').length).toBeGreaterThan(0);
    expect(links.filter((link) => link.height < MIN_TARGET)).toEqual([]);
  });

  test('footer navigation links meet the 24px target size', async ({ page }) => {
    await mockAsiaDeliGoConfig(page);
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/pl');

    await expect(page.getByRole('navigation', { name: 'Sklep' })).toBeVisible();
    await page.waitForLoadState('networkidle');
    // Measure in one pass: the footer re-renders once the storefront config lands.
    const heights = await page.locator('footer nav:not([aria-label="Kontakt"]) a').evaluateAll((links) =>
      links
        .filter((link) => link.getBoundingClientRect().width > 0)
        .map((link) => ({ text: link.textContent?.trim(), height: Math.round(link.getBoundingClientRect().height) }))
    );
    expect(heights.length).toBeGreaterThan(0);
    expect(heights.filter((link) => link.height < MIN_TARGET)).toEqual([]);
  });

  test('pickup guide keeps the page gutter before its first card', async ({ page }) => {
    await mockAsiaDeliGoConfig(page);
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto('/pl');

    const firstStep = page.locator('[data-testid="home-pickup-guide"]:visible li').first();
    await expect(firstStep).toBeVisible();
    await page.waitForTimeout(300);
    const box = await firstStep.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(12);
  });

  test('"see all categories" stays on one line beside a wrapped heading', async ({ page }) => {
    await mockAsiaDeliGoConfig(page);
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto('/pl');

    const seeAll = page.locator('a[href="/categories"]:visible', { hasText: 'Zobacz wszystkie' }).first();
    await expect(seeAll).toBeVisible();
    // min-h-11 hides a wrap in the box height, so count the rendered text lines.
    const lines = await seeAll.evaluate((element) => {
      const tops = new Set<number>();
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const rect of range.getClientRects()) if (rect.width > 0) tops.add(Math.round(rect.top));
      }
      return tops.size;
    });
    expect(lines).toBe(1);
  });

  test('cart lists every allergen and a tappable save-for-later action', async ({ page }) => {
    await seedCartStorage(page);
    await mockMobileStorefront(page, { cart: 'single-item' });
    await page.goto('/en/cart');

    const saveForLater = page.getByRole('button', { name: /save .* for later|save for later/i }).first();
    await expect(saveForLater).toBeVisible();
    const box = await saveForLater.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(MIN_TARGET);

    // The single-item fixture carries three allergens; none may be hidden.
    await expect(page.locator('main .allergen-chip')).toHaveCount(3);
  });

  test('checkout bar labels the amount instead of repeating the toggle text', async ({ page }) => {
    await seedCartStorage(page);
    await mockMobileStorefront(page, { cart: 'single-item' });
    await page.goto('/en/checkout');

    const bar = page.getByTestId('mobile-checkout-summary-bar');
    await expect(bar).toBeVisible();
    const label = (await bar.locator('p').first().innerText()).trim().toLowerCase();
    const toggle = (await bar.locator('button').innerText()).trim().toLowerCase();
    expect(label).not.toBe(toggle);
    await expect(page.getByText(/completed: \d/i)).toHaveCount(0);
  });

  test('PDP offers add-to-cart on the first screen when the inline button is below the fold', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 390, height: 520 });
    await page.goto('/en/products/organic-gala-apples');

    const inlineAdd = page.getByTestId('product-detail-add');
    await expect(inlineAdd).toBeAttached();
    const inlineBox = await inlineAdd.boundingBox();
    expect(inlineBox!.y).toBeGreaterThan(520 - 56);

    const sticky = page.getByTestId('mobile-pd-sticky-bar');
    await expect(sticky).toHaveAttribute('aria-hidden', 'false');
  });

  test('breadcrumb links meet the 24px target size', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.goto('/en/products/organic-gala-apples');

    const breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb' });
    await expect(breadcrumb).toBeVisible();
    const links = breadcrumb.locator('a');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
    for (let index = 0; index < count; index += 1) {
      const box = await links.nth(index).boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(MIN_TARGET);
    }
  });
});
