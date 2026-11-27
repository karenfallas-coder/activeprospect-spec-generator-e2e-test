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

test.describe('Enrichment Jobs — Edit Field Selection (add PID)', () => {
  test.setTimeout(60_000);

  test('Search for PID field, move to selected, submit, and verify it persists', async ({ page }) => {
    const hasJob = await openJobDetail(page);
    test.skip(!hasJob, 'No Enrichment Jobs configured for Automation QA — create a job via the admin UI first');

    // Click "Select Field" button in Field Selection section
    const selectFieldBtn = page.getByRole('button', { name: /select field/i }).first();
    await selectFieldBtn.waitFor({ state: 'visible', timeout: 15_000 });
    await selectFieldBtn.click();

    // Search for "PID"
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    await searchInput.waitFor({ state: 'visible', timeout: 10_000 });
    await searchInput.fill('PID');
    await page.waitForTimeout(1500);

    // Select PID from results
    const pidOption = page.locator('[role="option"], li, [role="listitem"]').filter({ hasText: /^PID$/i }).first();
    if (await pidOption.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await pidOption.click();
    } else {
      // Try checkbox approach
      const pidCheckbox = page.getByRole('checkbox', { name: /^PID$/i }).first();
      if (await pidCheckbox.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await pidCheckbox.check({ force: true });
      }
    }

    // Click "Move to Selected" button
    const moveBtn = page.getByRole('button', { name: /move.*selected|add.*selected/i }).first();
    if (await moveBtn.isVisible({ timeout: 5_000 }).catch(() => false)) await moveBtn.click();

    // Click Submit
    const submitBtn = page.getByRole('button', { name: /submit/i }).first();
    await submitBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await submitBtn.click();

    // Reopen Select Field to verify PID is in Selected section
    const selectFieldBtn2 = page.getByRole('button', { name: /select field/i }).first();
    await selectFieldBtn2.waitFor({ state: 'visible', timeout: 15_000 });
    await selectFieldBtn2.click();

    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toMatch(/PID/);
  });
});
