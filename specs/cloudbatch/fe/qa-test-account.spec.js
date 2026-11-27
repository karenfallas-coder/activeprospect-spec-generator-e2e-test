// spec generated for: Accounts — search for "Automation QA" and verify the company appears in the table
const { test, expect } = require('./fixtures');

// Test data taken verbatim from the TEST DATA REFERENCE and the Accounts accessibility tree
const COMPANY_NAME = 'Automation QA';
const CUSTOMER_ID = '0147887';

// Values confirmed in the "All Accounts" accessibility tree
const ROW_SELECTOR = 'table tr, [role="row"]';
const CELL_SELECTOR = 'td, [role="cell"], [role="gridcell"]';

/**
 * Finds the search input on the All Accounts page.
 * The DOM snapshot shows no global search box. Each column header has its own
 * textbox filter, for example columnheader "Company ▲" > textbox.
 * The column filter is preferred. A generic search/filter input is the fallback.
 */
async function findSearchInput(page, columnHeaderPattern) {
  const columnFilter = page
    .getByRole('columnheader', { name: columnHeaderPattern })
    .getByRole('textbox')
    .first();
  if (await columnFilter.isVisible({ timeout: 5_000 }).catch(() => false)) {
    return columnFilter;
  }

  const genericSearch = page
    .locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="filter" i]')
    .first();
  if (await genericSearch.isVisible({ timeout: 3_000 }).catch(() => false)) {
    return genericSearch;
  }

  return null;
}

