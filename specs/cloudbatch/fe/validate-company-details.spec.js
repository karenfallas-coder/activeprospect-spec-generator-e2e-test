const { test, expect } = require('./fixtures');

test.describe('Accounts — Validate Company Details', () => {
  test('Open Automation QA and validate all detail fields', async ({ page }) => {
    // Navigate to Accounts
    const link = page.locator('a, [role="link"]').filter({ hasText: /Accounts/i }).first();
    await link.waitFor({ state: 'visible', timeout: 20_000 });
    await link.click();
    await page.locator('h1, h2, [role="heading"]').filter({ hasText: /All Accounts/i }).first()
      .waitFor({ state: 'visible', timeout: 20_000 });
    await page.locator('table tr, [role="row"]').nth(1)
      .waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});

    // Search for Automation QA
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    if (await searchInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await searchInput.fill('Automation QA');
      await searchInput.press('Enter').catch(() => {});
    }

    // Click Automation QA row
    const urlBefore = page.url();
    const row = page.locator('table tr, [role="row"]').filter({ hasText: /Automation QA/i }).first();
    await row.waitFor({ state: 'visible', timeout: 15_000 });
    const rowLink = row.locator('a, button').first();
    if (await rowLink.count() > 0) await rowLink.click(); else await row.click();
    await page.waitForURL(url => url !== urlBefore, { timeout: 15_000 });

    // Account detail heading
    await page.locator('h1, h2, h3, [role="heading"]').filter({ hasText: /Automation QA/i }).first()
      .waitFor({ state: 'visible', timeout: 20_000 });
    await page.locator('h4, [role="heading"]').filter({ hasText: /Account Details/i }).first()
      .waitFor({ state: 'visible', timeout: 15_000 });

    // Wait for the Account Details table to load — Customer ID should appear in the page
    await page.locator('text=0147887').first()
      .waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});

    const bodyText = await page.locator('body').textContent();
    expect.soft(bodyText, 'Page should display customer ID 0147887').toMatch(/0147887/);
    expect.soft(bodyText, 'Page should display company name Automation QA').toMatch(/Automation QA/i);
    expect.soft(bodyText, 'Page should list at least one product').toMatch(/append|attributes|identity|product/i);
  });
});
