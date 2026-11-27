const { test, expect } = require('./fixtures');

test.describe('Accounts — Search Company', () => {
  test.beforeEach(async ({ page }) => {
    const link = page.locator('a, [role="link"]').filter({ hasText: /Accounts/i }).first();
    await link.waitFor({ state: 'visible', timeout: 20_000 });
    await link.click();
    await page.locator('h1, h2, [role="heading"]').filter({ hasText: /All Accounts/i }).first()
      .waitFor({ state: 'visible', timeout: 20_000 });
    await page.locator('table tr, [role="row"]').nth(1)
      .waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
  });

  test('Search for "Automation QA" and validate company name and Customer ID', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="filter" i]').first();
    await searchInput.waitFor({ state: 'visible', timeout: 10_000 });
    await searchInput.fill('Automation QA');
    await searchInput.press('Enter').catch(() => {});

    const row = page.locator('table tr, [role="row"]').filter({ hasText: /Automation QA/i }).first();
    await row.waitFor({ state: 'visible', timeout: 15_000 });

    const rowText = await row.textContent();
    expect(rowText).toMatch(/Automation QA/i);
    expect(rowText).toMatch(/0147887/);
  });
});
