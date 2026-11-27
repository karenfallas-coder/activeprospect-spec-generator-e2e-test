// spec generated for: Accounts — search for "Automation QA" and verify the company appears in the table
const { test, expect } = require('./fixtures');

const ACCOUNT_NAME = 'Automation QA';
const ACCOUNT_CUSTOMER_ID = '0147887';

test.describe('Accounts — search for "Automation QA"', () => {
  test.beforeEach(async ({ page }) => {
    // Sidebar link text is "Accounts" — page heading is "All Accounts" (CONFIRMED mapping)
    const link = page.locator('a, [role="link"]').filter({ hasText: /Accounts/i }).first();
    await link.waitFor({ state: 'visible', timeout: 20_000 });
    await link.click();

    // Step 1 — confirm the correct page loaded via its heading
    await page.locator('h1, h2, [role="heading"]').filter({ hasText: /All Accounts/i }).first()
      .waitFor({ state: 'visible', timeout: 20_000 });

    // Step 2 — confirm table data has rendered (row 0 is the header)
    await page.locator('table tr, [role="row"]').nth(1)
      .waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
  });

  test('All Accounts page loads with a populated table', async ({ page }) => {
    await expect(
      page.locator('h1, h2, [role="heading"]').filter({ hasText: /All Accounts/i }).first()
    ).toBeVisible({ timeout: 15_000 });

    const rows = page.locator('table tr, [role="row"]');
    await rows.nth(1).waitFor({ state: 'visible', timeout: 15_000 });

    const count = await rows.count();
    expect(count, 'Accounts table should render a header row plus at least one data row').toBeGreaterThan(1);
  });

  test('Accounts table header row renders cells', async ({ page }) => {
    const headerRow = page.locator('table tr, [role="row"]').first();
    await headerRow.waitFor({ state: 'visible', timeout: 15_000 });

    const headerCells = headerRow.locator('th, td, [role="columnheader"], [role="cell"], [role="gridcell"]');
    const headerCellCount = await headerCells.count();
    expect(headerCellCount, 'Header row should expose at least one column').toBeGreaterThan(0);

    const headerText = (await headerRow.textContent() || '').trim();
    expect.soft(headerText, 'Header row should not be empty').toBeTruthy();
    // TODO: exact column header labels were not captured in the DOM snapshot —
    // add explicit header-name assertions once verified against the live DOM.
  });

  test('Search for "Automation QA" and verify the company appears in the table', async ({ page }) => {
    const rows = page.locator('table tr, [role="row"]');
    await rows.nth(1).waitFor({ state: 'visible', timeout: 15_000 });

    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="search" i], input[placeholder*="filter" i]'
    ).first();
    const hasSearch = await searchInput.isVisible({ timeout: 3_000 }).catch(() => false);

    if (hasSearch) {
      await searchInput.fill(ACCOUNT_NAME);
      await searchInput.press('Enter');
      await rows.filter({ hasText: /Automation QA/i }).first()
        .waitFor({ state: 'visible', timeout: 15_000 });
    }

    // Whether filtered via search or found in the full list, the company row must be present
    const accountRow = rows.filter({ hasText: /Automation QA/i }).first();
    await accountRow.waitFor({ state: 'visible', timeout: 15_000 });
    await expect(accountRow, 'Automation QA row should be visible in the Accounts table')
      .toBeVisible({ timeout: 10_000 });

    const rowText = (await accountRow.textContent() || '').trim();
    expect.soft(rowText, 'Matched row should contain the company name').toMatch(/Automation QA/i);
  });

  test('Automation QA row exposes cell content including the customer ID', async ({ page }) => {
    const rows = page.locator('table tr, [role="row"]');
    await rows.nth(1).waitFor({ state: 'visible', timeout: 15_000 });

    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="search" i], input[placeholder*="filter" i]'
    ).first();
    const hasSearch = await searchInput.isVisible({ timeout: 3_000 }).catch(() => false);

    if (hasSearch) {
      await searchInput.fill(ACCOUNT_NAME);
      await searchInput.press('Enter');
      await rows.filter({ hasText: /Automation QA/i }).first()
        .waitFor({ state: 'visible', timeout: 15_000 });
    }

    const accountRow = rows.filter({ hasText: /Automation QA/i }).first();
    await accountRow.waitFor({ state: 'visible', timeout: 15_000 });

    // React Data Table Component may render cells as role="cell" divs instead of <td>
    const cells = accountRow.locator('td, [role="cell"], [role="gridcell"]');
    const cellCount = await cells.count();
    expect(cellCount, 'Matched account row should expose at least one cell').toBeGreaterThan(0);

    const firstCellText = (await cells.nth(0).innerText().catch(() => '')).trim();
    expect.soft(firstCellText, 'First cell should not be empty — data may change between runs').toBeTruthy();

    const rowText = (await accountRow.textContent() || '').trim();
    expect.soft(
      rowText,
      `Row should contain customer_id ${ACCOUNT_CUSTOMER_ID} — update if QA data was regenerated`
    ).toContain(ACCOUNT_CUSTOMER_ID);
  });

  test('Searching for a non-existent company returns no matching row', async ({ page }) => {
    const rows = page.locator('table tr, [role="row"]');
    await rows.nth(1).waitFor({ state: 'visible', timeout: 15_000 });

    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="search" i], input[placeholder*="filter" i]'
    ).first();
    const hasSearch = await searchInput.isVisible({ timeout: 3_000 }).catch(() => false);
    test.skip(!hasSearch, 'No search input available on the All Accounts page');

    const bogusTerm = 'ZZZ_No_Such_Company_ZZZ';
    await searchInput.fill(bogusTerm);
    await searchInput.press('Enter');

    await expect(
      rows.filter({ hasText: /ZZZ_No_Such_Company_ZZZ/i }),
      'No account row should match a non-existent company name'
    ).toHaveCount(0, { timeout: 15_000 });
  });

  test('Clicking the Automation QA row opens the account detail view', async ({ page }) => {
    const rows = page.locator('table tr, [role="row"]');
    await rows.nth(1).waitFor({ state: 'visible', timeout: 15_000 });

    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="search" i], input[placeholder*="filter" i]'
    ).first();
    const hasSearch = await searchInput.isVisible({ timeout: 3_000 }).catch(() => false);

    if (hasSearch) {
      await searchInput.fill(ACCOUNT_NAME);
      await searchInput.press('Enter');
      await rows.filter({ hasText: /Automation QA/i }).first()
        .waitFor({ state: 'visible', timeout: 15_000 });
    }

    const accountRow = rows.filter({ hasText: /Automation QA/i }).first();
    await accountRow.waitFor({ state: 'visible', timeout: 15_000 });

    const urlBefore = page.url();
    const headingBefore = (await page.locator('h1, h2, [role="heading"]').first().textContent().catch(() => '')).trim();
    const rowLink = accountRow.locator('a, button').first();
    if (await rowLink.count() > 0) {
      await rowLink.click();
    } else {
      await accountRow.click();
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

    // Account detail page: h3 heading is the company name, Account Details is a key-value table
    const detailHeading = page.locator('h1, h2, h3, [role="heading"]').filter({ hasText: /Automation QA/i }).first();
    const sawDetailHeading = await detailHeading.isVisible({ timeout: 15_000 }).catch(() => false);
    expect.soft(sawDetailHeading, 'Account detail heading should show the company name').toBe(true);

    const customerIdRow = page.locator('table tr, [role="row"]').filter({ hasText: /Customer ID/i }).first();
    const sawCustomerIdRow = await customerIdRow.isVisible({ timeout: 15_000 }).catch(() => false);
    if (sawCustomerIdRow) {
      const value = (await customerIdRow.locator('td, [role="cell"], [role="gridcell"]').last().textContent() || '').trim();
      expect.soft(
        value,
        `Customer ID should be ${ACCOUNT_CUSTOMER_ID} — update if QA data was regenerated`
      ).toContain(ACCOUNT_CUSTOMER_ID);
    }
  });
});