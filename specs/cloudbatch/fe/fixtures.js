/**
 * fixtures.js
 *
 * One Chrome instance per worker (worker-scoped _ctx).
 * Auth is handled once at startup — all tests share the same context.
 * Each test gets a fresh page from that context.
 *
 * SESSION PERSISTENCE STRATEGY
 * ─────────────────────────────
 * Auth0 stores the access token in sessionStorage (per-tab, not persisted by Playwright's
 * storageState). Without restoring it, every new tab starts without a token → Auth0 shows
 * the Login button → full Google flow runs again.
 *
 * Fix: after a successful auth we manually capture sessionStorage via page.evaluate() and
 * save it to .auth/session-storage.json. On every new context we inject it back via
 * ctx.addInitScript(), which runs before the SPA's JS — so Auth0 SDK finds the token and
 * re-authenticates silently, no browser UI needed.
 *
 * Token lifespan is ~1 h. Within a 1-hour test window the token is still valid and silent
 * auth succeeds. If > 1 h has passed the token is expired; Auth0 tries a cookie-based
 * silent refresh via a hidden iframe. If that also fails, the Login button appears and the
 * auto-login flow (Login → Sign in with Google → account picker) handles it automatically
 * without user intervention (as long as the Google session in the Chrome profile is fresh).
 * Only when Google itself requires a password does human input become necessary.
 */
const { test: base, expect, chromium } = require('@playwright/test');
const path = require('path');
const fs   = require('fs');

// Paths can be overridden via env vars so this fixture is portable to any repo layout.
// AUTH_DIR is set by spec-generator's playwright configs (specs/<projectId>/fe/ layout);
// without it, the default assumes <root>/specs/fe/fixtures.js with .auth/ at the repo root.
const PROJECT_ID        = process.env.PROJECT_ID || 'cloudbatch';
const AUTH_DIR          = process.env.AUTH_DIR || path.join(__dirname, '..', '..', '.auth');
// Prefer project-scoped paths; fall back to legacy shared paths for cloudbatch
// so existing setups that already have a populated .auth/chrome-userdata continue to work.
const _legacyUserData   = path.join(AUTH_DIR, 'chrome-userdata');
const _projectUserData  = path.join(AUTH_DIR, `${PROJECT_ID}-userdata`);
const CHROME_USER_DATA  = process.env.CHROME_USER_DATA_DIR
                          || (PROJECT_ID === 'cloudbatch' && fs.existsSync(_legacyUserData) && !fs.existsSync(_projectUserData)
                              ? _legacyUserData
                              : _projectUserData);
const _legacySession    = path.join(AUTH_DIR, 'session.json');
const _projectSession   = path.join(AUTH_DIR, `${PROJECT_ID}-session.json`);
const AUTH_FILE         = process.env.AUTH_FILE
                          || (PROJECT_ID === 'cloudbatch' && fs.existsSync(_legacySession) && !fs.existsSync(_projectSession)
                              ? _legacySession
                              : _projectSession);
const SS_FILE           = process.env.AUTH_SS_FILE
                          || path.join(AUTH_DIR, 'session-storage.json');
const BASE_URL          = process.env.BASE_URL || 'https://admin.qa.infutor.com';
const APP_ORIGIN        = new URL(BASE_URL).origin;

// ── helpers ──────────────────────────────────────────────────────────────────

/** Load session.json and return { cookies, origins } or null. */
function loadSession() {
  try {
    if (!fs.existsSync(AUTH_FILE)) return null;
    return JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
  } catch { return null; }
}

/** Load session-storage.json (Auth0 token cache) or return []. */
function loadSessionStorage() {
  try {
    if (!fs.existsSync(SS_FILE)) return [];
    return JSON.parse(fs.readFileSync(SS_FILE, 'utf8'));
  } catch { return []; }
}

/**
 * Register a context-level init script that injects saved sessionStorage items
 * into every new page that opens on APP_ORIGIN, BEFORE the SPA JS runs.
 * This allows Auth0 SDK to find the cached token and skip the Login flow.
 */
async function injectSessionStorage(ctx) {
  const items = loadSessionStorage();
  if (!items.length) return;
  await ctx.addInitScript(([origin, entries]) => {
    if (location.origin !== origin) return;
    for (const { name, value } of entries) {
      try { sessionStorage.setItem(name, value); } catch {}
    }
  }, [APP_ORIGIN, items]);
}

