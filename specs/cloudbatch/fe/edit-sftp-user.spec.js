const { test, expect } = require('./fixtures');

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

test.describe('SFTP Users — Edit user, verify email is non-editable', () => {
  test('Open edit form for cb-automation user and verify email field is read-only', async ({ page }) => {
    await openAutomationQA(page);

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

    // Verify email field is disabled / readonly
    const emailInput = page.locator('input[type="email"], input[name="email"], input[id*="email" i]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 10_000 });
    const isDisabled = await emailInput.isDisabled().catch(() => false);
    const isReadOnly = await emailInput.evaluate(el => el.readOnly).catch(() => false);
    expect.soft(isDisabled || isReadOnly, 'Email field should be disabled or read-only').toBe(true);

    // Verify Save button is present (form is editable)
    const saveBtn = page.getByRole('button', { name: /save/i }).first();
    await saveBtn.waitFor({ state: 'visible', timeout: 10_000 });
    expect(await saveBtn.isVisible()).toBe(true);
  });
});
