const { test, expect } = require('./fixtures');
const path = require('path');
const SftpClient = require('ssh2-sftp-client');

test.setTimeout(2 * 60_000);

// Credentials come from env (runner/.env) — never hardcode.
const HOST      = process.env.SFTP_HOST     || 'sftp.qa.veriskmarketingsolutions.com';
const PORT      = parseInt(process.env.SFTP_PORT || '22', 10);
const USERNAME  = process.env.SFTP_USER;
const PASSWORD  = process.env.SFTP_PASSWORD;
const SFTP_ROOT = process.env.SFTP_ACCOUNT_PATH || '/jornaya-qa-us-east-1-appends-enrichment/';

const INBOUND     = `${SFTP_ROOT}0147887/Test_Attributes/inbound`;
// The Attributes job's input is a PIPE-delimited .txt (FIRSTNAME|LASTNAME|…|PHONE). The pipeline
// derives the output name from it: CB_Automation_File_Attributes.txt → CB_Automation_File_Attributes_output.csv.
const LOCAL_FILE  = path.join(__dirname, '..', '..', 'test-data', 'CB_Automation_File_Attributes.txt');
const FILE_NAME   = 'CB_Automation_File_Attributes.txt';
const REMOTE_FILE = `${INBOUND}/${FILE_NAME}`;

test.describe('SFTP — Upload CB_Automation_File_Attributes.txt to Test_Attributes/inbound', () => {
  test('Connect to SFTP and upload input file to the Attributes job inbound folder', async () => {
    test.skip(!USERNAME || !PASSWORD, 'SFTP_USER / SFTP_PASSWORD not set in runner/.env');

    const sftp = new SftpClient();
    try {
      await sftp.connect({ host: HOST, port: PORT, username: USERNAME, password: PASSWORD });

      // Verify connection by listing the account folder. The SFTP user is scoped to its account
      // path (0147887/) and CANNOT list the bucket root (SFTP_ROOT) — that returns "Access denied".
      const accountList = await sftp.list(`${SFTP_ROOT}0147887/`);
      expect(accountList.length, 'SFTP account folder (0147887) should be accessible').toBeGreaterThan(0);

      // The sweeper does NOT remove the file from inbound after processing, so a prior copy may
      // still be here. Delete it first, then upload fresh — this avoids GUI overwrite prompts and
      // ensures the sweeper sees a NEW file to (re)process (an in-place overwrite may not re-trigger).
      if (await sftp.exists(REMOTE_FILE)) await sftp.delete(REMOTE_FILE);
      // Uploading the input file to inbound triggers the Attributes enrichment job.
      await sftp.put(LOCAL_FILE, REMOTE_FILE);

      // Verify the file is present in the inbound folder.
      const inboundFiles = await sftp.list(INBOUND);
      const uploaded = inboundFiles.find(f => f.name === FILE_NAME);
      expect(uploaded, `${FILE_NAME} should appear in Test_Attributes/inbound after upload`).not.toBeNull();
      expect(uploaded.size, 'Uploaded file should have non-zero size').toBeGreaterThan(0);
    } finally {
      await sftp.end();
    }
  });
});
