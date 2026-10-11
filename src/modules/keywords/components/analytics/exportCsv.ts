import { downloadCsv } from '../../services/csvExportService';

type CsvValue = string | number | null | undefined;

function escape(value: CsvValue): string {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Export an array of flat row objects as a CSV download. */
export function exportRowsToCsv(filename: string, rows: Array<Record<string, CsvValue>>): void {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(row => headers.map(h => escape(row[h])).join(',')),
  ].join('\n');
  downloadCsv(csv, filename);
}
