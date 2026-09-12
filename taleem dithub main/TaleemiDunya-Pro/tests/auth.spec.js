import { test, expect } from '@playwright/test';

test('has title and redirects to login if unauthenticated', async ({ page }) => {
  await page.goto('/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/TaleemiDunya/i);

  // If we land on a protected route or landing, we should eventually see a login or get started link
  // For this app, unauthenticated visits to / hash root might show LandingPage
  const getStarted = page.getByText(/Get Started|Login/i).first();
  await expect(getStarted).toBeVisible({ timeout: 10000 });
});

test('login page renders correctly', async ({ page }) => {
  await page.goto('/#/login');
  
  // Look for email/phone input
  const emailInput = page.getByPlaceholder(/Email|Phone/i);
  await expect(emailInput).toBeVisible();

  // Look for password input
  const passwordInput = page.getByPlaceholder(/Password/i);
  await expect(passwordInput).toBeVisible();

  // Look for login button
  const loginButton = page.getByRole('button', { name: /Login|Sign In/i });
  await expect(loginButton).toBeVisible();
});
