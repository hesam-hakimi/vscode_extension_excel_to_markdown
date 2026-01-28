import { sanitizeSheetName } from './sanitize';

export function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value.toString() : '';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return String(value);
}

const markdownEscapes = new RegExp('([\\\\`*_{}\\[\\]()#+.!|~-])', 'g');

export function escapeMarkdown(value: string): string {
  const sanitized = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const escaped = sanitized
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
    .replace(markdownEscapes, '\\$1');
  return escaped;
}

export function normalizeRows(rows: unknown[][], colCount: number): string[][] {
  return rows.map<string[]>((row) => {
    const normalized = new Array<string>(colCount).fill('');
    for (let i = 0; i < colCount; i += 1) {
      normalized[i] = escapeMarkdown(formatCellValue(row[i]));
    }
    return normalized;
  });
}

export function rowsToMarkdownTable(rows: unknown[][], heading?: string, includeHeading = true): { markdown: string; rowCount: number; colCount: number } {
  const computedCols = Math.max(1, rows.reduce((max, row) => Math.max(max, row.length), 0));
  const colCount = computedCols;
  const normalizedRows = normalizeRows(rows, colCount);
  const headerRow = normalizedRows[0] ?? new Array(colCount).fill('');
  const headerLine = `| ${headerRow.join(' | ')} |`;
  const separator = `| ${new Array(colCount).fill('---').join(' | ')} |`;
  const bodyLines = normalizedRows.slice(1).map((row) => `| ${row.join(' | ')} |`);

  const parts: string[] = [];
  if (includeHeading && heading) {
    const safeHeading = sanitizeSheetName(heading);
    parts.push(`## ${escapeMarkdown(safeHeading)}`);
  }
  parts.push(headerLine, separator, ...bodyLines);

  return {
    markdown: parts.join('\n'),
    rowCount: rows.length,
    colCount
  };
}
