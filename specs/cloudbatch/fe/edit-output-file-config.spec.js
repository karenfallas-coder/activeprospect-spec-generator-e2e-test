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

test.describe('Enrichment Jobs — Edit Output File Configuration (Default Layout)', () => {
  test.setTimeout(60_000);

  test('Open Output File Layout, validate CSV/COMMA defaults, click Submit', async ({ page }) => {
    const hasJob = await openJobDetail(page);
    test.skip(!hasJob, 'No Enrichment Jobs configured for Automation QA — create a job via the admin UI first');

    // Find the "File Layout" button in the Output File Configuration section
    // There may be two "File Layout" buttons — use the one in the Output section
    const outputSection = page.locator('section, [class*="section"], div').filter({ hasText: /Output File Config/i }).first();
    let fileLayoutBtn;
    if (await outputSection.isVisible({ timeout: 5_000 }).catch(() => false)) {
      fileLayoutBtn = outputSection.getByRole('button', { name: /file layout/i }).first();
    } else {
      // Fall back to the second File Layout button on the page (output comes after input)
      fileLayoutBtn = page.getByRole('button', { name: /file layout/i }).nth(1);
    }
    await fileLayoutBtn.waitFor({ state: 'visible', timeout: 15_000 });
    await fileLayoutBtn.click();

    // Validate default values
    const bodyText = await page.locator('body').textContent();
    expect.soft(bodyText, 'Default Layout should be mentioned').toMatch(/Default Layout/i);
    expect.soft(bodyText, 'File Format should be CSV').toMatch(/CSV/i);
    expect.soft(bodyText, 'Delimiter should be COMMA').toMatch(/COMMA/i);

    // Click Submit (or "Submit for Default Layout")
    const submitBtn = page.getByRole('button', { name: /submit/i }).first();
    await submitBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await submitBtn.click();

    await page.locator('[role="alert"], .toast, [class*="toast"]').first()
      .waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
  });
});
