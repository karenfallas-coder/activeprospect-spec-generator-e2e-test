// spec generated for: Abre la pantalla principal y toca el boton con la letra "X"
const { test, expect } = require('./fixtures');

test.describe('Main screen - X button interaction', () => {
  test('Main screen loads with welcome heading and sidebar nav', async ({ page }) => {
    // The fixture loads BASE_URL — wait for the main/home screen to render
    const homeLink = page.locator('a, [role="link"]').filter({ hasText: /Home/i }).first();
    await homeLink.waitFor({ state: 'visible', timeout: 20_000 });
    await homeLink.click();

    // Confirm we are on the main screen via the verified welcome heading
    const welcomeHeading = page.locator('h1, h2, [role="heading"]')
      .filter({ hasText: /Welcome to the First Party Enrichment admin tool/i })
      .first();
    await welcomeHeading.waitFor({ state: 'visible', timeout: 20_000 });
    await expect(welcomeHeading).toBeVisible();
  });

  test('Search for and interact with a button containing the letter "X"', async ({ page }) => {
    // Open main screen first
    const homeLink = page.locator('a, [role="link"]').filter({ hasText: /Home/i }).first();
    await homeLink.waitFor({ state: 'visible', timeout: 20_000 });
    await homeLink.click();

    const welcomeHeading = page.locator('h1, h2, [role="heading"]')
      .filter({ hasText: /Welcome to the First Party Enrichment admin tool/i })
      .first();
    await welcomeHeading.waitFor({ state: 'visible', timeout: 20_000 });

    // TODO: The flow asks to click a button with the letter "X" on the main screen.
    // Based on the verified DOM snapshot of the main screen (https://admin.qa.infutor.com/oidc/callback),
    // the page contains ONLY:
    //   - infutor logo image
    //   - sidebar navigation (Home, Accounts, Job Runs, SFTP Users, UI Users, Billing, Activity Logs)
    //   - infutor icon image
    //   - welcome heading (h1)
    //   - subtitle heading (h2)
    // There is NO button labeled "X" or containing the letter "X" on the main screen in the verified snapshot.
    // Per the GROUND RULE: never assert/click an element not present in the DOM snapshot.
    // We attempt a best-effort search for any button whose accessible name is exactly or contains "X",
    // and soft-assert its presence so the test surfaces the missing element without a hard failure.

    const xButton = page.getByRole('button', { name: /^x$/i }).first();
    const xButtonVisible = await xButton.isVisible({ timeout: 5_000 }).catch(() => false);

    expect.soft(
      xButtonVisible,
      'No button with the letter "X" was found on the main screen. The verified DOM snapshot does not contain such a button — confirm the flow target element with an updated DOM snapshot.'
    ).toBe(true);

    if (xButtonVisible) {
      await xButton.click();
      // No follow-up assertion specified in the flow — confirm the click did not navigate away from the main screen
      await expect(welcomeHeading).toBeVisible({ timeout: 10_000 });
    }
  });
});