test.describe('Accounts — search for Automation QA', () => {
  test.beforeEach(async ({ page }) => {
    // Sidebar link text "Accounts" maps to the page heading "All Accounts" (confirmed in the DOM)
    const link = page.locator('a, [role="link"]').filter({ hasText: /Accounts/i }).first();
    await link.waitFor({ state: 'visible', timeout: 20_000 });
    await link.click();

    // Step 1: wait for the page heading
    await page.locator('h1, h2, [role="heading"]').filter({ hasText: /All Accounts/i }).first()
      .waitFor({ state: 'visible', timeout: 20_000 });

    // Step 2: wait for the first data row (row 0 is the header)
    await page.locator(ROW_SELECTOR).nth(1)
      .waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
  });

  test('All Accounts table loads with data rows', async ({ page }) => {
    await page.locator(ROW_SELECTOR).nth(1).waitFor({ state: 'visible', timeout: 15_000 });
    const count = await page.locator(ROW_SELECTOR).count();
    expect(count).toBeGreaterThan(1);

    const firstRowCells = page.locator(ROW_SELECTOR).nth(1).locator(CELL_SELECTOR);
    const cellCount = await firstRowCells.count();
    expect(cellCount, 'Data row should have at least one cell').toBeGreaterThan(0);
  });

  test('All Accounts table shows the expected column headers', async ({ page }) => {
    // Column header names come from the accessibility tree.
    // Each one has a "▲" suffix, so substring regexes are used.
    const expectedHeaders = [/Customer ID/i, /Company/i, /Product Family/i, /Updated by/i, /Active/i];
    for (const header of expectedHeaders) {
      const columnHeader = page.getByRole('columnheader', { name: header }).first();
      await columnHeader.waitFor({ state: 'visible', timeout: 15_000 });
      await expect(columnHeader).toBeVisible();
    }
  });

  test('Searching the Company column for "Automation QA" shows the company in the table', async ({ page }) => {
    const searchInput = await findSearchInput(page, /Company/i);
    expect(searchInput, 'A Company column filter or search input should be present on All Accounts').not.toBeNull();

    await searchInput.fill(COMPANY_NAME);
    await searchInput.press('Enter');

    // Wait for the DOM result. Never wait for a fixed timeout.
    const targetRow = page.locator(ROW_SELECTOR).filter({ hasText: /Automation QA/i }).first();
    await targetRow.waitFor({ state: 'visible', timeout: 15_000 });
    await expect(targetRow).toBeVisible();

    // The company name is rendered as a link inside the Company cell (confirmed in the DOM)
    const companyLink = targetRow.locator('a, [role="link"]').filter({ hasText: /Automation QA/i }).first();
    await expect(companyLink).toBeVisible({ timeout: 10_000 });

    // Data-value checks are soft because the values may change between QA runs
    const rowText = (await targetRow.textContent()) || '';
    expect.soft(rowText, 'Automation QA row should show customer ID 0147887 — update if data was regenerated')
      .toContain(CUSTOMER_ID);

    const cells = targetRow.locator(CELL_SELECTOR);
    const firstCellText = ((await cells.nth(0).innerText().catch(() => '')) || '').trim();
    expect.soft(firstCellText, 'Customer ID cell value may change — update if data was regenerated')
      .toBe(CUSTOMER_ID);

    // The filter should remove non-matching accounts.
    // "All appends 1" is the first row in the unfiltered snapshot.
    await expect.soft(
      page.locator(ROW_SELECTOR).filter({ hasText: /All appends 1/i }),
      'Non-matching account rows should be filtered out'
    ).toHaveCount(0, { timeout: 10_000 });
  });

  test('Searching the Customer ID column for 0147887 shows Automation QA', async ({ page }) => {
    const searchInput = await findSearchInput(page, /Customer ID/i);
    expect(searchInput, 'A Customer ID column filter or search input should be present on All Accounts').not.toBeNull();

    await searchInput.fill(CUSTOMER_ID);
    await searchInput.press('Enter');

    const targetRow = page.locator(ROW_SELECTOR).filter({ hasText: /0147887/i }).first();
    await targetRow.waitFor({ state: 'visible', timeout: 15_000 });
    await expect(targetRow).toBeVisible();

    const rowText = (await targetRow.textContent()) || '';
    expect.soft(rowText, 'Customer 0147887 should be the Automation QA company — update if data was regenerated')
      .toMatch(/Automation QA/i);
  });

  test('Clicking the searched Automation QA row opens the account detail view', async ({ page }) => {
    const searchInput = await findSearchInput(page, /Company/i);
    expect(searchInput, 'A Company column filter or search input should be present on All Accounts').not.toBeNull();

    await searchInput.fill(COMPANY_NAME);
    await searchInput.press('Enter');
    await page.locator(ROW_SELECTOR).filter({ hasText: /Automation QA/i }).first()
      .waitFor({ state: 'visible', timeout: 15_000 });

    // Make sure the first data row is the filtered Automation QA row before using the row-click pattern
    await expect(page.locator(ROW_SELECTOR).nth(1)).toContainText(/Automation QA/i, { timeout: 15_000 });

    const urlBefore = page.url();
    const headingBefore = (await page.locator('h1, h2, [role="heading"]').first().textContent().catch(() => '')).trim();
    const firstDataRow = page.locator('table tr, [role="row"]').nth(1);
    const rowLink = firstDataRow.locator('a, button').first();
    if (await rowLink.count() > 0) {
      await rowLink.click();
    } else {
      await firstDataRow.click();
    }
    let opened = null;
    for (let i = 0; i < 10 && !opened; i++) {
      await page.waitForTimeout(500);
      if (page.url() !== urlBefore) { opened = 'url-changed'; break; }
      if (await page.locator('[role="dialog"]').first().isVisible().catch(() => false)) { opened = 'dialog'; break; }
      const h = (await page.locator('h1, h2, [role="heading"]').first().textContent().catch(() => '')).trim();
      if (h !== headingBefore && h.length > 0) { opened = 'heading-changed'; break; }
    }
    expect.soft(opened, 'Row click should open a detail view').not.toBeNull();

    // Detail page headings confirmed in the DOM: h3 "Automation QA" and h4 "Account Details"
    const detailHeading = page.locator('h3, [role="heading"]').filter({ hasText: /Automation QA/i }).first();
    await detailHeading.waitFor({ state: 'visible', timeout: 15_000 });
    await expect(detailHeading).toBeVisible();

    const accountDetailsHeading = page.locator('h4, [role="heading"]').filter({ hasText: /Account Details/i }).first();
    await accountDetailsHeading.waitFor({ state: 'visible', timeout: 15_000 });
    await expect(accountDetailsHeading).toBeVisible();

    expect.soft(page.url(), 'Detail URL should reference customer ID 0147887 — update if data was regenerated')
      .toContain(`/accounts/${CUSTOMER_ID}`);
  });
});