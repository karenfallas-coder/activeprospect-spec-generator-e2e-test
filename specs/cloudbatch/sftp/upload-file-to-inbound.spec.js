const { test, expect } = require('./fixtures');
const path = require('path');
const SftpClient = require('ssh2-sftp-client');

test.setTimeout(2 * 60_000);

const HOST      = process.env.SFTP_HOST     || 'sftp.qa.veriskmarketingsolutions.com';
const PORT      = parseInt(process.env.SFTP_PORT || '22', 10);
const USERNAME  = process.env.SFTP_USER;
const PASSWORD  = process.env.SFTP_PASSWORD;
const SFTP_ROOT = process.env.SFTP_ACCOUNT_PATH || '/jornaya-qa-us-east-1-appends-enrichment/';
const INBOUND   = `${SFTP_ROOT}0147887/Test_Jobs/inbound`;
const LOCAL_CSV = path.join(__dirname, '..', '..', 'test-data', 'CB_Automation_File.csv');
const REMOTE_CSV = `${INBOUND}/CB_Automation_File.csv`;

test.describe('SFTP — Upload CB_Automation_File.csv to Test_Jobs/inbound', () => {
  test('Connect to SFTP and upload file to inbound folder', async () => {
    test.skip(!USERNAME || !PASSWORD, 'SFTP_USER / SFTP_PASSWORD not set in runner/.env');

    const sftp = new SftpClient();
    try {
      await sftp.connect({ host: HOST, port: PORT, username: USERNAME, password: PASSWORD });

      // Verify connection by listing the account folder. NOTE: the SFTP user is scoped to its
      // account path (0147887/) and does NOT have permission to list the bucket root
      // (SFTP_ROOT) — listing the root returns "Access denied". List the account folder instead.
      const accountList = await sftp.list(`${SFTP_ROOT}0147887/`);
      expect(accountList.length, 'SFTP account folder should be accessible').toBeGreaterThan(0);

      // The sweeper does NOT remove the file from inbound after processing, so a prior copy may
      // still be here. Delete it first, then upload fresh — this avoids GUI overwrite prompts and
      // ensures the sweeper sees a NEW file to (re)process (an in-place overwrite may not re-trigger).
      if (await sftp.exists(REMOTE_CSV)) await sftp.delete(REMOTE_CSV);
      await sftp.put(LOCAL_CSV, REMOTE_CSV);

      // Verify the file is present in the inbound folder
      const inboundFiles = await sftp.list(INBOUND);
      const uploaded = inboundFiles.find(f => f.name === 'CB_Automation_File.csv');
      expect(uploaded, 'CB_Automation_File.csv should appear in the inbound folder after upload').not.toBeNull();
      expect(uploaded.size, 'Uploaded file should have non-zero size').toBeGreaterThan(0);
    } finally {
      await sftp.end();
    }
  });
});
