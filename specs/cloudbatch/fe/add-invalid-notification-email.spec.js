const { test, expect } = require('./fixtures');

// Returns true if navigation succeeded, false if no jobs are configured (caller should test.skip).
async function openJobDetail(page) {
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
  const u1 = page.url();
  const row = page.locator('table tr, [role="row"]').filter({ hasText: /Automation QA/i }).first();
  await row.waitFor({ state: 'visible', timeout: 15_000 });
  const rl = row.locator('a, button').first();
  if (await rl.count() > 0) await rl.click(); else await row.click();
  await page.waitForURL(url => url !== u1, { timeout: 15_000 });
  await page.locator('h1, h2, h3, [role="heading"]').filter({ hasText: /Automation QA/i }).first()
    .waitFor({ state: 'visible', timeout: 20_000 });

  // Click the "Test Jobs" enrichment job link.
  const jobLink = page.locator('a').filter({ hasText: /Test Jobs/i }).first();
  const hasTargetJob = await jobLink.waitFor({ state: 'visible', timeout: 15_000 }).then(() => true).catch(() => false);
  if (!hasTargetJob) return false;
  const u2 = page.url();
  await jobLink.click();
  await page.waitForURL(url => url !== u2, { timeout: 15_000 });
  return true;
}

test.describe('Enrichment Jobs — Validate invalid notification email', () => {
  test('Malformed email (missing TLD) is not added to Job Notifications', async ({ page }) => {
    const hasJob = await openJobDetail(page);
    test.skip(!hasJob, 'No Enrichment Jobs configured for Automation QA — create a job via the admin UI first');

    const emailInput = page.locator('input[type="text"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 10_000 });
    await emailInput.fill('invalid-test-noDomain@');

    const addBtn = page.locator('button').filter({ hasText: /^\+$/ }).first();
    await addBtn.waitFor({ state: 'visible', timeout: 10_000 });

    // App shows a native window.alert() — register the handler BEFORE clicking to avoid deadlock.
    let alertMessage = '';
    page.once('dialog', async dialog => {
      alertMessage = dialog.message();
      await dialog.accept();
    });
    await addBtn.click();
    await page.waitForTimeout(1_000);

    expect(alertMessage).toMatch(/valid email|invalid/i);
  });

  test('Shows "cannot be empty" alert when clicking + with empty email field', async ({ page }) => {
    const hasJob = await openJobDetail(page);
    test.skip(!hasJob, 'No Enrichment Jobs configured for Automation QA — create a job via the admin UI first');

    const emailInput = page.locator('input[type="text"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 10_000 });
    await emailInput.fill('');

    const addBtn = page.locator('button').filter({ hasText: /^\+$/ }).first();
    await addBtn.waitFor({ state: 'visible', timeout: 10_000 });

    // App shows a native window.alert() — register the handler BEFORE clicking to avoid deadlock.
    let alertMessage = '';
    page.once('dialog', async dialog => {
      alertMessage = dialog.message();
      await dialog.accept();
    });
    await addBtn.click();
    await page.waitForTimeout(1_000); // let the alert fire and be accepted

    expect(alertMessage).toMatch(/cannot be empty|email/i);
  });
});