/**
 * Capture sessionStorage for APP_ORIGIN from a page currently on that origin,
 * then write it to SS_FILE for future runs.
 */
async function captureAndSaveSessionStorage(page) {
  try {
    const items = await page.evaluate(() =>
      Object.entries(sessionStorage).map(([name, value]) => ({ name, value }))
    );
    if (items.length) {
      fs.writeFileSync(SS_FILE, JSON.stringify(items, null, 2));
    }
  } catch { /* ignore */ }
}

// ── auto-login ────────────────────────────────────────────────────────────────

const CI_EMAIL    = process.env.E2E_TEST_EMAIL;
const CI_PASSWORD = process.env.E2E_TEST_PASSWORD;

/**
 * Authenticate the given page.
 *
 * Strategy A — CI / headless (E2E_TEST_EMAIL + E2E_TEST_PASSWORD set):
 *   Click the app's Login button → wait for Auth0 Universal Login form →
 *   fill email + password → submit → wait for redirect back to app.
 *   No Google, no MFA, no human input needed. Works in pipelines.
 *
 * Strategy B — Local / interactive (no credentials in env):
 *   Click Login → click "Sign in with Google" → auto-click account picker.
 *   Falls back to waiting for the user to enter credentials when Google
 *   requires a password (never steals focus on credential-entry pages).
 */
async function autoLogin(page) {
  const authNav = page.locator('a, [role="link"]').filter({ hasText: /accounts|job runs|billing|users/i }).first();

  if (CI_EMAIL && CI_PASSWORD) {
    // ── Strategy A: direct Auth0 form login ──────────────────────────────────
    // Try to click the app's Login button — non-blocking.
    // Sometimes the app auto-redirects to Auth0 before the click completes,
    // so we never hard-wait on this click. If it fails, Auth0 is already open.
    const loginBtn = page.getByRole('button', { name: /^login$/i });
    if (await loginBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await loginBtn.click({ timeout: 5_000 }).catch(() => {});
    }

    // Wait for EITHER the Auth0 email form OR the authenticated app nav.
    // When cookies are fresh, Auth0 does silent auth and redirects back to the
    // app without showing the form — in that case authNav will appear and we
    // return early. Only when the form appears do we fill the credentials.
    const emailInput = page.locator('input[type="email"], input[name="username"], input[name="email"]').first();
    const reached = await Promise.race([
      emailInput.waitFor({ state: 'visible', timeout: 20_000 }).then(() => 'form'),
      authNav  .waitFor({ state: 'visible', timeout: 20_000 }).then(() => 'authed'),
    ]).catch(() => 'timeout');

    if (reached === 'authed' || reached === 'timeout') return;

    // Form is visible — fill credentials
    // Auth0 Universal Login can be single-step (email + password together)
    // or multi-step (email first, then password on a separate step).
    await emailInput.fill(CI_EMAIL);
    const passwordInput = page.locator('input[type="password"]').first();
    const passwordAlreadyVisible = await passwordInput.isVisible({ timeout: 2_000 }).catch(() => false);
    if (!passwordAlreadyVisible) {
      // Multi-step: submit email to advance to the password step
      await emailInput.press('Enter');
      await passwordInput.waitFor({ state: 'visible', timeout: 15_000 });
    }
    await passwordInput.fill(CI_PASSWORD);
    await passwordInput.press('Enter');

    // Wait for redirect back to the app
    await authNav.waitFor({ state: 'visible', timeout: 30_000 });
    return;
  }

  // ── Strategy B: Google SSO (local/interactive) ────────────────────────────
  const googleBtn   = page.getByRole('button', { name: /sign in with google/i });
  const accountItem = page.locator(
    '[data-email], [data-identifier], li[data-authuser], div[data-authuser]'
  ).first();

  await new Promise(resolve => {
    const check = async () => {
      try {
        if (await authNav.isVisible({ timeout: 500 })) { resolve(); return; }

        if (await googleBtn.isVisible({ timeout: 500 })) {
          googleBtn.click().catch(() => {});
          setTimeout(check, 2_000);
          return;
        }

        // Never auto-click on Google credential-entry pages (password / OTP)
        const url = page.url();
        const onCredentialPage =
          url.includes('accounts.google.com') && (
            /\/(challenge|pwd|totp|mfa|signin\/v2\/challenge|_\/signin\/challenge)/.test(url) ||
            /type=(password|totp|challenge)/.test(url) ||
            /flowEntry=ServiceLogin/.test(url)
          );

        if (!onCredentialPage && await accountItem.isVisible({ timeout: 500 })) {
          accountItem.click().catch(() => {});
        }
      } catch { /* navigating — keep polling */ }
      setTimeout(check, 2_000);
    };
    setTimeout(check, 2_000);
  });
}

