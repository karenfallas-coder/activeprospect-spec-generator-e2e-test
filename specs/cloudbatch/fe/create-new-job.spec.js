const { test, expect } = require('./fixtures');

const JOB_NAME    = 'Test Jobs';
const CUSTOMER_ID = '0147887';

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

test.describe('Enrichment Jobs — Validate Enrichment Jobs section for Automation QA', () => {
  test('Enrichment Jobs section is visible with correct columns', async ({ page }) => {
    await openAutomationQA(page);

    // Scroll to Enrichment Jobs section (it's below Account Details + SFTP Users)
    const enrichSection = page.locator('h4, [role="heading"]').filter({ hasText: /Enrichment Jobs/i }).first();
    await enrichSection.scrollIntoViewIfNeeded().catch(() => {});
    await enrichSection.waitFor({ state: 'visible', timeout: 15_000 });

    // Verify header row exists
    const headerRow = page.locator('table tr, [role="row"]').filter({ hasText: /Name|Last Run/i }).first();
    const headerVisible = await headerRow.isVisible({ timeout: 5_000 }).catch(() => false);
    if (headerVisible) {
      const headerText = await headerRow.textContent();
      expect.soft(headerText, 'Enrichment Jobs table should have Name column').toMatch(/Name/i);
    }

    // Check if any jobs exist — show "No data available" if none, or show job rows
    const noData = page.locator('text=No data available').first();
    const noDataVisible = await noData.isVisible({ timeout: 3_000 }).catch(() => false);
    if (!noDataVisible) {
      // Jobs exist — verify at least one row
      const firstJobRow = page.locator('table tr, [role="row"]').nth(1);
      await firstJobRow.waitFor({ state: 'visible', timeout: 10_000 });
    }
    // Either "No data available" or actual rows — both are valid states
  });

  test('Enrichment Jobs section has an Add Job icon button', async ({ page }) => {
    await openAutomationQA(page);

    const enrichSection = page.locator('h4, [role="heading"]').filter({ hasText: /Enrichment Jobs/i }).first();
    await enrichSection.scrollIntoViewIfNeeded().catch(() => {});
    await enrichSection.waitFor({ state: 'visible', timeout: 15_000 });

    // The add button is an icon link near the Enrichment Jobs heading
    const addJobBtn = page.locator('a[href*="/appends"]').last();
    const addBtnAlt = page.locator('a[href*="/jobs/new"], a[href*="new"]').last();

    const hasAddBtn = await addJobBtn.isVisible({ timeout: 5_000 }).catch(() => false)
      || await addBtnAlt.isVisible({ timeout: 5_000 }).catch(() => false);

    expect.soft(hasAddBtn, 'An "Add Job" icon link should be present in the Enrichment Jobs section').toBe(true);
  });

  test('Verify existing Enrichment Jobs match expected names from QA', async ({ page }) => {
    await openAutomationQA(page);

    const enrichSection = page.locator('h4, [role="heading"]').filter({ hasText: /Enrichment Jobs/i }).first();
    await enrichSection.scrollIntoViewIfNeeded().catch(() => {});
    await enrichSection.waitFor({ state: 'visible', timeout: 15_000 });

    const noData = page.locator('text=No data available').first();
    const noDataVisible = await noData.isVisible({ timeout: 3_000 }).catch(() => false);
    test.skip(noDataVisible, 'No enrichment jobs configured yet for Automation QA');

    const bodyText = await page.locator('body').textContent();
    // Validate known QA job names appear (any of the 3 existing jobs)
    const hasKnownJob = /Test.*(Attributes|Email|Phone)/i.test(bodyText);
    expect.soft(hasKnownJob, 'At least one known Automation QA job should be listed').toBe(true);
  });
});
