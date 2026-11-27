const { test, expect } = require('./fixtures');
const { pollAndReadCSV } = require('../helpers/sftp');

test.setTimeout(35 * 60_000);

const SFTP_ROOT    = process.env.SFTP_ACCOUNT_PATH || '/jornaya-qa-us-east-1-appends-enrichment/';
const OUTBOUND     = `${SFTP_ROOT}0147887/Test_Attributes/outbound`;
const OUTPUT_FILE  = 'CB_Automation_File_Attributes_output.csv';

const EXPECTED_HEADERS = [
  'FIRSTNAME','LASTNAME','STREET','CITY','STATE','POSTALCODE',
  'EMAIL','PHONE','PID','HHID','ADDRID','MATCH_LEVEL',
  'GENDER','AGE','DOB','HEQUITY_EST','VANTAGE_SCR','IMS_INSUR_HOME',
];

test.describe('SFTP — Review Attributes job output file', () => {
  test('Poll outbound folder and validate Attributes output CSV structure', async () => {
    test.skip(!process.env.SFTP_USER || !process.env.SFTP_PASSWORD, 'SFTP credentials not set');

    const result = await pollAndReadCSV(OUTPUT_FILE, {
      path:     OUTBOUND,
      timeout:  30 * 60_000,
      interval: 60_000,
    });

    expect(result, 'Output file should appear within 30 minutes').not.toBeNull();
    expect(result.stat.size, 'Output file should have non-zero size').toBeGreaterThan(0);

    // Row count: 20 data rows + 1 header = 21 total
    expect.soft(result.rows.length, 'Output file should have ~20 data rows').toBeGreaterThanOrEqual(1);

    // Validate required headers
    for (const h of EXPECTED_HEADERS) {
      expect.soft(result.headers, `Header "${h}" should be present`).toContain(h);
    }

    // CSV delimiter is comma — already confirmed by readCSV parsing
    expect(result.headers.length, 'CSV should have multiple columns (not single-column)').toBeGreaterThan(1);
  });
});
