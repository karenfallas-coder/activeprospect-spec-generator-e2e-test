import { test, expect } from "../../lib/fixtures";
import { launch } from "../_helpers/qaw-stubs";
import helpersTrustedForm from "../../utilities/helpers-trusted-form.js";

test("View Retained Certificates table has at least one certificate row", async () => {
  let { login } = await helpersTrustedForm({ launch });

  await test.step("View Retained Certificates table has at least one certificate row", async () => {
    //--------------------------------
    // Arrange:
    //--------------------------------
    // Log in to the TrustedForm application (QA Wolf account has provisioned retained certificates)
    const { page } = await login();

    //--------------------------------
    // Act:
    //--------------------------------
    // Click the "Retained Certificates" navigation link
    await page.getByRole(`link`, { name: `Retained Certificates` }).click();

    // Wait for the certificates table to render
    const table = page.locator(`table`).first();
    await table.waitFor({ timeout: 15 * 1000 });

    // Save the table body rows to a variable
    const rows = table.locator(`tbody tr`);

    // Wait for the first row of the table to render (data is shared, never assume ordering)
    await rows.first().waitFor({ timeout: 15 * 1000 });

    //--------------------------------
    // Assert:
    //--------------------------------
    // Assert the certificates table is visible
    await expect(table).toBeVisible({ timeout: 15 * 1000 });

    // Assert the first certificate row is visible
    await expect(rows.first()).toBeVisible({ timeout: 15 * 1000 });

    // Assert the table shows at least one certificate row
    expect(await rows.count()).toBeGreaterThan(0);

    //--------------------------------
    // Clean up:
    //--------------------------------
    // No Cleanup Needed
  });
});