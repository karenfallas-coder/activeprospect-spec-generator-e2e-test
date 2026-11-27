const { test, expect } = require('./fixtures');
const { requireToken, ensureUserExists } = require('../helpers/cb-api');
const https = require('https');

const TEST_USER_EMAIL = 'cb-automation@mailinator.com';

test.describe('SFTP Users — Duplicate user in another company (cross-account)', () => {
  let secondAccountId   = null;
  let secondAccountName = null;

  test.beforeAll(async () => {
    // Ensure test user is in Automation QA
    try { await ensureUserExists('0147887', 'CB Automation', TEST_USER_EMAIL); } catch { /* skip */ }

    // Find any account that is NOT Automation QA
    try {
      const token = requireToken();
      const BASE  = process.env.BASE_URL || 'https://admin.qa.infutor.com';
      const accounts = await new Promise((resolve, reject) => {
        const url = new URL(`${BASE}/api/admin/accounts`);
        https.get({ hostname: url.hostname, path: url.pathname + url.search,
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
          r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { resolve(JSON.parse(d)); } catch { reject(new Error('Non-JSON response')); } }); }
        ).on('error', reject);
      });
      const second = Array.isArray(accounts)
        ? accounts.find(a => String(a.customer_id) !== '0147887')
        : null;
      if (second) {
        secondAccountId   = second.customer_id;
        secondAccountName = second.company;
      }
    } catch (err) {
      console.warn('[cross-account] Could not find second account:', err.message);
    }
  });

  test('Shows "User already exists and is registered to another account" error', async ({ page }) => {
    test.skip(!secondAccountId, 'No second account found in QA — cannot test cross-account duplicate');

    // Navigate to Accounts
    const link = page.locator('a, [role="link"]').filter({ hasText: /Accounts/i }).first();
    await link.waitFor({ state: 'visible', timeout: 20_000 });
    await link.click();
    await page.locator('h1, h2, [role="heading"]').filter({ hasText: /All Accounts/i }).first()
      .waitFor({ state: 'visible', timeout: 20_000 });
    await page.locator('table tr, [role="row"]').nth(1).waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});

    // Search for the second account
    const s = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    if (await s.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await s.fill(secondAccountName);
      await s.press('Enter').catch(() => {});
    }

    const urlBefore = page.url();
    const row = page.locator('table tr, [role="row"]').filter({ hasText: new RegExp(secondAccountName.slice(0, 10), 'i') }).first();
    await row.waitFor({ state: 'visible', timeout: 15_000 });
    const rowLink = row.locator('a, button').first();
    if (await rowLink.count() > 0) await rowLink.click(); else await row.click();
    await page.waitForURL(url => url !== urlBefore, { timeout: 15_000 });

    // Find Add User button in SFTP Users section
    const sftp = page.locator('h4, [role="heading"]').filter({ hasText: /SFTP Users/i }).first();
    await sftp.waitFor({ state: 'visible', timeout: 15_000 });

    const addBtn = page.locator('a[href*="/users/new"], button').filter({ hasText: /new|add/i }).first();
    await addBtn.waitFor({ state: 'visible', timeout: 10_000 });
    const urlBefore2 = page.url();
    await addBtn.click();
    await page.waitForURL(url => url !== urlBefore2, { timeout: 15_000 }).catch(() => {});

    const nameInput = page.locator('input[name="username"], input[placeholder*="name" i], input[id*="name" i]').first();
    await nameInput.waitFor({ state: 'visible', timeout: 10_000 });
    await nameInput.fill('Same User');

    const emailInput = page.locator('input[type="email"], input[name="email"], input[id*="email" i]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 10_000 });
    await emailInput.fill(TEST_USER_EMAIL);

    const saveBtn = page.getByRole('button', { name: /save/i }).first();
    await saveBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await saveBtn.click();

    const error = page.locator('[role="alert"], .toast, [class*="error"], [class*="toast"]').first();
    await error.waitFor({ state: 'visible', timeout: 10_000 });
    expect(await error.textContent()).toMatch(/already exists.*another account|registered to another/i);
  });
});
