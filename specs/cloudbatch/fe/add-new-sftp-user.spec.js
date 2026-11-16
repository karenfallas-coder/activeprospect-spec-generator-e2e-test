const { test, expect } = require('./fixtures');

const TEST_USER_NAME  = 'CB Automation';
const TEST_USER_EMAIL = 'cb-automation@mailinator.com';

async function openAutomationQA(page) {
  const link = page.locator('a, [role="link"]').filter({ hasText: /Accounts/i }).first();
  await link.waitFor({ state: 'visible', timeout: 20_000 });
  await link.click();
  await page.locator('h1, h2, [role="heading"]').filter({ hasText: /All Accounts/i }).first()
    .waitFor({ state: 'visible', timeout: 20_000 });
  await page.locator('table tr, [role="row"]').nth(1).waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
  const s = page.locator('input[type="search"], input[placeholder*="search" i]').first();
  if (await s.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await s.fill('Automation QA'); await s.press('Enter').catch(() => {});
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

test.describe('SFTP Users — Add new user via UI (idempotent)', () => {
  test('Ensure cb-automation user exists in Automation QA account SFTP Users section', async ({ page }) => {
    await openAutomationQA(page);

    const sftp = page.locator('h4, [role="heading"]').filter({ hasText: /SFTP Users/i }).first();
    await sftp.waitFor({ state: 'visible', timeout: 15_000 });

    // Check if user already exists in the account's SFTP Users section
    const existingRow = page.locator('table tr, [role="row"]').filter({ hasText: /cb-automation@mailinator/i }).first();
    const alreadyExists = await existingRow.isVisible({ timeout: 5_000 }).catch(() => false);

    if (alreadyExists) {
      const rowText = await existingRow.textContent();
      expect(rowText).toMatch(/cb-automation@mailinator\.com/i);
      return; // User exists — test passes without creating a duplicate
    }

    // User doesn't exist — create via UI
    const addBtn = page.locator('a[href*="/users/new"]').first();
    const addBtnAlt = page.getByRole('button', { name: /add|new/i }).first();
    const urlBefore = page.url();

    if (await addBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await addBtn.click();
    } else {
      await addBtnAlt.waitFor({ state: 'visible', timeout: 10_000 });
      await addBtnAlt.click();
    }
    await page.waitForURL(url => url !== urlBefore, { timeout: 15_000 });

    const nameInput = page.locator('input[name="username"], input[id*="name" i], input[placeholder*="name" i]').first();
    await nameInput.waitFor({ state: 'visible', timeout: 10_000 });
    await nameInput.fill(TEST_USER_NAME);

    const emailInput = page.locator('input[type="email"], input[name="email"], input[id*="email" i]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 10_000 });
    await emailInput.fill(TEST_USER_EMAIL);

    const saveBtn = page.getByRole('button', { name: /save/i }).first();
    await saveBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await saveBtn.click();

    // Success: should redirect back to account or show toast
    await page.locator('[role="alert"], .toast, [class*="toast"]').first()
      .waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});

    // Navigate back to account to verify user appears in SFTP Users section
    await openAutomationQA(page);
    const sftp2 = page.locator('h4, [role="heading"]').filter({ hasText: /SFTP Users/i }).first();
    await sftp2.waitFor({ state: 'visible', timeout: 15_000 });
    const newRow = page.locator('table tr, [role="row"]').filter({ hasText: /cb-automation@mailinator/i }).first();
    await newRow.waitFor({ state: 'visible', timeout: 15_000 });
    expect(await newRow.textContent()).toMatch(/cb-automation@mailinator\.com/i);
  });
});
