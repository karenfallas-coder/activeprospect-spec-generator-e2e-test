const { test, expect } = require('./fixtures');

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
    .waitFor({ state: 'visible', timeout: 20_002 });
}

test.describe('SFTP Users — Add user with invalid @activeprospect.com domain', () => {
  test('Shows error when trying to add a user with @activeprospect.com email', async ({ page }) => {
    await openAutomationQA(page);

    // Navigate to SFTP Users section within the account
    const sftp = page.locator('h4, [role="heading"]').filter({ hasText: /SFTP Users/i }).first();
    await sftp.waitFor({ state: 'visible', timeout: 15_000 });

    // Click icon-link "Add User" in the SFTP Users section (no text — icon only)
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

    // Fill in the form
    const nameInput = page.locator('input[name="username"], input[placeholder*="name" i], input[id*="name" i]').first();
    await nameInput.waitFor({ state: 'visible', timeout: 10_000 });
    await nameInput.fill('Test Email AP');

    const emailInput = page.locator('input[type="email"], input[name="email"], input[id*="email" i]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 10_000 });
    await emailInput.fill('1pe_automation@activeprospect.com');

    const saveBtn = page.getByRole('button', { name: /save/i }).first();
    await saveBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await saveBtn.click();

    // Expect error — SFTP users cannot use @activeprospect.com
    const error = page.locator('[role="alert"], .toast, [class*="error"], [class*="toast"]').first();
    await error.waitFor({ state: 'visible', timeout: 10_000 });
    expect(await error.textContent()).toMatch(/activeprospect\.com|invalid domain|cannot use/i);
  });
});
