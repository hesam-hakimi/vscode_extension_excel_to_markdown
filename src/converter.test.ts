import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { convertAllSheets, convertSelectedSheets } from './converter';
import type { ExtensionConfig } from './types';

async function makeWorkbookFile(sheets: Record<string, unknown[][]>): Promise<string> {
  const wb = XLSX.utils.book_new();
  for (const [name, data] of Object.entries(sheets)) {
    const sheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, sheet, name);
  }
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'excel-md-')); // temp dir
  const filePath = path.join(dir, 'workbook.xlsx');
  XLSX.writeFile(wb, filePath, { bookType: 'xlsx' });
  return filePath;
}

const baseConfig: ExtensionConfig = {
  outputMode: 'perSheet',
  outputDirectory: 'sameAsSource',
  maxRows: 10,
  maxCols: 5,
  includeSheetTitleHeading: true,
  allowXlsm: false
};

describe('converter', () => {
  it('converts all sheets to individual markdown files', async () => {
    const filePath = await makeWorkbookFile({
      Sheet1: [
        ['Name', 'Age'],
        ['Ada', 30]
      ],
      Second: [
        ['X', 'Y'],
        ['1', '2']
      ]
    });
    const outDir = await fs.mkdtemp(path.join(os.tmpdir(), 'excel-md-out-'));
    const result = await convertAllSheets(filePath, outDir, baseConfig);

    expect(result.files).toHaveLength(2);
    const basenames = result.files.map((f) => path.basename(f.outputPath));
    expect(basenames.some((name) => name.includes('__Sheet1.md'))).toBe(true);
    expect(basenames.some((name) => name.includes('__Second.md'))).toBe(true);

    const content = await fs.readFile(result.files[0].outputPath, 'utf8');
    expect(content).toContain('| Name | Age |');
  });

  it('respects row limits and reports warnings', async () => {
    const filePath = await makeWorkbookFile({
      Data: [
        ['Header'],
        ['1'],
        ['2'],
        ['3']
      ]
    });
    const outDir = await fs.mkdtemp(path.join(os.tmpdir(), 'excel-md-out-'));
    const config = { ...baseConfig, maxRows: 2 };
    const result = await convertAllSheets(filePath, outDir, config);

    expect(result.warnings[0]).toContain('truncated to 2 rows');
    const content = await fs.readFile(result.files[0].outputPath, 'utf8');
    expect(content).not.toContain('| 3 |');
  });

  it('combines sheets when singleFile mode is enabled', async () => {
    const filePath = await makeWorkbookFile({
      A: [
        ['Col'],
        ['a']
      ],
      B: [
        ['Col'],
        ['b']
      ]
    });
    const outDir = await fs.mkdtemp(path.join(os.tmpdir(), 'excel-md-out-'));
    const config = { ...baseConfig, outputMode: 'singleFile' as const };
    const result = await convertAllSheets(filePath, outDir, config);

    expect(result.combined).toBe(true);
    expect(result.files).toHaveLength(1);
    const content = await fs.readFile(result.files[0].outputPath, 'utf8');
    expect(content).toContain('## A');
    expect(content).toContain('## B');
  });

  it('converts only selected sheets', async () => {
    const filePath = await makeWorkbookFile({
      Keep: [
        ['H'],
        ['ok']
      ],
      Skip: [
        ['H'],
        ['no']
      ]
    });
    const outDir = await fs.mkdtemp(path.join(os.tmpdir(), 'excel-md-out-'));
    const result = await convertSelectedSheets(filePath, outDir, ['Keep'], baseConfig);
    expect(result.files).toHaveLength(1);
    const content = await fs.readFile(result.files[0].outputPath, 'utf8');
    expect(content).toContain('ok');
    expect(content).not.toContain('no');
  });
});
