const { test, expect } = require('./fixtures');
const { ensureUserExists } = require('../helpers/cb-api');

const TEST_USER_EMAIL = 'cb-automation@mailinator.com';
const CUSTOMER_ID     = '0147887';

async function openAutomationQA(page) {
  const link = page.locator('a, [role="link"]').filter({ hasText: /Accounts/i }).first();
  await link.waitFor({ state: 'visible', timeout: 20_000 });
  await link.click();
  await page.locator('h1, h2, [role="heading"]').filter({ hasText: /All Accounts/i }).first()
    .waitFor({ state: 'visible', timeout: 20_000 });
  await page.locator('table tr, [role="row"]').nth(1).waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
  const s = page.locator('input[type="search"], input[placeholder*="search" i]').first();
  if (await s.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await s.fill('Automation QA');
    await s.press('Enter').catch(() => {});
  }
  const urlBefore = page.url();
  const row = page.locator('table tr, [role="row"]').filter({ hasText: /Automation QA/i }).first();
  await row.waitFor({ state: 'visible', timeout: 15_000 });
  const rowLink = row.locator('a, button').first();
  if (await rowLink.count() > 0) await rowLink.click(); else await row.click();
  await page.waitForURL(url => url !== urlBefore, { timeout: 15_000 });
  await page.locator('h1, h2, h3, [role="heading"]').filter({ hasText: /Automation QA/i }).first()
    .waitFor({ state: 'visible', timeout: 20_000 });
}

test.describe('SFTP Users — Disable and re-enable user', () => {
  test.beforeAll(async () => {
    try { await ensureUserExists(CUSTOMER_ID, 'CB Automation', TEST_USER_EMAIL); } catch { /* skip */ }
  });

  test('Toggle user to inactive and verify status in global SFTP Users list', async ({ page }) => {
    await openAutomationQA(page);

    // Navigate to user edit page from account detail
    const sftp = page.locator('h4, [role="heading"]').filter({ hasText: /SFTP Users/i }).first();
    await sftp.waitFor({ state: 'visible', timeout: 15_000 });

    const userRow = page.locator('table tr, [role="row"]').filter({ hasText: /cb-automation@mailinator/i }).first();
    await userRow.waitFor({ state: 'visible', timeout: 10_000 });

    const urlBefore = page.url();
    const editLink = userRow.locator('a[href*="/edit"], a[href*="/users/"]').first();
    if (await editLink.count() > 0) {
      await editLink.click();
    } else {
      const editBtn = userRow.getByRole('button', { name: /edit/i });
      await editBtn.waitFor({ state: 'visible', timeout: 10_000 });
      await editBtn.click();
    }
    await page.waitForURL(url => url !== urlBefore, { timeout: 15_000 });

    // Toggle active status — find the enable/disable checkbox or toggle
    const toggle = page.locator('input[type="checkbox"][name*="active" i], input[type="checkbox"][id*="active" i]').first();
    const toggleVisible = await toggle.isVisible({ timeout: 5_000 }).catch(() => false);
    if (toggleVisible) {
      const wasChecked = await toggle.isChecked().catch(() => true);
      if (wasChecked) {
        await toggle.click();
        await expect.soft(toggle).not.toBeChecked({ timeout: 5_000 });
      }
    } else {
      // Some UIs use a button or role="switch"
      const switchBtn = page.locator('[role="switch"], button').filter({ hasText: /enable|disable|active/i }).first();
      if (await switchBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await switchBtn.click();
      }
    }

    const saveBtn = page.getByRole('button', { name: /save/i }).first();
    await saveBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await saveBtn.click();

    const toast = page.locator('[role="alert"], .toast, [class*="toast"]').first();
    await toast.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});

    // Navigate to global SFTP Users and verify Inactive status
    const sftpLink = page.locator('a, [role="link"]').filter({ hasText: /SFTP Users/i }).first();
    await sftpLink.waitFor({ state: 'visible', timeout: 20_000 });
    await sftpLink.click();
    await page.locator('h1, h2, [role="heading"]').filter({ hasText: /SFTP Users List/i }).first()
      .waitFor({ state: 'visible', timeout: 20_000 });

    // Search input may not match search-specific attributes — fall back to any searchbox/textbox, and
    // continue without it if none is present (the row wait below still validates the user is listed)
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]')
      .or(page.getByRole('searchbox'))
      .or(page.getByRole('textbox'))
      .first();
    if (await searchInput.isVisible({ timeout: 10_000 }).catch(() => false)) {
      // Use the shorter identifier — the global list may not match/display the full email address
      await searchInput.fill('cb-automation');
      await searchInput.press('Enter').catch(() => {});
    }

    const foundRow = page.locator('table tr, [role="row"]').filter({ hasText: /cb-automation/i }).first();
    await foundRow.waitFor({ state: 'visible', timeout: 15_000 });
    const rowText = await foundRow.textContent();
    expect.soft(rowText, 'User status should be Inactive after disabling').toMatch(/inactive|false/i);
  });

  test('Re-enable user after disabling (cleanup)', async ({ page }) => {
    await openAutomationQA(page);

    const sftp = page.locator('h4, [role="heading"]').filter({ hasText: /SFTP Users/i }).first();
    await sftp.waitFor({ state: 'visible', timeout: 15_000 });

    const userRow = page.locator('table tr, [role="row"]').filter({ hasText: /cb-automation@mailinator/i }).first();
    await userRow.waitFor({ state: 'visible', timeout: 10_000 });

    const urlBefore = page.url();
    const editLink = userRow.locator('a[href*="/edit"], a[href*="/users/"]').first();
    if (await editLink.count() > 0) await editLink.click();
    else { const b = userRow.getByRole('button', { name: /edit/i }); await b.waitFor({ state: 'visible', timeout: 10_000 }); await b.click(); }
    await page.waitForURL(url => url !== urlBefore, { timeout: 15_000 });

    const toggle = page.locator('input[type="checkbox"][name*="active" i], input[type="checkbox"][id*="active" i]').first();
    if (await toggle.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const isChecked = await toggle.isChecked().catch(() => false);
      if (!isChecked) await toggle.click();
    }

    const saveBtn = page.getByRole('button', { name: /save/i }).first();
    await saveBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await saveBtn.click();

    await page.locator('[role="alert"], .toast, [class*="toast"]').first()
      .waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
  });
});