// spec generated for: Home — verify welcome message for authenticated user
const { test, expect } = require('./fixtures');

test.describe('Home — Welcome message', () => {
  test('displays welcome message for authenticated user', async ({ page }) => {
    const homeLink = page.locator('a, [role="link"]').filter({ hasText: /Home/i }).first();
    await homeLink.waitFor({ state: 'visible', timeout: 20_000 });
    await homeLink.click();

    const welcomeMsg = page.locator('h1, h2, [role="heading"]')
      .filter({ hasText: /Welcome to Appends Admin/i }).first();
    await welcomeMsg.waitFor({ state: 'visible', timeout: 15_000 });
    await expect(welcomeMsg).toBeVisible();

    const text = await welcomeMsg.textContent();
    expect.soft(text).toMatch(/qatesting@activeprospect\.com/i);
    expect.soft(text).toMatch(/Welcome to Appends Admin/i);
  });
});