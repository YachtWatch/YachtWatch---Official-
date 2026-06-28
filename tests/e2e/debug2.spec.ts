import { test } from '@playwright/test';

test('debug signup and vessel initialization', async ({ page }) => {
    await page.goto('http://localhost:5173/');

    const getStartedBtn = page.locator('text=Get Started').first();
    await getStartedBtn.click();

    // Fill signup
    await page.fill('input[id="name"]', 'New Captain');
    await page.fill('input[id="email"]', `captain_${Date.now()}@example.com`);
    await page.fill('input[id="password"]', 'password123');

    // click select trigger
    await page.click('button[role="combobox"]');
    // click "Captain" from dropdown
    await page.click('div[role="option"]:has-text("Captain")');

    await page.click('button[type="submit"]:has-text("Sign up")');

    await page.waitForTimeout(5000); // wait for redirect

    console.log("URL after signup:", page.url());

    // If we are on dashboard, let's try to initialize vessel
    const vesselNameInput = page.locator('input[placeholder="e.g. M/Y Eclipse"]');
    if (await vesselNameInput.isVisible()) {
        console.log("Vessel creation form is visible");
        await vesselNameInput.fill('My Test Vessel');
        await page.fill('input[placeholder="50"]', '40'); // length
        await page.fill('input[placeholder="12"]', '10'); // capacity

        await page.click('button:has-text("Initialize Vessel")');
        await page.waitForTimeout(3000);
        console.log("URL after initialize vessel:", page.url());

        // Check if error alert or something
        const pageText = await page.textContent('body');
        console.log("Page contains 'Failed to create vessel':", pageText?.includes('Failed to create vessel'));
    }
});
