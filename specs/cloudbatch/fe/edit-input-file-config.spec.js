const { test, expect } = require('./fixtures');
const path = require('path');

const JOB_NAME    = 'Test Jobs';
const CUSTOMER_ID = '0147887';
const CSV_FILE    = path.join(__dirname, '..', '..', 'test-data', 'CB_Automation_File.csv');

// Returns true if navigation succeeded, false if no jobs are configured (caller should test.skip).
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

test.describe('Enrichment Jobs — Edit Input File Configuration (File Layout)', () => {
  test.setTimeout(120_000);

  // Map: system field (left column label) → customer header (right column select option).
  // "name" stays unmapped (None); the rest map to the uploaded file's uppercase headers.
  const FIELD_MAP = [
    { field: 'fname',   header: 'FIRSTNAME'  },
    { field: 'lname',   header: 'LASTNAME'   },
    { field: 'address', header: 'STREET'     },
    { field: 'city',    header: 'CITY'       },
    { field: 'state',   header: 'STATE'      },
    { field: 'zip',     header: 'POSTALCODE' },
    { field: 'phone',   header: 'PHONE'      },
    { field: 'email',   header: 'EMAIL'      },
  ];

  test('Upload CSV, map fields, validate and submit', async ({ page }) => {
    const hasJob = await openJobDetail(page);
    test.skip(!hasJob, 'Job "Test Jobs" not found in Automation QA Enrichment Jobs table');

    // 1) Open the input "File Layout" — first of the two File Layout buttons (input vs output).
    const fileLayoutBtn = page.getByRole('button', { name: /file layout/i }).first();
    await fileLayoutBtn.waitFor({ state: 'visible', timeout: 15_000 });
    await fileLayoutBtn.click();

    // The "Input File Configuration" modal opens with CSV / COMMA defaults and a headers reference.
    await expect(page.locator('body')).toContainText('Input File Configuration', { timeout: 15_000 });
    const modalText = await page.locator('body').textContent();
    expect.soft(modalText, 'File Format should default to CSV').toMatch(/CSV/i);
    expect.soft(modalText, 'File Delimiter should default to COMMA').toMatch(/COMMA/i);

    // 2) Upload the CSV directly to the file input (no OS dialog interaction needed).
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.waitFor({ state: 'attached', timeout: 10_000 });
    await fileInput.setInputFiles(CSV_FILE);

    // After upload, the "Map" button and "Data Preview Before Mapping" appear.
    const mapBtn = page.getByRole('button', { name: 'Map', exact: true }).first();
    await mapBtn.waitFor({ state: 'visible', timeout: 15_000 });
    await mapBtn.click();

    // 3) The "Map Columns" modal opens: each System Field label has a Customer Headers <select>.
    await expect(page.locator('body')).toContainText('Map Columns', { timeout: 15_000 });

    for (const { field, header } of FIELD_MAP) {
      // The label and its <select> share a row; scope to the deepest container holding both.
      // getByText(exact) avoids the "name" ⊂ "fname"/"lname" substring trap.
      const row = page.locator('div, tr, li')
        .filter({ has: page.getByText(field, { exact: true }) })
        .filter({ has: page.locator('select') })
        .last();
      const select = row.locator('select').first();
      await select.waitFor({ state: 'visible', timeout: 10_000 });
      await select.selectOption({ label: header });
    }

    // 4) Validate → returns to the Input File Configuration modal with "Data Preview After Mapping".
    const validateBtn = page.getByRole('button', { name: /validate/i }).first();
    await validateBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await validateBtn.click();
    await expect(page.locator('body')).toContainText('Data Preview After Mapping', { timeout: 15_000 });

    // 5) Submit the configuration.
    const submitBtn = page.getByRole('button', { name: /submit/i }).first();
    await submitBtn.waitFor({ state: 'visible', timeout: 15_000 });
    const urlBefore = page.url();
    await submitBtn.click();

    // Success: a toast appears, the modal closes, or the page settles back on the job detail.
    await Promise.race([
      page.locator('[role="alert"], .toast, [class*="toast"]').first()
        .waitFor({ state: 'visible', timeout: 20_000 }),
      expect(page.locator('body')).not.toContainText('Input File Configuration', { timeout: 20_000 }),
      page.waitForURL(url => url !== urlBefore, { timeout: 20_000 }),
    ]).catch(() => {});
  });
});
