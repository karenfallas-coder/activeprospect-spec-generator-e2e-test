// spec generated for: validate CB_Automation_File_output.csv structure and content from SFTP outbound
const { test, expect } = require('./fixtures');
const { pollAndReadCSV } = require('../helpers/sftp');

const SFTP_ROOT     = process.env.SFTP_ACCOUNT_PATH;
const OUTBOUND_PATH = `${SFTP_ROOT}0147887/Test_Jobs/outbound`;
const OUTPUT_FILE   = 'CB_Automation_File_output.csv';

const EXPECTED_HEADERS = [
  'PID',
  'FIRSTNAME',
  'LASTNAME',
  'STREET',
  'CITY',
  'STATE',
  'POSTALCODE',
  'EMAIL',
  'PHONE',
  'Pid',
];
const EXPECTED_HEADER_LINE = EXPECTED_HEADERS.join(',');
const EXPECTED_TOTAL_ROWS = 21; // including header
const EXPECTED_DATA_ROWS  = EXPECTED_TOTAL_ROWS - 1;

test.setTimeout(10 * 60_000);

test.describe('Validate CB_Automation_File_output.csv from SFTP outbound', () => {
  let result;

  test.beforeAll(async () => {
    result = await pollAndReadCSV(OUTPUT_FILE, {
      path: OUTBOUND_PATH,
      timeout: parseInt(process.env.SFTP_POLL_TIMEOUT || '1800000'),
      interval: 30_000,
      delimiter: ',',
    });
  });

  test(`output file ${OUTPUT_FILE} exists in outbound`, async () => {
    expect(result, `${OUTPUT_FILE} did not appear within timeout`).not.toBeNull();
    expect(result.stat.size).toBeGreaterThan(0);
  });

  test('file has exactly 21 rows including the header', async () => {
    expect(result, 'File not available').not.toBeNull();
    // rows array excludes header, so total rows = rows.length + 1
    const totalRows = result.rows.length + 1;
    expect(totalRows, `Expected ${EXPECTED_TOTAL_ROWS} total rows (incl. header), got ${totalRows}`).toBe(EXPECTED_TOTAL_ROWS);
    expect(result.rows.length).toBe(EXPECTED_DATA_ROWS);
  });

  test('header layout and column order matches exactly', async () => {
    expect(result, 'File not available').not.toBeNull();
    expect(result.headers).toEqual(EXPECTED_HEADERS);
    expect(result.headers.join(',')).toBe(EXPECTED_HEADER_LINE);
  });

  test('columns are separated by commas (raw header line check)', async () => {
    expect(result, 'File not available').not.toBeNull();
    const { readFileContent } = require('../helpers/sftp');
    const raw = await readFileContent(`${OUTBOUND_PATH}/${OUTPUT_FILE}`);
    const firstLine = raw.split(/\r?\n/)[0];
    // The output file wraps every field in double quotes ("PID","FIRSTNAME",…). Strip the quotes
    // before comparing to the expected comma-delimited header line — the values (not the quoting)
    // are what this check validates.
    const normalized = firstLine.replace(/"/g, '');
    expect(normalized).toBe(EXPECTED_HEADER_LINE);
    expect(normalized.split(',').length).toBe(EXPECTED_HEADERS.length);
  });

  test('data is correctly aligned under each column', async () => {
    expect(result, 'File not available').not.toBeNull();
    expect(result.rows.length).toBeGreaterThan(0);
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows[i];
      const keys = Object.keys(row);
      expect(keys.length, `Row ${i + 1} has ${keys.length} columns, expected ${EXPECTED_HEADERS.length}`).toBe(EXPECTED_HEADERS.length);
      for (const col of EXPECTED_HEADERS) {
        expect(row, `Row ${i + 1} missing column "${col}"`).toHaveProperty(col);
      }
    }
  });
});