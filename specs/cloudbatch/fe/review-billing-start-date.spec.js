// spec generated for: Billing — start date cannot be a future date
const { test, expect } = require('./fixtures');

test.describe('Billing — Start date validation', () => {
  test.beforeEach(async ({ page }) => {
    const link = page.locator('a, [role="link"]').filter({ hasText: /Billing/i }).first();
    await link.waitFor({ state: 'visible', timeout: 20_000 });
    await link.click();
    await page.locator('h1, h2, [role="heading"]').filter({ hasText: /Billing Report Generation/i }).first()
      .waitFor({ state: 'visible', timeout: 20_000 });
  });

  test('shows alert "Start date cannot exceed present date" when From date is in the future', async ({ page }) => {
    let dialogMessage = '';
    page.once('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    const fromInput = page.locator('input[type="date"]').nth(0);
    await fromInput.waitFor({ state: 'visible', timeout: 10_000 });
    await fromInput.fill('2099-01-01');
    await fromInput.press('Tab');

    await page.waitForTimeout(500);

    expect(dialogMessage, 'Alert dialog should contain the start date validation message')
      .toMatch(/start date cannot exceed present date/i);
  });

  test('Generate button is disabled when From date is in the future', async ({ page }) => {
    page.once('dialog', async dialog => { await dialog.accept(); });

    const fromInput = page.locator('input[type="date"]').nth(0);
    await fromInput.waitFor({ state: 'visible', timeout: 10_000 });
    await fromInput.fill('2099-01-01');
    await fromInput.press('Tab');

    await page.waitForTimeout(500);

    const generateBtn = page.getByRole('button', { name: /generate/i }).first();
    await generateBtn.waitFor({ state: 'visible', timeout: 5_000 });
    const isDisabled = await generateBtn.isDisabled();
    expect(isDisabled, 'Generate button should be disabled when start date is in the future').toBe(true);
  });

  test('Generate button is enabled with valid past start date', async ({ page }) => {
    const fromInput = page.locator('input[type="date"]').nth(0);
    await fromInput.waitFor({ state: 'visible', timeout: 10_000 });
    await fromInput.fill('2026-01-01');

    const toInput = page.locator('input[type="date"]').nth(1);
    await toInput.waitFor({ state: 'visible', timeout: 10_000 });
    await toInput.fill('2026-06-01');
    await toInput.press('Tab');

    await page.waitForTimeout(500);

    const generateBtn = page.getByRole('button', { name: /generate/i }).first();
    await generateBtn.waitFor({ state: 'visible', timeout: 5_000 });
    const isDisabled = await generateBtn.isDisabled();
    expect.soft(isDisabled, 'Generate button should be enabled with a valid past start date').toBe(false);
  });
});
