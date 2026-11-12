import { test, expect } from '@playwright/test';

const verifyTermsPage = async (page) => {
  const response = await page.goto('/terms-of-service');

  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/terms-of-service#\/terms-of-service$/);
  await expect(page).toHaveTitle('Taleemi Duniya Pro – Terms of Service');
  await expect(page.locator('main h1')).toHaveText('Terms of Service');
  await expect(page.locator('main h2')).toHaveCount(19);
  await expect(page.locator('a[href="mailto:support@taleemiduniya.pro"]').first()).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://taleemidunya-pro-ed44e.web.app/terms-of-service',
  );
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    'Read the Terms of Service governing the use of Taleemi Duniya Pro school management software and its educational services.',
  );
};

test('terms of service is publicly available on desktop', async ({ page }) => {
  await verifyTermsPage(page);
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('[role="banner"]')).toBeHidden();
  await expect(page.locator('main h1')).toBeVisible();
  await expect(page.locator('footer')).toBeHidden();
});

test('terms of service is readable on a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await verifyTermsPage(page);
  await expect(page.locator('footer')).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});
