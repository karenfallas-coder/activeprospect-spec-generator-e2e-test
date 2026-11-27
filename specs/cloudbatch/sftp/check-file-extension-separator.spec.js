// spec generated for: validate outbound CB_Automation_File_output.csv format and comma-delimited content
const { test, expect } = require('./fixtures');
const { pollAndReadCSV } = require('../helpers/sftp');
const path = require('path');

const SFTP_ROOT     = process.env.SFTP_ACCOUNT_PATH;
const OUTBOUND_PATH = `${SFTP_ROOT}0147887/Test_Jobs/outbound`;
const OUTPUT_FILE   = 'CB_Automation_File_output.csv';

test.setTimeout(10 * 60_000);

test.describe('Validate outbound CB_Automation_File_output.csv format and content', () => {
  let result;

  test('output file exists in outbound folder', async () => {
    result = await pollAndReadCSV(OUTPUT_FILE, {
      path: OUTBOUND_PATH,
      timeout: parseInt(process.env.SFTP_POLL_TIMEOUT || '1800000'),
      interval: 30_000,
      delimiter: ',',
    });
    expect(result, `${OUTPUT_FILE} did not appear within timeout`).not.toBeNull();
    expect(result.stat.size).toBeGreaterThan(0);
  });

  test('file has .csv extension', async () => {
    expect(result, 'Prior test must have populated result').not.toBeNull();
    const ext = path.extname(OUTPUT_FILE).toLowerCase();
    expect(ext, `Expected .csv extension, got ${ext}`).toBe('.csv');
  });

  test('file is parseable as CSV with comma delimiter', async () => {
    expect(result, 'Prior test must have populated result').not.toBeNull();
    expect(Array.isArray(result.headers), 'Headers should be an array').toBe(true);
    expect(result.headers.length).toBeGreaterThan(0);
    expect(Array.isArray(result.rows), 'Rows should be an array').toBe(true);
    expect(result.rows.length).toBeGreaterThan(0);
  });

  test('columns are correctly separated (not collapsed into a single column)', async () => {
    expect(result, 'Prior test must have populated result').not.toBeNull();
    expect(
      result.headers.length,
      `Expected multiple columns but got a single column: ${JSON.stringify(result.headers)}`
    ).toBeGreaterThan(1);

    // Ensure header row doesn't contain unsplit content (e.g. embedded commas indicating wrong delimiter)
    for (const h of result.headers) {
      expect(h, `Header "${h}" appears to contain an unsplit comma`).not.toMatch(/,/);
    }

    // Verify first data row also splits into multiple fields
    const firstRow = result.rows[0];
    const firstRowKeys = Object.keys(firstRow);
    expect(
      firstRowKeys.length,
      `First data row is not comma-delimited into multiple fields: ${JSON.stringify(firstRow)}`
    ).toBeGreaterThan(1);
  });
});