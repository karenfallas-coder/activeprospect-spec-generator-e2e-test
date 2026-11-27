const { test, expect } = require('./fixtures');

// Expected Run ID values for the "Test Jobs" enrichment job (product: Attribute Append - All).
const EXPECTED = {
  account:   'Automation QA',
  inputFile: 'CB_Automation_File.csv',
  status:    'Finished',
  product:   'Attribute Append - All',
};
const LOG_MESSAGE = 'Execution finished successfully';

// Navigate: Accounts → Automation QA detail → click the "Test Jobs" enrichment job link.
// Returns true if the job detail opened, false if the "Test Jobs" job does not exist (caller skips).
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

test.describe('Enrichment Jobs — Validate Run ID details and execution logs (Test Jobs)', () => {
  test.setTimeout(90_000);

  test('Open Test Jobs run detail, validate fields and "Execution finished successfully" log', async ({ page }) => {
    const hasJob = await openJobDetail(page);
    test.skip(!hasJob, 'Job "Test Jobs" not found in Automation QA Enrichment Jobs table');

    // Go to the "Job Status" section — the job detail lists its runs there with a Run ID link.
    const jobStatus = page.locator('h2, h3, h4, [role="heading"]').filter({ hasText: /Job Status/i }).first();
    await jobStatus.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});

    // Locate a Run ID link. Runs render in a table under Job Status; the Run ID is the first
    // clickable link of a data row. Skip if the job has never run (no runs listed).
    const runRow = page.locator('table tr, [role="row"]').filter({ has: page.locator('a') }).first();
    const hasRun = await runRow.waitFor({ state: 'visible', timeout: 15_000 }).then(() => true).catch(() => false);
    test.skip(!hasRun, 'Job "Test Jobs" has no runs yet — upload a file to inbound to trigger a run first');

    const runIdLink = runRow.locator('a').first();
    const u3 = page.url();
    await runIdLink.click();
    await page.waitForURL(url => url !== u3, { timeout: 15_000 }).catch(() => {});

    // The run detail page loads asynchronously ("Loading..." shows first).
    await page.waitForFunction(
      () => !document.body.textContent.includes('Loading...'),
      { timeout: 15_000 }
    ).catch(() => {});

    // Validate the Run ID detail fields. These render as key/value pairs; assert on the page text
    // (retrying matcher) so async rendering doesn't cause spurious failures.
    const body = page.locator('body');
    await expect(body, 'Account should be Automation QA').toContainText(EXPECTED.account, { timeout: 15_000 });
    await expect(body, 'Input File should be CB_Automation_File.csv').toContainText(EXPECTED.inputFile, { timeout: 10_000 });
    await expect(body, 'Status should be Finished').toContainText(EXPECTED.status, { timeout: 10_000 });
    await expect(body, 'Product should be Attribute Append - All').toContainText(EXPECTED.product, { timeout: 10_000 });

    // Go to the "General Logs" section. It may be a section heading already visible, or a
    // button/link that reveals the logs — click it when it is interactive.
    const generalLogsBtn = page.locator('button, a').filter({ hasText: /General Logs/i }).first();
    if (await generalLogsBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await generalLogsBtn.click().catch(() => {});
    } else {
      await page.locator('h2, h3, h4, [role="heading"]').filter({ hasText: /General Logs/i }).first()
        .waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
    }

    // Validate the success log message exists in the General Logs.
    await expect(body, 'General Logs should contain the "Execution finished successfully." message')
      .toContainText(LOG_MESSAGE, { timeout: 15_000 });
  });
});
