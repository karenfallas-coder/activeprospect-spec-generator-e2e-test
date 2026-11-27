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

test.describe('Enrichment Jobs — Delete notification email from job', () => {
  test.setTimeout(60_000);

  test('Remove notification email, save, reopen and verify it is gone', async ({ page }) => {
    const hasJob = await openJobDetail(page);
    test.skip(!hasJob, 'No Enrichment Jobs configured for Automation QA — create a job via the admin UI first');

    // Wait for the Job Notifications section to fully render (email input is the anchor)
    // before reading state — a premature read would miss existing emails.
    const emailInput = page.locator('input[type="text"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 20_000 });

    // Check if the email is already in the list; if not, add it first
    const bodyText0 = await page.locator('body').textContent();
    if (!bodyText0.includes('1pe-automation@mailinator')) {
      await emailInput.fill(NOTIFICATION_EMAIL);
      const addBtn = page.locator('button').filter({ hasText: /^\+$/ }).first();
      page.once('dialog', async dialog => { await dialog.accept(); });
      await addBtn.click();
      await expect(page.locator('body')).toContainText('1pe-automation@mailinator', { timeout: 5_000 });
    }

    // Each notification email renders on its own row with a trash-icon delete control to its
    // right (see app UI). Scope to the DEEPEST container that holds BOTH the email text and a
    // delete control (that is the email's row), then click its trash icon. Using .last() picks
    // the innermost matching container so we don't match the whole notification section.
    const emailRow = page.locator('div, li, tr, p')
      .filter({ hasText: /1pe-automation@mailinator/i })
      .filter({ has: page.locator('button, svg, img, i, [class*="trash"], [class*="delete"], [class*="remove"]') })
      .last();
    await emailRow.waitFor({ state: 'visible', timeout: 10_000 });

    // The trash control may be a <button>, or a bare <svg>/<img> icon (click bubbles to its handler).
    const deleteBtn = emailRow.locator('button, svg, img, i, [class*="trash"], [class*="delete"], [class*="remove"]').first();
    await deleteBtn.click();

    // Verify email is removed from the live list (retrying — the DOM updates asynchronously).
    await expect(page.locator('body')).not.toContainText('1pe-automation@mailinator', { timeout: 5_000 });

    // Save the job
    const saveBtn = page.getByRole('button', { name: /^save$/i }).first();
    await saveBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await saveBtn.click();
    await page.locator('[role="alert"], .toast, [class*="toast"]').first()
      .waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});

    // Reopen and confirm email is gone
    await page.locator('a, [role="link"]').filter({ hasText: /Accounts/i }).first().click();
    await page.locator('h1, h2, [role="heading"]').filter({ hasText: /All Accounts/i }).first()
      .waitFor({ state: 'visible', timeout: 20_000 });
    await openJobDetail(page);

    // Wait for the notification section to render before asserting absence — otherwise the
    // pre-render shell (no email) would pass the assertion even if the email is still there.
    await page.locator('input[type="text"]').first().waitFor({ state: 'visible', timeout: 20_000 });
    await expect(page.locator('body')).not.toContainText('1pe-automation@mailinator', { timeout: 15_000 });
  });
});
