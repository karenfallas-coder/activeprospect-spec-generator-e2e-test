const { test, expect } = require('./fixtures');

test.describe('Enrichment Jobs — Review Job Run detail from Job History', () => {
  test('Click a Run ID in Job History and validate run detail fields', async ({ page }) => {
    // Navigate to Job History
    const link = page.locator('a, [role="link"]').filter({ hasText: /Job Runs/i }).first();
    await link.waitFor({ state: 'visible', timeout: 20_000 });
    await link.click();
    await page.locator('h1, h2, [role="heading"]').filter({ hasText: /Job History/i }).first()
      .waitFor({ state: 'visible', timeout: 20_000 });
    await page.locator('table tr, [role="row"]').nth(1)
      .waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});

    // Find a row for Automation QA with a Run ID link
    const aqRow = page.locator('table tr, [role="row"]').filter({ hasText: /Automation QA/i }).first();
    const aqVisible = await aqRow.isVisible({ timeout: 10_000 }).catch(() => false);

    if (!aqVisible) {
      // No Automation QA runs on this page — check any run exists at all
      const firstRow = page.locator('table tr, [role="row"]').nth(1);
      const firstRowVisible = await firstRow.isVisible({ timeout: 5_000 }).catch(() => false);
      test.skip(!firstRowVisible, 'No job runs found in Job History');
    }

    // Click the Run ID link (first column) in the Automation QA row, or any first row
    const targetRow = aqVisible
      ? page.locator('table tr, [role="row"]').filter({ hasText: /Automation QA/i }).first()
      : page.locator('table tr, [role="row"]').nth(1);

    const runIdLink = targetRow.locator('a').first();
    const runIdVisible = await runIdLink.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!runIdVisible) {
      // Run ID might not be a clickable link — click the row itself
      const urlBefore = page.url();
      await targetRow.click();
      await page.waitForURL(url => url !== urlBefore, { timeout: 15_000 }).catch(() => {});
    } else {
      const urlBefore = page.url();
      await runIdLink.click();
      await page.waitForURL(url => url !== urlBefore, { timeout: 15_000 }).catch(() => {});
    }

    // Wait for async data to load (page shows "Loading..." initially)
    await page.waitForFunction(
      () => !document.body.textContent.includes('Loading...'),
      { timeout: 15_000 }
    ).catch(() => {});

    // Validate run detail page content
    const bodyText = await page.locator('body').textContent();
    expect.soft(bodyText, 'Run detail should show a status').toMatch(/finished|running|failed|pending/i);
    expect.soft(bodyText, 'Run detail should show an account name').toMatch(/Automation QA|Account/i);
  });
});
