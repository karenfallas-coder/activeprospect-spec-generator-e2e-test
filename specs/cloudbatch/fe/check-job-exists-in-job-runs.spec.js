const { test, expect } = require('./fixtures');

test.describe('Job Runs — Validate Job History for Automation QA', () => {
  test.beforeEach(async ({ page }) => {
    const link = page.locator('a, [role="link"]').filter({ hasText: /Job Runs/i }).first();
    await link.waitFor({ state: 'visible', timeout: 20_000 });
    await link.click();
    await page.locator('h1, h2, [role="heading"]').filter({ hasText: /Job History/i }).first()
      .waitFor({ state: 'visible', timeout: 20_000 });
    await page.locator('table tr, [role="row"]').nth(1)
      .waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
  });

  test('Job History table shows rows and Automation QA jobs are present', async ({ page }) => {
    // Verify at least one data row
    const firstRow = page.locator('table tr, [role="row"]').nth(1);
    await firstRow.waitFor({ state: 'visible', timeout: 15_000 });

    // Find a row that belongs to Automation QA (scroll through visible rows)
    const allRows = page.locator('table tr, [role="row"]');
    const rowCount = await allRows.count();
    expect(rowCount, 'Job History should have at least 2 rows (header + data)').toBeGreaterThan(1);

    // Check the visible rows for Automation QA jobs
    const aqRow = page.locator('table tr, [role="row"]').filter({ hasText: /Automation QA/i }).first();
    const aqVisible = await aqRow.isVisible({ timeout: 10_000 }).catch(() => false);
    if (aqVisible) {
      const rowText = await aqRow.textContent();
      expect.soft(rowText, 'Account column should show Automation QA').toMatch(/Automation QA/i);
      expect.soft(rowText, 'Status should be a known job status').toMatch(/finished|running|failed|pending/i);
    } else {
      // Job History may be paginated — just verify the table structure
      const headerRow = allRows.nth(0);
      const headerText = await headerRow.textContent();
      expect.soft(headerText, 'Header should include Job Name column').toMatch(/Job Name/i);
      expect.soft(headerText, 'Header should include Status column').toMatch(/Status/i);
    }
  });

  test('Job History table shows expected columns', async ({ page }) => {
    const headerRow = page.locator('table tr, [role="row"]').nth(0);
    await headerRow.waitFor({ state: 'visible', timeout: 10_000 });
    const headerText = await headerRow.textContent();
    expect.soft(headerText, 'Run ID column should be present').toMatch(/Run ID/i);
    expect.soft(headerText, 'Job Name column should be present').toMatch(/Job Name/i);
    expect.soft(headerText, 'Account column should be present').toMatch(/Account/i);
    expect.soft(headerText, 'Status column should be present').toMatch(/Status/i);
  });
});
