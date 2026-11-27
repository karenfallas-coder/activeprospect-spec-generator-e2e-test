const { test, expect } = require('./fixtures');
const path = require('path');
const fs = require('fs');
const SftpClient = require('ssh2-sftp-client');

test.setTimeout(2 * 60_000);

// Credentials come from env (runner/.env) — same SFTP user as upload-file-to-inbound. Never hardcode.
const HOST      = process.env.SFTP_HOST     || 'sftp.qa.veriskmarketingsolutions.com';
const PORT      = parseInt(process.env.SFTP_PORT || '22', 10);
const USERNAME  = process.env.SFTP_USER;
const PASSWORD  = process.env.SFTP_PASSWORD;
const SFTP_ROOT = process.env.SFTP_ACCOUNT_PATH || '/jornaya-qa-us-east-1-appends-enrichment/';

const OUTBOUND    = `${SFTP_ROOT}0147887/Test_Jobs/outbound`;
const FILE_NAME   = 'CB_Automation_File_output.csv';
const REMOTE_FILE = `${OUTBOUND}/${FILE_NAME}`;

// Local download location — override with SFTP_DOWNLOAD_DIR, else ./downloads at repo root.
const DOWNLOAD_DIR  = process.env.SFTP_DOWNLOAD_DIR || path.join(__dirname, '..', '..', 'downloads');
const LOCAL_FILE    = path.join(DOWNLOAD_DIR, FILE_NAME);

test.describe('SFTP — Download CB_Automation_File_output.csv from Test_Jobs/outbound', () => {
  test('Connect, locate the output file, download it and verify it exists locally', async () => {
    test.skip(!USERNAME || !PASSWORD, 'SFTP_USER / SFTP_PASSWORD not set in runner/.env');

    const sftp = new SftpClient();
    try {
      // 2-3) Connect and validate the connection. The SFTP user is scoped to its account folder
      // (0147887/) and CANNOT list the bucket root (SFTP_ROOT) — that returns "Access denied".
      // Listing the account folder confirms the connection is up and authorized.
      await sftp.connect({ host: HOST, port: PORT, username: USERNAME, password: PASSWORD });
      const accountList = await sftp.list(`${SFTP_ROOT}0147887/`);
      expect(accountList.length, 'SFTP account folder (0147887) should be accessible').toBeGreaterThan(0);

      // 4-6) Confirm the "Test_Jobs" job directory exists inside the account folder.
      const hasJobDir = accountList.some(f => f.type === 'd' && f.name === 'Test_Jobs');
      expect(hasJobDir, 'Directory "Test_Jobs" should exist under 0147887').toBe(true);

      // 7-8) Open the outbound folder and search for the output file.
      const outboundFiles = await sftp.list(OUTBOUND);
      const remote = outboundFiles.find(f => f.name === FILE_NAME);
      test.skip(!remote, `${FILE_NAME} not found in Test_Jobs/outbound yet — run the job (upload to inbound) and wait for it to finish first`);
      expect(remote.size, 'Remote output file should have non-zero size').toBeGreaterThan(0);

      // 9) Download the file to the configured local location (clean any stale copy first).
      fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
      if (fs.existsSync(LOCAL_FILE)) fs.rmSync(LOCAL_FILE);
      await sftp.fastGet(REMOTE_FILE, LOCAL_FILE);

      // 10-11) Validate the download finished successfully and the file exists locally with content
      // matching the remote size.
      expect(fs.existsSync(LOCAL_FILE), `Downloaded file should exist at ${LOCAL_FILE}`).toBe(true);
      const localSize = fs.statSync(LOCAL_FILE).size;
      expect(localSize, 'Downloaded file should be non-empty').toBeGreaterThan(0);
      expect(localSize, 'Downloaded file size should match the remote file size').toBe(remote.size);
    } finally {
      await sftp.end();
    }
  });
});
