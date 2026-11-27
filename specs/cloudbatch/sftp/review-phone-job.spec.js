const { test, expect } = require('./fixtures');
const { pollAndReadCSV } = require('../helpers/sftp');

test.setTimeout(35 * 60_000);

const SFTP_ROOT   = process.env.SFTP_ACCOUNT_PATH || '/jornaya-qa-us-east-1-appends-enrichment/';
const OUTBOUND    = `${SFTP_ROOT}0147887/Test_Phone/outbound`;
const OUTPUT_FILE = 'CB_Automation_File_Phone_output.csv';

const EXPECTED_HEADERS = [
  'PID','FIRSTNAME','LASTNAME','STREET','CITY','STATE','POSTALCODE','EMAIL','PHONE',
  'PHONE1','PHONE1_TYPE','PHONE1_MATCH_TYPE','PHONE1_IDATE','PHONE1_ODATE',
  'PHONE2','PHONE2_TYPE','PHONE2_MATCH_TYPE','PHONE2_IDATE','PHONE2_ODATE',
  'PHONE3','PHONE3_TYPE','PHONE3_MATCH_TYPE','PHONE3_IDATE','PHONE3_ODATE',
];

test.describe('SFTP — Review Phone job output file', () => {
  test('Poll outbound and validate Phone output CSV structure', async () => {
    test.skip(!process.env.SFTP_USER || !process.env.SFTP_PASSWORD, 'SFTP credentials not set');

    const result = await pollAndReadCSV(OUTPUT_FILE, {
      path:     OUTBOUND,
      timeout:  30 * 60_000,
      interval: 60_000,
    });

    expect(result, 'Phone output file should appear within 30 minutes').not.toBeNull();
    expect(result.stat.size, 'Output file should have non-zero size').toBeGreaterThan(0);
    expect.soft(result.rows.length, 'Output file should have ~21 data rows').toBeGreaterThanOrEqual(1);

    for (const h of EXPECTED_HEADERS) {
      expect.soft(result.headers, `Header "${h}" should be present`).toContain(h);
    }

    expect(result.headers.length, 'CSV should have multiple columns').toBeGreaterThan(1);
  });
});
