import { expect, test } from '@playwright/test';
import { mockMobileStorefront, seedAuthSession, seedCartStorage } from './mobile-fixtures';

test.describe('MobileBottomNav (Tier 3)', () => {
  test('renders primary mobile destinations on mobile home', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.goto('/en');

    const nav = page.getByTestId('mobile-bottom-nav');
    await expect(nav).toBeVisible();
    await expect(page.getByTestId('mobile-bottom-nav-home')).toBeVisible();
    await expect(page.getByTestId('mobile-bottom-nav-categories')).toBeVisible();
    await expect(page.getByTestId('mobile-bottom-nav-wishlist')).toBeVisible();
    await expect(page.getByTestId('mobile-bottom-nav-cart')).toBeVisible();
  });

  test('hides on /cart (own bottom CTA owns the slot)', async ({ page }) => {
    await seedCartStorage(page);
    await mockMobileStorefront(page, { cart: 'single-item' });
    await page.goto('/en/cart');

    await expect(page.getByRole('heading', { name: /your cart/i })).toBeVisible();
    await expect(page.getByTestId('mobile-bottom-nav')).toHaveCount(0);
    await expect(page.getByTestId('mobile-cart-summary-bar')).toBeVisible();
  });

  test('hides on /checkout (own bottom CTA owns the slot)', async ({ page }) => {
    await seedCartStorage(page);
    await mockMobileStorefront(page, { cart: 'single-item' });
    await page.goto('/en/checkout');

    // Don't wait on checkout-page DOM — its first cold compile can exceed 5s in dev.
    // The MobileBottomNav decides visibility on usePathname, so once we're on /checkout it returns null.
    expect(page.url()).toContain('/checkout');
    await expect(page.getByTestId('mobile-bottom-nav')).toHaveCount(0);
  });

  test('hidden on desktop viewport via md:hidden', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/en');

    await expect(page.getByTestId('mobile-bottom-nav')).toBeHidden();
  });

  test('marks the home item aria-current="page" on /', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.goto('/en');

    await expect(page.getByTestId('mobile-bottom-nav-home')).toHaveAttribute('aria-current', 'page');
    await expect(page.getByTestId('mobile-bottom-nav-categories')).not.toHaveAttribute('aria-current', 'page');
    await expect(page.getByTestId('mobile-bottom-nav-cart')).not.toHaveAttribute('aria-current', 'page');
    await expect(page.getByTestId('mobile-bottom-nav-wishlist')).not.toHaveAttribute('aria-current', 'page');
  });

  test('marks the categories item aria-current="page" on category routes', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.goto('/en/categories/fruit');

    await expect(page.getByTestId('mobile-bottom-nav-categories')).toHaveAttribute('aria-current', 'page');
    await expect(page.getByTestId('mobile-bottom-nav-home')).not.toHaveAttribute('aria-current', 'page');
  });

  test('marks the wishlist item aria-current="page" on /wishlist', async ({ page }) => {
    await seedAuthSession(page);
    await mockMobileStorefront(page, { wishlist: 'single-item' });
    await page.goto('/en/wishlist');

    await expect(page.getByTestId('mobile-bottom-nav-wishlist')).toHaveAttribute('aria-current', 'page');
    await expect(page.getByTestId('mobile-bottom-nav-home')).not.toHaveAttribute('aria-current', 'page');
  });

  test('cart badge reflects cart item count after hydration', async ({ page }) => {
    await seedCartStorage(page);
    await mockMobileStorefront(page, { cart: 'single-item' });
    await page.goto('/en');

    const badge = page.getByTestId('mobile-bottom-nav-cart-badge');
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText('1');
  });

  test('no cart badge when cart is empty', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.goto('/en');

    await expect(page.getByTestId('mobile-bottom-nav-cart')).toBeVisible();
    await expect(page.getByTestId('mobile-bottom-nav-cart-badge')).toHaveCount(0);
  });

  test('shop layout reserves bottom padding for the nav on regular routes', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.goto('/en');

    const paddingBottom = await page.evaluate(() => {
      const wrapper = document.querySelector<HTMLElement>('.min-h-screen.flex.flex-col');
      return wrapper?.style.paddingBottom ?? null;
    });

    expect(paddingBottom).not.toBeNull();
    expect(paddingBottom).toContain('3.5rem');
    expect(paddingBottom).toContain('safe-area-inset-bottom');
  });

  test('shop layout drops the bottom padding on /cart (nav hidden)', async ({ page }) => {
    await seedCartStorage(page);
    await mockMobileStorefront(page, { cart: 'single-item' });
    await page.goto('/en/cart');

    const paddingBottom = await page.evaluate(() => {
      const wrapper = document.querySelector<HTMLElement>('.min-h-screen.flex.flex-col');
      return wrapper?.style.paddingBottom ?? '';
    });

    expect(paddingBottom).toBe('');
  });

  test('PD sticky add-to-cart stacks above the bottom nav (computed CSS contract)', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.goto('/en/products/organic-gala-apples');
    await expect(page.getByRole('heading', { name: /organic gala apples family value pack/i })).toBeVisible();

    const sticky = page.getByTestId('mobile-pd-sticky-bar');
    const nav = page.getByTestId('mobile-bottom-nav');

    // Validate the LAYOUT CONTRACT via computed CSS — the visual contract is
    // "nav at bottom: 0 with safe-area padding; sticky bar at bottom: 3.5rem + safe-area
    // so the two cannot overlap regardless of nav inner height".
    const navBottom = await nav.evaluate((el) => getComputedStyle(el).bottom);
    expect(navBottom).toBe('0px');

    const stickyBottomPx = await sticky.evaluate((el) => parseFloat(getComputedStyle(el).bottom));
    // 3.5rem (default Tailwind base 16px) = 56px. Allow slight rounding either way.
    expect(stickyBottomPx).toBeGreaterThanOrEqual(56);
  });
});
