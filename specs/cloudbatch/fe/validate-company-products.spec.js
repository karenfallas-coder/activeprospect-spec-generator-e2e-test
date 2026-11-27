const { test, expect } = require('./fixtures');

test.describe('Accounts — Validate Company Products', () => {
  test.beforeEach(async ({ page }) => {
    const link = page.locator('a, [role="link"]').filter({ hasText: /Accounts/i }).first();
    await link.waitFor({ state: 'visible', timeout: 20_000 });
    await link.click();
    await page.locator('h1, h2, [role="heading"]').filter({ hasText: /All Accounts/i }).first()
      .waitFor({ state: 'visible', timeout: 20_000 });
    await page.locator('table tr, [role="row"]').nth(1)
      .waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
  });

  test('Search "Automation QA" and validate that Product column is not empty', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="filter" i]').first();
    await searchInput.waitFor({ state: 'visible', timeout: 10_000 });
    await searchInput.fill('Automation QA');
    await searchInput.press('Enter').catch(() => {});

    const row = page.locator('table tr, [role="row"]').filter({ hasText: /Automation QA/i }).first();
    await row.waitFor({ state: 'visible', timeout: 15_000 });

    // Product is the 3rd column (index 2): Company | Customer ID | Product
    const productCell = row.locator('td, [role="cell"]').nth(2);
    const productText = (await productCell.textContent() || '').trim();

    expect.soft(productText, 'Product column should not be empty for Automation QA').toBeTruthy();
    // The Products column shows a short label like "attributes, identity" or "Attribute Append"
    expect.soft(productText, 'Product column should reference a product category').toMatch(/append|attributes|identity/i);
  });
});
