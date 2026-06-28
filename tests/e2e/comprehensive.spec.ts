import { test, expect, BrowserContext, Page } from '@playwright/test';

test.describe('Comprehensive 10-User Flow', () => {
    test.setTimeout(300000); // 5 minutes

    let contextAdmin: BrowserContext;
    let pageAdmin: Page;
    const crewContexts: BrowserContext[] = [];
    const crewPages: Page[] = [];

    const runId = Date.now().toString();
    const captainEmail = `cpt_${runId}@yacht.com`;
    const password = 'Password123!';
    const vesselName = `Titan_${runId}`;
    let joinCode = '';

    const CREW_COUNT = 10;

    test.beforeAll(async ({ browser }) => {
        // Create Captain context
        contextAdmin = await browser.newContext();
        pageAdmin = await contextAdmin.newPage();

        // Create 10 Crew contexts
        for (let i = 0; i < CREW_COUNT; i++) {
            const ctx = await browser.newContext();
            crewContexts.push(ctx);
            crewPages.push(await ctx.newPage());
        }
    });

    test.afterAll(async () => {
        await contextAdmin.close();
        for (const ctx of crewContexts) {
            await ctx.close();
        }
    });

    test('Captain signs up and creates vessel', async () => {
        await pageAdmin.goto('http://localhost:5173/auth/signup');
        await pageAdmin.fill('input[placeholder="Enter your email"]', captainEmail);
        await pageAdmin.fill('input[placeholder="Enter your first name"]', 'Cap');
        await pageAdmin.fill('input[placeholder="Enter your last name"]', 'Jack');
        await pageAdmin.fill('input[placeholder="Create a password"]', password);
        await pageAdmin.click('button:has-text("Create Account")');

        // Select Captain Role
        await expect(pageAdmin.locator('text=Choose your role')).toBeVisible({ timeout: 15000 });
        await pageAdmin.click('text=Captain / Owner');
        await pageAdmin.fill('input[placeholder="e.g. Captain, Master"]', 'Master');
        await pageAdmin.click('button:has-text("Complete Profile")');

        // Create Vessel
        await expect(pageAdmin.locator('text=Welcome, Cap!')).toBeVisible({ timeout: 10000 });
        await pageAdmin.fill('input[placeholder="e.g. Sea Breeze"]', vesselName);
        await pageAdmin.fill('input[placeholder="Length in meters"]', '50');
        // Using nth(1) if capacity is also a number, let's just use placeholder
        await pageAdmin.locator('input[type="number"]').nth(1).fill('12'); // capacity

        // We assume check-in interval is default 15
        await pageAdmin.click('button:has-text("Initialize Vessel")');

        // Wait for Dashboard
        await expect(pageAdmin.locator(`text=${vesselName}`).first()).toBeVisible({ timeout: 10000 });

        // Extract Join Code
        const joinCodeLocator = pageAdmin.locator('.font-mono.tracking-\\[0\\.2em\\]');
        await expect(joinCodeLocator).toBeVisible();
        joinCode = await joinCodeLocator.innerText();
        expect(joinCode.length).toBeGreaterThan(0);
        console.log("Vessel Join Code:", joinCode);
    });

    test('10 Crew members sign up and request to join', async () => {
        expect(joinCode).toBeTruthy();

        const promises = crewPages.map(async (page, index) => {
            const email = `crew_${index}_${runId}@yacht.com`;
            await page.goto('http://localhost:5173/auth/signup');
            await page.fill('input[placeholder="Enter your email"]', email);
            await page.fill('input[placeholder="Enter your first name"]', `CrewFirst${index}`);
            await page.fill('input[placeholder="Enter your last name"]', `CrewLast${index}`);
            await page.fill('input[placeholder="Create a password"]', password);
            await page.click('button:has-text("Create Account")');

            // Select Crew Role
            await expect(page.locator('text=Choose your role')).toBeVisible({ timeout: 15000 });
            await page.click('text=Crew Member');
            await page.fill('input[placeholder="e.g. Deckhand, Chef"]', `Role${index}`);
            await page.click('button:has-text("Complete Profile")');

            // Enter Join Code
            await expect(page.locator('text=Enter Vessel Join Code')).toBeVisible({ timeout: 10000 });
            await page.fill('input[placeholder="Enter 6-character code"]', joinCode);
            await page.click('button:has-text("Request to Join")');

            // Expect waiting message
            await expect(page.locator('text=Request pending approval from Captain')).toBeVisible({ timeout: 10000 });
        });

        await Promise.all(promises);
    });

    test('Edge Case: Invalid Join Code', async () => {
        // Try joining an invalid vessel with one of the crew contexts
        const page = crewPages[0];
        await page.reload();
        // they are already pending, let's create a new temporary context
        const ctx = await page.context().browser()!.newContext();
        const p = await ctx.newPage();
        await p.goto('http://localhost:5173/auth/signup');
        await p.fill('input[placeholder="Enter your email"]', `edge_${runId}@edge.com`);
        await p.fill('input[placeholder="Enter your first name"]', `Edge`);
        await p.fill('input[placeholder="Enter your last name"]', `Case`);
        await p.fill('input[placeholder="Create a password"]', password);
        await p.click('button:has-text("Create Account")');
        await expect(p.locator('text=Choose your role')).toBeVisible({ timeout: 15000 });
        await p.click('text=Crew Member');
        await p.click('button:has-text("Complete Profile")');

        await expect(p.locator('text=Enter Vessel Join Code')).toBeVisible();
        await p.fill('input[placeholder="Enter 6-character code"]', 'INVALID_CODE');
        await p.click('button:has-text("Request to Join")');
        await expect(p.locator('text=Invalid Join Code')).toBeVisible();
        await ctx.close();
    });

    test('Captain approves all 10 crew members', async () => {
        await pageAdmin.click('button:text("Crew")');

        // Wait for the pending requests to appear
        await expect(pageAdmin.locator('text=Pending Requests')).toBeVisible();
        // We should see 10 green checkmark buttons
        const approveButtons = pageAdmin.locator('button:has(.lucide-check)');

        // Instead of waiting specifically for 10 which might be flaky with realtime, 
        // let's click approve on all we see and maybe refresh if needed
        await pageAdmin.waitForTimeout(2000); // Give real-time a moment to catch up

        let pendingCount = await approveButtons.count();
        while (pendingCount > 0) {
            await approveButtons.first().click();
            await pageAdmin.waitForTimeout(500); // Wait between clicks to let DB process
            pendingCount = await approveButtons.count();
        }

        // After approval, Active Crew should be 11 (Captain + 10 Crew)
        await expect(pageAdmin.locator('text=Active Crew (11)')).toBeVisible({ timeout: 5000 });
    });

    test('Captain sets Watch Leaders and generates Schedule', async () => {
        // Switch to Schedule Tab
        await pageAdmin.click('button:text("Schedule")');

        // Click Generate New Schedule
        await pageAdmin.getByRole('button', { name: "Generate New Schedule" }).click();

        await pageAdmin.fill('input[placeholder="e.g. Weekend Trip"]', 'Big Load Test Watch');
        // Select Rotation
        await pageAdmin.click('text=Standard Rotation');
        await pageAdmin.fill('input[type="number"]', '12'); // Duration

        // Crew Per Watch
        await pageAdmin.locator('input[type="number"]').nth(1).fill('2');

        // Click Next
        await pageAdmin.click('button:has-text("Next: Select Crew")');

        // We should see 11 people here (we only select Crew usually, let's select all)
        await pageAdmin.click('button:has-text("Select All")');

        // Toggle Watch Leader for a few crew members
        // We expect the toggle switch to exist because crewPerWatch is 2
        const toggles = pageAdmin.locator('button[role="switch"]');
        const count = await toggles.count();
        expect(count).toBeGreaterThan(0);

        // Turn on Watch Leader for the first 3 (Captain and first two crew)
        for (let i = 0; i < 3; i++) {
            await toggles.nth(i).click();
        }

        // Click Create Schedule
        await pageAdmin.click('button:has-text("Create Schedule (11)")');

        // Publish
        await pageAdmin.click('button:has-text("Publish Watch Schedule")');

        // Wait for matrix view
        await expect(pageAdmin.locator('table')).toBeVisible({ timeout: 10000 });
        // Verify a Watch Leader label exists somewhere in the grid
        await expect(pageAdmin.locator('text=WL').first()).toBeVisible({ timeout: 5000 });
    });

    test('Crew member observes schedule and Check-In flows', async () => {
        // Check one of the crew pages, they should now be on the Dashboard
        const page = crewPages[0];
        // We might need to wait for real-time update or manually reload
        await page.reload();

        // They should be on Dashboard
        await expect(page.locator(`text=${vesselName}`).first()).toBeVisible({ timeout: 15000 });

        // Verify "Schedule" tab works
        await page.click('button:text("Schedule")');
        await expect(page.locator('table')).toBeVisible({ timeout: 10000 });

        // Check if check-in is required based on their own watch bounds.
        // If they are on watch right now, they should have a green/red box.
        // Since we created 11 crew, 2 per watch, that's almost 6 slots. Some will be on watch, some off.

        const watchStatus = await page.locator('text=Current Watch Status:').textContent();
        console.log("Watch Status for Crew 0:", watchStatus);

    });

});
