const { test, expect } = require('./fixtures');
const { pollForEmail } = require('../helpers/email');
const { ensureJobNotificationEmail } = require('../helpers/cb-api');

// The SFTP sweeper polls inbound every ~15 min, so the job may not start until ~15 min after the
// file is uploaded. Timeouts below absorb that delay: "Job Started" can arrive up to ~15 min out,
// "Job Finished" up to ~40 min out. Start this spec at or just before the upload so afterMs (sentAt)
// precedes the notification emails.
test.setTimeout(50 * 60_000);

const NOTIFICATION_INBOX = '1pe-automation';
const NOTIFICATION_EMAIL = '1pe-automation@mailinator.com';
const ACCOUNT_NAME       = 'Automation QA';
const JOB_NAME           = 'Test Email';

test.describe('SFTP Email Notifications — Test Email job', () => {
  let sentAt;

  test.beforeAll(async () => {
    try {
      const r = await ensureJobNotificationEmail(ACCOUNT_NAME, JOB_NAME, [NOTIFICATION_EMAIL]);
      console.log(`✅ Notification email → ${NOTIFICATION_EMAIL} (HTTP ${r.status})`);
    } catch (err) {
      console.warn(`⚠ Could not auto-set notification email via API (${err.message}).\n` +
        `  → The "${JOB_NAME}" job must already have ${NOTIFICATION_EMAIL} set in the CB admin UI\n` +
        `    (Job Notifications section) for these notification emails to arrive. This is a one-time\n` +
        `    UI setup — cb-api cannot get an Auth0 token in this env (session-storage.json is not produced).`);
    }
    sentAt = Date.now();
  });

  test('Receives "Job Started - Test Email" email with correct body', async () => {
    const email = await pollForEmail(
      NOTIFICATION_INBOX,
      'Job Started - Test Email',
      { timeout: 20 * 60_000, interval: 15_000, afterMs: sentAt }
    );
    expect(email, '"Job Started" email not received within 20 min').not.toBeNull();

    const body = email.htmlBody || email.body || '';
    expect.soft(body, 'Email body should mention Automation QA').toMatch(/Automation QA/i);
    expect.soft(body, 'Email body should mention Test Email').toMatch(/Test Email/i);
    expect.soft(body, 'Email body should include input file name').toMatch(/CB_Automation_File_Email\.txt/i);
  });

  test('Receives "Job Finished - Test Email" email with correct body', async () => {
    const email = await pollForEmail(
      NOTIFICATION_INBOX,
      'Job Finished - Test Email',
      { timeout: 45 * 60_000, interval: 30_000, afterMs: sentAt }
    );
    expect(email, '"Job Finished" email not received within 45 min').not.toBeNull();

    const body = email.htmlBody || email.body || '';
    expect.soft(body, 'Email body should mention Automation QA').toMatch(/Automation QA/i);
    expect.soft(body, 'Email body should include output file name').toMatch(/CB_Automation_File_Email_output\.txt/i);
  });
});
