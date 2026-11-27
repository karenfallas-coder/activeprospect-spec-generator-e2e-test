const { test, expect } = require('./fixtures');

const NOTIFICATION_EMAIL = '1pe-automation@mailinator.com';

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

test.describe('Enrichment Jobs — Edit Job Notification email', () => {
  test.setTimeout(60_000);

  test('Add notification email, save, reopen and verify it persists', async ({ page }) => {
    const hasJob = await openJobDetail(page);
    test.skip(!hasJob, 'Job "Test Jobs" not found in Automation QA Enrichment Jobs table');

    // Wait for the Job Notifications section to fully render before checking state.
    // The email field is input[type="text"] with no placeholder/name/id — it is the anchor
    // that confirms the section (including any existing emails) has rendered. Reading the
    // body text before this renders would falsely report the email as absent and add a duplicate.
    const emailInput = page.locator('input[type="text"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 20_000 });

    // Idempotency: only add the email if it is not already present (avoids duplicates).
    const bodyText0 = await page.locator('body').textContent();
    const alreadyPresent = bodyText0.includes('1pe-automation@mailinator');

    if (!alreadyPresent) {
      await emailInput.fill(NOTIFICATION_EMAIL);

      const addBtn = page.locator('button').filter({ hasText: /^\+$/ }).first();
      await addBtn.waitFor({ state: 'visible', timeout: 10_000 });

      // Register dialog handler before clicking — the app uses window.alert() for validation errors.
      page.once('dialog', async dialog => { await dialog.accept(); });
      await addBtn.click();

      // Wait for the email to appear in the list before saving.
      await expect(page.locator('body')).toContainText('1pe-automation@mailinator', { timeout: 5_000 });
    }

    // Save the job
    const saveBtn = page.getByRole('button', { name: /^save$/i }).first();
    await saveBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await saveBtn.click();
    await page.locator('[role="alert"], .toast, [class*="toast"]').first()
      .waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});

    // Reopen the job to verify persistence
    await page.locator('a, [role="link"]').filter({ hasText: /Accounts/i }).first().click();
    await page.locator('h1, h2, [role="heading"]').filter({ hasText: /All Accounts/i }).first()
      .waitFor({ state: 'visible', timeout: 20_000 });
    await openJobDetail(page);

    // Wait for the notification section to render again, then assert with a retrying matcher.
    // (A one-shot body.textContent() read can capture the pre-render shell and fail spuriously.)
    await page.locator('input[type="text"]').first().waitFor({ state: 'visible', timeout: 20_000 });
    await expect(page.locator('body')).toContainText('1pe-automation@mailinator', { timeout: 15_000 });
  });
});
