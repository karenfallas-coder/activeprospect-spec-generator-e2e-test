import { test, expect } from "../../lib/fixtures";
import { launch } from "../_helpers/qaw-stubs";
import helpersTrustedForm from "../../utilities/helpers-trusted-form.js";

test("View Retained Certificates page from the sidebar", async () => {
  let { login } = await helpersTrustedForm({ launch });

  await test.step("View Retained Certificates page from the sidebar", async () => {
    //--------------------------------
    // Arrange:
    //--------------------------------
    // Constants (Variables)
    const pageTitleText = `Retained Certificates`;
    const pageDescriptionText = `View and manage certificates you've chosen to retain. Check retention status, expiration dates, and access individual certificates when needed.`;

    // Log in to the TrustedForm application (QA Wolf account)
    const { page } = await login();

    // Save the "Retained Certificates" sidebar link to a variable
    const retainedCertificatesLink = page.getByRole(`link`, {
      name: pageTitleText,
      exact: true,
    });

    // Expand the "Retain" sidebar section only when its links are not already shown
    if (!(await retainedCertificatesLink.isVisible().catch(() => false))) {
      // Click the "Retain" sidebar button to expand the section (name may include a leading icon glyph, so match loosely)
      await page.getByRole(`button`, { name: /Retain/i }).click();
    }

    // Wait for the "Retained Certificates" sidebar link to be ready
    await retainedCertificatesLink.waitFor();

    //--------------------------------
    // Act:
    //--------------------------------
    // Click the "Retained Certificates" sidebar link
    await retainedCertificatesLink.click();

    // Save the "Domain Insights" promotional region to a variable
    const domainInsightsRegion = page.getByRole(`region`, {
      name: `Domain Insights`,
    });

    // Dismiss the "Domain Insights" banner when it is shown so it cannot cover the table
    if (await domainInsightsRegion.isVisible().catch(() => false)) {
      // Click the "Close" button inside the "Domain Insights" region
      await domainInsightsRegion
        .getByRole(`button`, { name: `Close` })
        .click()
        .catch((error) => console.log(error.message));
    }

    //--------------------------------
    // Assert:
    //--------------------------------
    // Assert the page title is visible (Justify index - the sidebar link shares the same text and renders first in the DOM)
    await expect(
      page.getByText(pageTitleText, { exact: true }).last(),
    ).toBeVisible({ timeout: 15 * 1000 });

    // Assert the page description paragraph is visible
    await expect(page.getByText(pageDescriptionText)).toBeVisible();

    //--------------------------------
    // Clean up:
    //--------------------------------
    // No Cleanup Needed
  });
});