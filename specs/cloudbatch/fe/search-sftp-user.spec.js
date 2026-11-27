const { test, expect } = require('./fixtures');

const TEST_USER_EMAIL = 'cb-automation@mailinator.com';

test.describe('SFTP Users — Search for test user in global list', () => {
  test('Search by email and validate user row fields', async ({ page }) => {
    const link = page.locator('a, [role="link"]').filter({ hasText: /SFTP Users/i }).first();
    await link.waitFor({ state: 'visible', timeout: 20_000 });
    await link.click();
    await page.locator('h1, h2, [role="heading"]').filter({ hasText: /SFTP Users List/i }).first()
      .waitFor({ state: 'visible', timeout: 20_000 });
    await page.locator('table tr, [role="row"]').nth(1)
      .waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});

    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="filter" i]').first();
    await searchInput.waitFor({ state: 'visible', timeout: 10_000 });
    await searchInput.fill(TEST_USER_EMAIL);
    await page.waitForTimeout(1500);

    const rows = page.locator('table tr, [role="row"]');
    const dataRows = (await rows.count()) - 1;
    test.skip(dataRows === 0, `cb-automation@mailinator.com not found in SFTP Users list — run add-new-sftp-user.spec.js first or create the user via the Admin UI`);

    const row = rows.filter({ hasText: /cb-automation@mailinator/i }).first();
    await row.waitFor({ state: 'visible', timeout: 10_000 });

    const rowText = await row.textContent();
    expect(rowText).toMatch(/cb-automation@mailinator\.com/i);
    expect.soft(rowText, 'Account should be Automation QA').toMatch(/Automation QA/i);
    expect.soft(rowText, 'Access Type should be SFTP').toMatch(/SFTP/i);
  });
});
