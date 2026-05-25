import { test, expect } from '@playwright/test';

test.describe('FactorMatch Basic Health Check', () => {
  test('should load the login page successfully', async ({ page }) => {
    // Navigate to the login page (baseURL is set to http://127.0.0.1:5173 in config)
    await page.goto('/login');

    // Verify the page title or a specific element exists
    // Depending on the app's title, you might need to adjust this
    await expect(page).toHaveTitle(/FactorMatch|Factor Match/i);

    // Verify the login form is present
    const loginButton = page.locator('button', { hasText: 'ログイン' });
    await expect(loginButton).toBeVisible();
  });
});
