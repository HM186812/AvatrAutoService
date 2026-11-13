import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeCsvCell, buildCsvContent } from '../src/utils/csv';

test('escapeCsvCell neutralizes leading formula characters (=, +, -, @, tab, cr) even after leading whitespace', () => {
  assert.equal(escapeCsvCell('=SUM(A1:A2)'), `"'=SUM(A1:A2)"`);
  assert.equal(escapeCsvCell('+cmd|calc'), `"'+cmd|calc"`);
  assert.equal(escapeCsvCell('-1+1'), `"'-1+1"`);
  assert.equal(escapeCsvCell('@HYPERLINK("http://evil")'), `"'@HYPERLINK(""http://evil"")"`);
  assert.equal(escapeCsvCell('  =1+1'), `"'  =1+1"`);
  assert.equal(escapeCsvCell('\t=2+2'), `"'\t=2+2"`);
  assert.equal(escapeCsvCell('\r=3+3'), `"' =3+3"`);
});

test('escapeCsvCell preserves normal strings, numbers, nullish values, and normalizes newlines', () => {
  assert.equal(escapeCsvCell(null), '""');
  assert.equal(escapeCsvCell(undefined), '""');
  assert.equal(escapeCsvCell(42900), '"42900"');
  assert.equal(escapeCsvCell('Line 1\r\nLine "2"'), '"Line 1 Line ""2"""');
});

test('buildCsvContent prepends UTF-8 BOM and joins header + escaped rows', () => {
  const csv = buildCsvContent(['Name', 'Note'], [['Alice', '=1+1'], ['Bob', 'OK']]);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.equal(csv, '\uFEFF"Name","Note"\n"Alice","\'=1+1"\n"Bob","OK"');
});
