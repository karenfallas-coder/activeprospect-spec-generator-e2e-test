// spec generated for: Home dashboard - Failed Runs count is 0 and Needs attention shows "No failed job runs in the last 7 days."
const { test, expect } = require('./fixtures');

// Values below come verbatim from the QA flow text and the Home page accessibility snapshot.
//   - "Home" sidebar link: confirmed in the accessibility tree (navigation > list > link "Home").
//   - "welcome to the First Party Enrichment admin tool": confirmed in the Home snapshot text.
//   - "Loading...": confirmed in the Home snapshot. This is a transient state while the dashboard loads.
//   - "Failed Runs", "Needs attention", "No failed job runs in the last 7 days.": taken verbatim from the flow.
//     They do not appear in the snapshot because it was captured while the dashboard showed "Loading...".
//   - The Failed Runs label renders as "FAILED RUNS (7D)" (from the failing test output); the number is outside that label element.
const WELCOME_TEXT = /welcome to the First Party Enrichment admin tool/i;
const LOADING_TEXT = /Loading\.\.\./i;
const FAILED_RUNS_LABEL = /Failed Runs/i;
const NEEDS_ATTENTION_LABEL = /Needs attention/i;
const NO_FAILED_RUNS_MESSAGE = 'No failed job runs in the last 7 days.';
const NO_FAILED_RUNS_REGEX = /No failed job runs in the last 7 days\./i;

// A number that is NOT the "(7D)" part of the label: either after the "(7D)" label or before the label.
const FAILED_RUNS_WITH_VALUE = /Failed Runs\s*\(\d+\s*d\)[\s\S]*\d|\d[\s\S]*Failed Runs/i;

// Generic container tags that may wrap a dashboard card. Only text filters are used, never class names.
const CONTAINER_SELECTOR = 'div, li, section, article, aside, [role="region"], [role="group"]';

/**
 * Returns the innermost container that holds the "Failed Runs" label plus a numeric value
 * (the value is a sibling of the "FAILED RUNS (7D)" label, so the "7" in "7D" must not count).
 * Locator filters match every ancestor, and ancestors come before descendants in document order.
 * So .last() picks the most specific (deepest) container that matches the filters.
 */
function failedRunsCard(page) {
  return page
    .locator(CONTAINER_SELECTOR)
    .filter({ hasText: FAILED_RUNS_LABEL })
    .filter({ hasText: FAILED_RUNS_WITH_VALUE })
    .last();
}

/**
 * Returns the innermost container that holds both the "Needs attention" label and the message.
 */
function needsAttentionCard(page) {
  return page
    .locator(CONTAINER_SELECTOR)
    .filter({ hasText: NEEDS_ATTENTION_LABEL })
    .filter({ hasText: NO_FAILED_RUNS_REGEX })
    .last();
}

/**
 * Extracts the number shown next to the "Failed Runs" label.
 * Handles both "Failed Runs (7D) 0" and "0 Failed Runs (7D)" layouts.
 * Returns null if no number is found.
 */
function parseFailedRunsCount(text) {
  const normalized = (text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/Failed Runs\s*\(\d+\s*d\)/i, 'Failed Runs');
  const after = normalized.match(/Failed Runs\s*:?\s*(\d+)/i);
  if (after) return Number(after[1]);
  const before = normalized.match(/(\d+)\s*Failed Runs/i);
  if (before) return Number(before[1]);
  return null;
}

test.describe('Home dashboard - Failed Runs and Needs attention', () => {
  test.beforeEach(async ({ page }) => {
    // The fixture already loaded BASE_URL. Navigate explicitly via the sidebar link.
    const link = page.locator('a, [role="link"]').filter({ hasText: /Home/i }).first();
    await link.waitFor({ state: 'visible', timeout: 20_000 });
    await link.click();

    // The Home page has no confirmed heading; the welcome text (from the snapshot) confirms navigation.
    await page.getByText(WELCOME_TEXT).first().waitFor({ state: 'visible', timeout: 20_000 });

    // Wait for the transient "Loading..." indicator to clear. It is optional, so a timeout here is not fatal.
    await page.getByText(LOADING_TEXT).first()
      .waitFor({ state: 'hidden', timeout: 30_000 })
      .catch(() => {});

    // Structural signal that the dashboard widgets have rendered.
    await page.getByText(FAILED_RUNS_LABEL).first().waitFor({ state: 'visible', timeout: 30_000 });
  });

  test('Home page loads with welcome text and dashboard widgets', async ({ page }) => {
    await expect(page.getByText(WELCOME_TEXT).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(FAILED_RUNS_LABEL).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(NEEDS_ATTENTION_LABEL).first()).toBeVisible({ timeout: 15_000 });
  });

  test('Failed Runs count is 0', async ({ page }) => {
    // Structural check first: the card must exist and show a number.
    const card = failedRunsCard(page);
    await card.waitFor({ state: 'visible', timeout: 15_000 });

    const cardText = (await card.innerText().catch(() => '')) || '';
    const count = parseFailedRunsCount(cardText);
    expect(count, `Failed Runs card should display a numeric value (card text: "${cardText.trim()}")`).not.toBeNull();

    // Data assertion from the flow: Failed Runs should be 0.
    expect.soft(
      count,
      'Failed Runs should be 0 - a non-zero value means a job run failed in the last 7 days'
    ).toBe(0);
  });

  test('Needs attention shows "No failed job runs in the last 7 days."', async ({ page }) => {
    // Structural check first: the Needs attention section must be present.
    const attentionLabel = page.getByText(NEEDS_ATTENTION_LABEL).first();
    await attentionLabel.waitFor({ state: 'visible', timeout: 15_000 });

    const card = needsAttentionCard(page);
    await card.waitFor({ state: 'visible', timeout: 15_000 });

    // Exact message from the flow, scoped to the Needs attention container.
    const message = card.getByText(NO_FAILED_RUNS_REGEX).first();
    await expect.soft(
      message,
      `Needs attention should display "${NO_FAILED_RUNS_MESSAGE}"`
    ).toBeVisible({ timeout: 15_000 });

    // Fallback check at page level, in case the message is a sibling rather than a descendant of the label container.
    await expect(page.getByText(NO_FAILED_RUNS_REGEX).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(NO_FAILED_RUNS_REGEX).first()).toHaveText(NO_FAILED_RUNS_REGEX);
  });

  test('Failed Runs count and Needs attention message are consistent', async ({ page }) => {
    const card = failedRunsCard(page);
    await card.waitFor({ state: 'visible', timeout: 15_000 });
    await page.getByText(NEEDS_ATTENTION_LABEL).first().waitFor({ state: 'visible', timeout: 15_000 });

    const count = parseFailedRunsCount((await card.innerText().catch(() => '')) || '');
    const messageVisible = await page.getByText(NO_FAILED_RUNS_REGEX).first()
      .isVisible()
      .catch(() => false);

    // If there are zero failed runs, the "no failed runs" message must be shown, and vice versa.
    expect.soft(
      messageVisible,
      `Consistency: Failed Runs = ${count}; "${NO_FAILED_RUNS_MESSAGE}" visible = ${messageVisible}`
    ).toBe(count === 0);
  });
});