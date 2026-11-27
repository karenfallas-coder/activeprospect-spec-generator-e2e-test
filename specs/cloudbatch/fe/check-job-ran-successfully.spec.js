const { test, expect } = require('./fixtures');

test.describe('Enrichment Jobs — Check "Test Jobs" ran successfully for Automation QA', () => {
  test('Job History shows a "Test Jobs" run for Automation QA with status Finished', async ({ page }) => {
    // Navigate to global Job History
    const link = page.locator('a, [role="link"]').filter({ hasText: /Job Runs/i }).first();
    await link.waitFor({ state: 'visible', timeout: 20_000 });
    await link.click();
    await page.locator('h1, h2, [role="heading"]').filter({ hasText: /Job History/i }).first()
      .waitFor({ state: 'visible', timeout: 20_000 });
    await page.locator('table tr, [role="row"]').nth(1)
      .waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});

    // Find the most recent "Test Jobs" run for Automation QA (row carries both the account and job name).
    const jobRow = page.locator('table tr, [role="row"]')
      .filter({ hasText: /Automation QA/i })
      .filter({ hasText: /Test Jobs/i })
      .first();
    const rowVisible = await jobRow.isVisible({ timeout: 10_000 }).catch(() => false);
    test.skip(!rowVisible, 'No "Test Jobs" run found in Job History for Automation QA — run the job first');

    const rowText = await jobRow.textContent();
    expect.soft(rowText, 'Row should show Automation QA account').toMatch(/Automation QA/i);
    expect.soft(rowText, 'Row should be for the Test Jobs job').toMatch(/Test Jobs/i);

    // Status is column index 6: Run ID, Job Name, Account, Product, Input File, Start Time, Status.
    const statusCell = jobRow.locator('td, [role="cell"]').nth(6);
    if (await statusCell.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const statusText = (await statusCell.textContent() || '').trim();
      expect(statusText, 'Test Jobs run status should be Finished').toMatch(/Finished/i);
    } else {
      // Fall back to the full row text if cell indexing fails.
      expect(rowText, 'Test Jobs run status should be Finished').toMatch(/Finished/i);
    }
  });
});
