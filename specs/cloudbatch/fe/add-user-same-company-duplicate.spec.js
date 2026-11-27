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

test.describe('SFTP Users — Duplicate user in same company', () => {
  test.beforeAll(async () => {
    // Guarantee the user exists before trying to add it a second time
    try { await ensureUserExists(CUSTOMER_ID, 'CB Automation', TEST_USER_EMAIL); } catch { /* skip */ }
  });

  test('Shows error when adding a user that already exists in the same account', async ({ page }) => {
    await openAutomationQA(page);

    const sftp = page.locator('h4, [role="heading"]').filter({ hasText: /SFTP Users/i }).first();
    await sftp.waitFor({ state: 'visible', timeout: 15_000 });

    const addIconBtn = page.locator('a[href*="/users/new"]').first();
    const addTextBtn = page.getByRole('button', { name: /add|new/i }).first();
    const urlBefore = page.url();
    if (await addIconBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await addIconBtn.click();
    } else {
      await addTextBtn.waitFor({ state: 'visible', timeout: 10_000 });
      await addTextBtn.click();
    }
    await page.waitForURL(url => url !== urlBefore, { timeout: 15_000 }).catch(() => {});

    const nameInput = page.locator('input[name="username"], input[placeholder*="name" i], input[id*="name" i]').first();
    await nameInput.waitFor({ state: 'visible', timeout: 10_000 });
    await nameInput.fill('Same user same account');

    const emailInput = page.locator('input[type="email"], input[name="email"], input[id*="email" i]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 10_000 });
    await emailInput.fill(TEST_USER_EMAIL);

    const saveBtn = page.getByRole('button', { name: /save/i }).first();
    await saveBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await saveBtn.click();

    const error = page.locator('[role="alert"], .toast, [class*="error"], [class*="toast"]').first();
    await error.waitFor({ state: 'visible', timeout: 10_000 });
    expect(await error.textContent()).toMatch(/already exists|user.*exists/i);
  });
});
