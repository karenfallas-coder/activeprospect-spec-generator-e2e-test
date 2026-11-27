/**
 * cb-api.js — CloudBatch Admin API helper (no browser, no manual tokens)
 *
 * Reads the Auth0 access token that global-setup.js (or the FE fixture) already
 * saved to .auth/session-storage.json, then exposes typed wrappers for the
 * admin API endpoints the QA specs need.
 *
 * Zero extra config: if FE specs have been run at least once the token is on disk.
 * If the token is missing or expired the helpers throw a clear error so the
 * calling spec can skip gracefully.
 */

'use strict';

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const BASE_URL    = process.env.BASE_URL || 'https://admin.qa.infutor.com';
const API_ROOT    = `${BASE_URL}/api`;
// AUTH_DIR is set by spec-generator's configs (specs/<projectId>/ layout); default = <root>/specs/helpers/
const SS_FILE     = process.env.AUTH_SS_FILE
                 || path.join(process.env.AUTH_DIR || path.join(__dirname, '..', '..', '.auth'), 'session-storage.json');

// ── Token extraction ──────────────────────────────────────────────────────────

/**
 * Read the Auth0 access_token from the saved sessionStorage snapshot.
 * Returns null if the file is missing, expired, or malformed.
 */
function readSavedToken() {
  try {
    if (!fs.existsSync(SS_FILE)) return null;
    const items = JSON.parse(fs.readFileSync(SS_FILE, 'utf8'));

    // Auth0 SPA SDK stores tokens under "@@auth0spajs@@::clientId::audience::scopes"
    const entry = items.find(i => i.name.startsWith('@@auth0spajs@@'));
    if (!entry) return null;

    const cache = JSON.parse(entry.value);          // { body: { access_token, expires_in, ... }, expiresAt }
    const body  = cache.body || cache;

    // Check expiry (Auth0 puts an "expiresAt" in seconds at top level, or use "expires_in")
    if (cache.expiresAt && cache.expiresAt < Math.floor(Date.now() / 1000)) {
      console.warn('[cb-api] Saved Auth0 token is expired — re-run FE specs to refresh');
      return null;
    }

    return body.access_token || null;
  } catch (e) {
    console.warn('[cb-api] Could not read saved token:', e.message);
    return null;
  }
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function request(method, path, token, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const url     = new URL(`${API_ROOT}${path}`);

    const opts = {
      hostname: url.hostname,
      port:     url.port || 443,
      path:     url.pathname + url.search,
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };

    const req = https.request(opts, (res) => {
      let raw = '';
      res.on('data', c => (raw += c));
      res.on('end', () => {
        try   { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

const get  = (path, token)       => request('GET',  path, token);
const post = (path, token, body) => request('POST', path, token, body);

// ── Public helpers ────────────────────────────────────────────────────────────

/**
 * Ensure a valid token is available.
 * Throws a descriptive error if not — lets the calling spec use test.skip().
 */
function requireToken() {
  const token = readSavedToken();
  if (!token) {
    throw new Error(
      '[cb-api] No valid Auth0 token found.\n' +
      '  Run the FE specs at least once so global-setup.js saves the session,\n' +
      '  or set E2E_TEST_EMAIL + E2E_TEST_PASSWORD in runner/.env.'
    );
  }
  return token;
}

/**
 * Find an account by company name substring (case-insensitive).
 * Returns the first matching account object or null.
 */
async function findAccount(nameFragment, token) {
  const { status, body } = await get('/admin/accounts', token);
  if (status !== 200 || !Array.isArray(body)) return null;
  return body.find(a => a.company?.toLowerCase().includes(nameFragment.toLowerCase())) || null;
}

/**
 * List all jobs for a given customer_id.
 */
async function listJobs(customerId, token) {
  const { status, body } = await get(`/admin/accounts/${customerId}/jobs`, token);
  if (status !== 200) return [];
  return Array.isArray(body) ? body : (body.jobs ?? body.data ?? []);
}

/**
 * Update the delivery_notification email list for a job.
 * Uses POST /admin/jobs/{jobId}/configurations/output_info
 *
 * @param {string|number} jobId
 * @param {string[]}      emails  Array of email addresses
 * @param {string}        token
 */
async function setJobNotificationEmails(jobId, emails, token) {
  const { status, body } = await post(
    `/admin/jobs/${jobId}/configurations/output_info`,
    token,
    { delivery_notification: emails }
  );
  return { status, body };
}

/**
 * One-shot helper: find a job by name fragment and update its notification email.
 *
 * @param {string}   accountName   Company name fragment, e.g. 'Automation QA'
 * @param {string}   jobName       Job name fragment, e.g. 'Test Attributes'
 * @param {string[]} emails        Notification emails to set
 * @returns {{ jobId, status, skipped: boolean }}
 */
async function ensureJobNotificationEmail(accountName, jobName, emails) {
  const token = requireToken();

  const account = await findAccount(accountName, token);
  if (!account) throw new Error(`[cb-api] Account matching "${accountName}" not found`);

  const jobs = await listJobs(account.customer_id, token);
  const job  = jobs.find(j => (j.name || j.job_name || '').toLowerCase().includes(jobName.toLowerCase()));
  if (!job) throw new Error(`[cb-api] Job matching "${jobName}" not found in account "${account.company}"`);

  const jobId = job.job_id ?? job.id;
  const { status } = await setJobNotificationEmails(jobId, emails, token);

  return { jobId, status, skipped: false };
}

/**
 * Get full account detail for a given customer_id.
 * Returns the account object (includes products, jobs summary, etc.) or null on error.
 */
async function getAccountDetail(customerId, token) {
  const t = token || requireToken();
  const { status, body } = await get(`/admin/accounts/${customerId}`, t);
  if (status !== 200) return null;
  return body;
}

/**
 * Ensure a test SFTP user exists for an account — creates it if not found.
 * Idempotent and safe to call from test.beforeAll.
 *
 * @param {string|number} customerId  Account customer_id (e.g. '0147887')
 * @param {string}        name        Display name for the user
 * @param {string}        email       SFTP user email address
 * @returns {{ created: boolean, user: object }}
 */
async function ensureUserExists(customerId, name, email) {
  const token = requireToken();
  const { status, body } = await get(`/admin/accounts/${customerId}/users`, token);
  if (status === 200 && Array.isArray(body)) {
    const existing = body.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (existing) return { created: false, user: existing };
  }
  const { status: cs, body: cb } = await post(
    `/admin/accounts/${customerId}/users`,
    token,
    { email, name, access_type: 'SFTP', active: true, last_login: 0 }
  );
  return { created: true, status: cs, user: cb };
}

module.exports = {
  requireToken,
  findAccount,
  listJobs,
  setJobNotificationEmails,
  ensureJobNotificationEmail,
  getAccountDetail,
  ensureUserExists,
};
