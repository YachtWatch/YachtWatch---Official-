import { test, expect } from '@playwright/test';

test('debug login', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  await expect(page.locator('text=Sign In').first()).toBeVisible();
  await page.click('text=Sign In');
  
  // Wait a bit to see what happens
  await page.waitForTimeout(2000);
  
  await page.content();
  console.log("Page URL after clicking Sign In:", page.url());
  
  // See if "Enter your email" is on page
  const hasLoginForm = await page.locator('text=Enter your email to sign in').isVisible();
  console.log("Has Login Form?", hasLoginForm);
  
  // See if there's a spinner (maybe svg or standard spinner class)
  const hasSpinner = await page.locator('.animate-spin').isVisible();
  console.log("Has Spinner?", hasSpinner);
});