// ── fixtures ──────────────────────────────────────────────────────────────────

const test = base.extend({

  /**
   * One Chrome per worker — opened once, shared across ALL tests in the run.
   * Worker-scoped: Playwright creates this once per worker process, not per test.
   */
  _ctx: [async ({}, use) => {

    // Kill any stale Chrome holding the test profile (from a previous crashed run).
    if (process.platform === 'win32') {
      const { spawnSync } = require('child_process');
      spawnSync('powershell', [
        '-NoProfile', '-NonInteractive', '-Command',
        `Get-WmiObject Win32_Process | Where-Object { $_.CommandLine -like '*chrome-userdata*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`,
      ], { stdio: 'ignore' });
      await new Promise(r => setTimeout(r, 1_500));
    } else {
      // Linux CI: remove SingletonLock left by a previous crashed Chrome
      const lockFile = require('path').join(CHROME_USER_DATA, 'SingletonLock');
      if (require('fs').existsSync(lockFile)) require('fs').rmSync(lockFile, { force: true });
    }

    // CI: fail fast if credentials are missing rather than hanging on Google SSO
    if (process.env.CI && !process.env.E2E_TEST_EMAIL && !process.env.CI_AUTH_USER) {
      throw new Error('CI run requires E2E_TEST_EMAIL (or CI_AUTH_USER) to be set — Google SSO is not available headlessly');
    }

    const isCI = !!process.env.CI;
    // GitLab CI sets GITLAB_CI or CI_JOB_ID. The local runner sets CI=true in runner/.env
    // but runs on Windows WITH system Chrome installed. Use system Chrome everywhere except
    // actual GitLab pipelines (which run on Linux without system Chrome).
    const isRealCI = !!process.env.GITLAB_CI || !!process.env.CI_JOB_ID;
    const ciArgs = isCI ? ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] : [];
    // The spec generator's runner sets SPECGEN_HEADED=true on a desktop so a CloudBatch run
    // shows its browser even with CI=true in runner/.env. Unset everywhere else (GitLab CI).
    const headless = isCI && process.env.SPECGEN_HEADED !== 'true';

    let ctx;
    try {
      ctx = await chromium.launchPersistentContext(CHROME_USER_DATA, {
        channel:             isRealCI ? undefined : 'chrome',
        headless,
        viewport:            { width: 1280, height: 800 },
        ignoreHTTPSErrors:   true,
        args: [
          '--profile-directory=Default',
          '--disable-blink-features=AutomationControlled',
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-features=ThirdPartyCookiePhaseout',
          ...ciArgs,
        ],
      });
    } catch (e) {
      console.error('Could not launch Chrome:', e.message);
      throw e;
    }

    // ── Restore cookies ──────────────────────────────────────────────────────
    const saved = loadSession();
    if (saved?.cookies?.length) {
      await ctx.clearCookies();
      await ctx.addCookies(saved.cookies);
      console.log(`\n🍪 Replaced profile cookies with ${saved.cookies.length} saved session cookies\n`);
    }

    // ── Auth check ───────────────────────────────────────────────────────────
    const setup = await ctx.newPage();
    try {
      await setup.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    } catch { /* ignore redirect */ }

    const authNav  = setup.locator('a, [role="link"]').filter({ hasText: /accounts|job runs|billing|users/i }).first();
    const loginBtn = setup.getByRole('button', { name: /^login$/i });

    await Promise.race([
      authNav .waitFor({ state: 'visible', timeout: 20_000 }),
      loginBtn.waitFor({ state: 'visible', timeout: 20_000 }),
    ]).catch(() => {});

    // Auth0 silent-auth via hidden iframe can take 3-6s — Login button may appear
    // briefly while it completes. Give authNav extra time before deciding a full
    // login is needed, otherwise we trigger unnecessary auto-login on every cold start.
    await authNav.waitFor({ state: 'visible', timeout: 8_000 }).catch(() => {});

    if (await loginBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      console.log('\n🔐 Login required — running auto-login flow...\n');
      loginBtn.click().catch(() => {});
      await autoLogin(setup);
      console.log('✅ Auto-login complete\n');
    }

    // ── Capture sessionStorage now that we are authenticated ─────────────────
    // Save Auth0 token so future tabs/runs can restore it and skip the Login flow.
    await captureAndSaveSessionStorage(setup);

    await setup.close().catch(() => {});

    // ── Persist cookies extended to 24 h ─────────────────────────────────────
    try {
      const all = await ctx.cookies();
      const exp = Math.floor(Date.now() / 1000) + 86_400;
      await ctx.clearCookies();
      await ctx.addCookies(all.map(c => ({ ...c, expires: exp })));
      await ctx.storageState({ path: AUTH_FILE });
      const fresh = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
      console.log(`\n✅ Session saved — ${fresh.cookies?.length ?? 0} cookies\n`);
    } catch (e) {
      console.warn('Could not save session:', e.message);
    }

    await use(ctx);   // ← all tests run here

    await ctx.close().catch(() => {});
  }, { scope: 'worker' }],

  /**
   * Fresh page per test — new tab in the shared Chrome context.
   * Cookies and sessionStorage are already in place from _ctx setup.
   * If (rarely) Auth0 silent-auth fails on this new tab, auto-login handles it.
   */
  page: async ({ _ctx }, use) => {
    const page = await _ctx.newPage();

    // Re-add cookies on each new tab as a safety net.
    const saved = loadSession();
    if (saved?.cookies?.length) await _ctx.addCookies(saved.cookies).catch(() => {});

    // Inject LATEST sessionStorage BEFORE page.goto() so Auth0 SDK finds the token
    // at initialization time (not after). This reads the file fresh each test, so it
    // picks up tokens saved by captureAndSaveSessionStorage in _ctx setup.
    const freshItems = loadSessionStorage();
    if (freshItems.length) {
      await page.addInitScript((items) => {
        for (const { name, value } of items) {
          try { sessionStorage.setItem(name, value); } catch (_) {}
        }
      }, freshItems);
    }

    try {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    } catch { /* ignore */ }

    const authNav  = page.locator('a, [role="link"]').filter({ hasText: /accounts|job runs|billing|users/i }).first();
    const loginBtn = page.getByRole('button', { name: /^login$/i });

    await Promise.race([
      authNav .waitFor({ state: 'visible', timeout: 15_000 }),
      loginBtn.waitFor({ state: 'visible', timeout: 15_000 }),
    ]).catch(() => {});

    if (await loginBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      // 1st attempt: inject Auth0 token directly into the live page via evaluate()
      // then reload — Auth0 SDK re-initializes and reads sessionStorage before
      // deciding whether to show Login. This is more reliable than addInitScript
      // on a persistent context because it runs synchronously in the page's own
      // origin context, not as a pre-navigation script.
      const ssItems = loadSessionStorage();
      if (ssItems.length) {
        await page.evaluate((entries) => {
          for (const { name, value } of entries) {
            try { sessionStorage.setItem(name, value); } catch {}
          }
        }, ssItems).catch(() => {});
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 15_000 }).catch(() => {});
        // Re-check after reload
        await Promise.race([
          authNav.waitFor({ state: 'visible', timeout: 10_000 }),
          loginBtn.waitFor({ state: 'visible', timeout: 10_000 }),
        ]).catch(() => {});
      }

      // 2nd attempt: if still showing Login, fall back to full auto-login flow
      if (await loginBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        loginBtn.click().catch(() => {});
        await autoLogin(page);
        // Capture fresh token after this auth so subsequent tabs benefit from it
        await captureAndSaveSessionStorage(page);
      }
    }

    // ── Ensure the page is settled on the app domain before handing it to the test ──
    // Auth0 silent-auth can briefly navigate the page to auth-qa.infutor.com before
    // redirecting back to the app. If the page is still on a non-app URL, navigate back.
    const finalUrl = page.url();
    if (finalUrl && !finalUrl.startsWith(APP_ORIGIN) && !finalUrl.startsWith('about:')) {
      console.log(`\n⚠ Page ended up on ${finalUrl} — navigating back to app\n`);
      try {
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        await authNav.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
      } catch { /* ignore */ }
    }

    await use(page);
    await page.close().catch(() => {});
  },

});

module.exports = { test, expect };
