/**
 * Neutralize spreadsheet formula injection (=, +, -, @, tab, carriage return)
 * and escape CSV fields per RFC 4180.
 */
export function escapeCsvCell(value: unknown): string {
  const normalized = String(value ?? '').replace(/\r?\n|\r/g, ' ');
  const neutralized = /^[\t ]*[=+\-@\t]/.test(normalized) ? `'${normalized}` : normalized;
  return `"${neutralized.replace(/"/g, '""')}"`;
}

/** Build a UTF-8 BOM-prefixed CSV payload safe for Excel / LibreOffice / Sheets. */
export function buildCsvContent(headers: string[], rows: unknown[][]): string {
  const headerLine = headers.map(escapeCsvCell).join(',');
  const dataLines = rows.map(row => row.map(escapeCsvCell).join(','));
  return '\uFEFF' + [headerLine, ...dataLines].join('\n');
}

/** Trigger browser CSV file download and always revoke the generated ObjectURL. */
export function downloadCsv(filename: string, headers: string[], rows: unknown[][]): void {
  const csvContent = buildCsvContent(headers, rows);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
