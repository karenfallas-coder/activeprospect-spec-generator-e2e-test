const { test, expect } = require('./fixtures');

test.describe('Billing — Date validation', () => {
  test.beforeEach(async ({ page }) => {
    const link = page.locator('a, [role="link"]').filter({ hasText: /Billing/i }).first();
    await link.waitFor({ state: 'visible', timeout: 20_000 });
    await link.click();
    await page.locator('h1, h2, [role="heading"]').filter({ hasText: /Billing Report Generation/i }).first()
      .waitFor({ state: 'visible', timeout: 20_000 });
  });

  test('Generate button is disabled when end date is before start date', async ({ page }) => {
    const fromInput = page.locator('input[type="date"]').nth(0);
    await fromInput.waitFor({ state: 'visible', timeout: 10_000 });
    await fromInput.fill('2026-06-03'); // Start: Jun 3

    const toInput = page.locator('input[type="date"]').nth(1);
    await toInput.waitFor({ state: 'visible', timeout: 10_000 });
    await toInput.fill('2026-06-01'); // To: Jun 1 (before start)
    await toInput.press('Tab'); // trigger change event

    await page.waitForTimeout(500); // let the UI react

    const generateBtn = page.getByRole('button', { name: /generate/i }).first();
    await generateBtn.waitFor({ state: 'visible', timeout: 5_000 });
    const isDisabled = await generateBtn.isDisabled();
    expect(isDisabled, 'Generate button should be disabled when end date is before start date').toBe(true);
  });

  test('Generate button is enabled with valid date range', async ({ page }) => {
    const fromInput = page.locator('input[type="date"]').nth(0);
    await fromInput.waitFor({ state: 'visible', timeout: 10_000 });
    await fromInput.fill('2026-06-01');

    const toInput = page.locator('input[type="date"]').nth(1);
    await toInput.waitFor({ state: 'visible', timeout: 10_000 });
    await toInput.fill('2026-06-03');
    await toInput.press('Tab');

    await page.waitForTimeout(500);

    const generateBtn = page.getByRole('button', { name: /generate/i }).first();
    await generateBtn.waitFor({ state: 'visible', timeout: 5_000 });
    const isDisabled = await generateBtn.isDisabled();
    expect.soft(isDisabled, 'Generate button should be enabled with valid date range').toBe(false);
  });
});
