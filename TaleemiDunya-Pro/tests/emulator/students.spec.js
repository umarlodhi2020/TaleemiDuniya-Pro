import { test, expect } from '@playwright/test';

test.describe('Student Management Module', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to local emulator login (requires seeded auth user)
    await page.goto('/login');
    // We expect the emulator to have seeded 'admin@test.local'
    try {
      await page.fill('input[type="email"]', 'admin@test.local');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/school-admin/dashboard');
    } catch (e) {
      // Test will fail gracefully here if emulator data is missing or if emulator is offline.
    }
  });

  test('Students page loads and renders list', async ({ page }) => {
    await page.goto('/school-admin/students');
    await expect(page.locator('h1').filter({ hasText: /Students|Student Directory/i })).toBeVisible({ timeout: 5000 });
  });

  test('Add student form validation', async ({ page }) => {
    await page.goto('/school-admin/students/add');
    await page.click('button[type="submit"]'); // Trigger validation
    // Should show error for missing name
    await expect(page.locator('text=/required/i').first()).toBeVisible();
  });

  test('Valid student can be created in emulator', async ({ page }) => {
    await page.goto('/school-admin/students/add');
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'Student');
    await page.fill('input[name="admissionNumber"]', 'TST-001');
    await page.click('button[type="submit"]');
    
    // Redirects back to list and shows success
    await page.waitForURL('**/school-admin/students');
    await expect(page.locator('text=Test Student')).toBeVisible();
  });
});
