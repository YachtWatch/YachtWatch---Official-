import { test, expect } from '@playwright/test';

// Helper to generate unique users
const generateUser = () => {
    const id = Math.random().toString(36).substring(7);
    return {
        name: `User ${id}`,
        email: `user${id}@example.com`,
        password: 'password123'
    };
};

test('Settings Reminder Persistence', async ({ page }) => {
    const user = generateUser();

    // 1. Signup
    await page.goto('/auth/signup');
    await page.locator('.rounded-xl.border-2', { hasText: 'Crew' }).click();
    await page.fill('input[id="name"]', user.name);
    await page.fill('input[id="position"]', 'Test Role');
    await page.fill('input[id="email"]', user.email);
    await page.fill('input[id="password"]', user.password);
    await page.click('button:has-text("Create account")');

    // Check where we are
    try {
        await expect(page.getByText('Set up your profile')).toBeVisible({ timeout: 10000 });
        await page.click('button:has-text("Skip and do later")');
    } catch {
        console.log("Skip/Profile not found, checking if we are already redirected...");
    }

    // Wait for something that indicates we are logged in (e.g. Join Vessel or Dashboard)
    await expect(page.getByText('Join a Vessel').or(page.getByText('Dashboard'))).toBeVisible({ timeout: 15000 });

    // 2. Go to Settings
    console.log("Navigating to Settings...");
    await page.goto('/settings');

    // Check default state
    const select1 = page.locator('select').nth(0); // 1st Reminder
    const select2 = page.locator('select').nth(1); // 2nd Reminder

    await expect(select1).toHaveValue('0');
    await expect(select2).toHaveValue('0');

    // 3. Change 1st Reminder to 15 min
    console.log("Changing Reminder 1 to 15 min...");
    await select1.selectOption('15');
    await expect(select1).toHaveValue('15');

    // 4. Reload and Verify
    console.log("Reloading page...");
    await page.reload();
    await expect(select1).toHaveValue('15');

    // 5. Change to 30 min
    console.log("Changing Reminder 1 to 30 min...");
    await select1.selectOption('30');
    await expect(select1).toHaveValue('30');

    // 6. Reload and Verify
    await page.reload();
    await expect(select1).toHaveValue('30');

    // 7. Change back to None
    console.log("Changing Reminder 1 to None...");
    await select1.selectOption('0');
    await expect(select1).toHaveValue('0');

    // 8. Reload and Verify
    await page.reload();
    await expect(select1).toHaveValue('0');
});
