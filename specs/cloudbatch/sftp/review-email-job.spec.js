const { test, expect } = require('./fixtures');
const { pollAndReadCSV } = require('../helpers/sftp');

test.setTimeout(35 * 60_000);

const SFTP_ROOT   = process.env.SFTP_ACCOUNT_PATH || '/jornaya-qa-us-east-1-appends-enrichment/';
const OUTBOUND    = `${SFTP_ROOT}0147887/Test_Email/outbound`;
const OUTPUT_FILE = 'CB_Automation_File_Email_output.txt';

const EXPECTED_HEADERS = [
  'FIRSTNAME','LASTNAME','STREET','CITY','STATE','POSTALCODE','EMAIL','PHONE',
  'EMAIL1','EMAIL1_MATCH_TYPE','EMAIL1_VALIDATION_CODE','EMAIL1_IDATE','EMAIL1_ODATE',
  'EMAIL2','EMAIL2_MATCH_TYPE','EMAIL2_VALIDATION_CODE','EMAIL2_IDATE','EMAIL2_ODATE',
  'EMAIL3','EMAIL3_MATCH_TYPE','EMAIL3_VALIDATION_CODE','EMAIL3_IDATE','EMAIL3_ODATE',
  'EMAIL4','EMAIL4_MATCH_TYPE','EMAIL4_VALIDATION_CODE','EMAIL4_IDATE','EMAIL4_ODATE',
  'EMAIL5','EMAIL5_MATCH_TYPE','EMAIL5_VALIDATION_CODE','EMAIL5_IDATE','EMAIL5_ODATE',
];

test.describe('SFTP — Review Email job output file (tab-delimited .txt)', () => {
  test('Poll outbound and validate Email output file structure', async () => {
    test.skip(!process.env.SFTP_USER || !process.env.SFTP_PASSWORD, 'SFTP credentials not set');

    const result = await pollAndReadCSV(OUTPUT_FILE, {
      path:      OUTBOUND,
      timeout:   30 * 60_000,
      interval:  60_000,
      delimiter: '\t',
    });

    expect(result, 'Email output file should appear within 30 minutes').not.toBeNull();
    expect(result.stat.size, 'Output file should have non-zero size').toBeGreaterThan(0);
    expect.soft(result.rows.length, 'Output file should have ~20 data rows').toBeGreaterThanOrEqual(1);

    for (const h of EXPECTED_HEADERS) {
      expect.soft(result.headers, `Header "${h}" should be present`).toContain(h);
    }

    expect(result.headers.length, 'File should have multiple tab-separated columns').toBeGreaterThan(1);
  });
});
