import fs from 'fs/promises';
import path from 'path';
import * as XLSX from 'xlsx';
import type * as vscode from 'vscode';
import { rowsToMarkdownTable } from './markdown';
import { buildOutputFileName, ensureWithinDirectory, isAllowedExtension, sanitizeSheetName } from './sanitize';
import type { ConversionResult, ExtensionConfig, SheetMarkdown } from './types';

const READ_OPTIONS: XLSX.ParsingOptions = {
  type: 'file',
  cellStyles: false,
  cellDates: true,
  cellNF: false,
  dense: true,
  WTF: false
};

async function readWorkbook(filePath: string, config: ExtensionConfig): Promise<XLSX.WorkBook> {
  if (!isAllowedExtension(filePath, config.allowXlsm)) {
    const allowed = config.allowXlsm ? '.xlsx or .xlsm' : '.xlsx';
    throw new Error(`Unsupported file type. Please select ${allowed} files.`);
  }
  await fs.access(filePath);
  try {
    return XLSX.readFile(filePath, READ_OPTIONS);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message.toLowerCase().includes('password')) {
      throw new Error('The workbook appears to be password-protected and cannot be opened.');
    }
    throw new Error(`Unable to read workbook: ${message}`);
  }
}

function limitRowsAndCols(rows: unknown[][], maxRows: number, maxCols: number): { limited: unknown[][]; truncatedRows: boolean; truncatedCols: boolean } {
  const truncatedRows = rows.length > maxRows;
  const limitedRows = rows.slice(0, maxRows).map((row) => row.slice(0, maxCols));
  const truncatedCols = rows.some((row) => row.length > maxCols);
  return { limited: limitedRows, truncatedRows, truncatedCols };
}

function sheetToMarkdown(workbook: XLSX.WorkBook, sheetName: string, config: ExtensionConfig): SheetMarkdown {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Sheet ${sheetName} not found.`);
  }
  const rawRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    blankrows: true,
    raw: true,
    defval: ''
  });
  const { limited, truncatedRows, truncatedCols } = limitRowsAndCols(rawRows, config.maxRows, config.maxCols);
  const { markdown, rowCount, colCount } = rowsToMarkdownTable(limited, sheetName, config.includeSheetTitleHeading);
  return { sheetName, markdown, truncatedRows, truncatedCols, rowCount, colCount };
}

async function writeMarkdown(targetDirectory: string, fileName: string, content: string): Promise<string> {
  const targetPath = ensureWithinDirectory(path.join(targetDirectory, fileName), targetDirectory);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, content, { encoding: 'utf8', flag: 'w' });
  return targetPath;
}

function validateLimits(config: ExtensionConfig): ExtensionConfig {
  const sanitizeNumber = (value: number, fallback: number, min: number, max: number) => {
    if (Number.isNaN(value) || !Number.isFinite(value)) return fallback;
    const integer = Math.max(min, Math.min(Math.floor(value), max));
    return integer;
  };
  return {
    ...config,
    maxRows: sanitizeNumber(config.maxRows, 2000, 1, 200000),
    maxCols: sanitizeNumber(config.maxCols, 100, 1, 2000)
  };
}

export async function getWorksheetNames(filePath: string, config: ExtensionConfig): Promise<string[]> {
  const workbook = await readWorkbook(filePath, config);
  return workbook.SheetNames;
}

export async function convertAllSheets(
  filePath: string,
  outputDirectory: string,
  config: ExtensionConfig,
  progress?: vscode.Progress<{ message?: string; increment?: number }>,
  token?: vscode.CancellationToken
): Promise<ConversionResult> {
  const safeConfig = validateLimits(config);
  const workbook = await readWorkbook(filePath, safeConfig);
  const worksheetNames = workbook.SheetNames;
  if (worksheetNames.length === 0) {
    throw new Error('The workbook has no worksheets to convert.');
  }

  const existingNames = new Set<string>();
  const results: ConversionResult['files'] = [];
  const warnings: string[] = [];

  if (safeConfig.outputMode === 'singleFile') {
    let combinedContent = '';
    for (let index = 0; index < worksheetNames.length; index += 1) {
      const name = worksheetNames[index];
      if (token?.isCancellationRequested) {
        break;
      }
      progress?.report({ message: `Processing ${name} (${index + 1}/${worksheetNames.length})` });
      const sheetMarkdown = sheetToMarkdown(workbook, name, safeConfig);
      combinedContent += `${sheetMarkdown.markdown}\n\n`;
      if (sheetMarkdown.truncatedRows) {
        warnings.push(`Sheet "${name}" truncated to ${safeConfig.maxRows} rows.`);
      }
      if (sheetMarkdown.truncatedCols) {
        warnings.push(`Sheet "${name}" truncated to ${safeConfig.maxCols} columns.`);
      }
    }
    if (combinedContent.trim().length === 0) {
      return { files: [], warnings, combined: true };
    }
    const workbookBase = path.basename(filePath, path.extname(filePath));
    const fileName = `${sanitizeSheetName(workbookBase)}__all.md`;
    const outputPath = await writeMarkdown(outputDirectory, fileName, combinedContent.trimEnd());
    results.push({
      sheetName: 'ALL',
      outputPath,
      truncatedRows: warnings.some((w) => w.includes('rows')),
      truncatedCols: warnings.some((w) => w.includes('columns')),
      rowCount: 0,
      colCount: 0
    });
    return { files: results, warnings, combined: true };
  }

  const total = worksheetNames.length;
  for (let i = 0; i < total; i += 1) {
    const name = worksheetNames[i];
    if (token?.isCancellationRequested) {
      break;
    }
    progress?.report({ message: `Processing ${name} (${i + 1}/${total})` });
    const sheetMarkdown = sheetToMarkdown(workbook, name, safeConfig);
    const fileName = buildOutputFileName(path.basename(filePath, path.extname(filePath)), name, existingNames);
    const outputPath = await writeMarkdown(outputDirectory, fileName, sheetMarkdown.markdown);
    results.push({
      sheetName: name,
      outputPath,
      truncatedRows: sheetMarkdown.truncatedRows,
      truncatedCols: sheetMarkdown.truncatedCols,
      rowCount: sheetMarkdown.rowCount,
      colCount: sheetMarkdown.colCount
    });
    if (sheetMarkdown.truncatedRows) {
      warnings.push(`Sheet "${name}" truncated to ${safeConfig.maxRows} rows.`);
    }
    if (sheetMarkdown.truncatedCols) {
      warnings.push(`Sheet "${name}" truncated to ${safeConfig.maxCols} columns.`);
    }
  }

  return { files: results, warnings, combined: false };
}

export async function convertSelectedSheets(
  filePath: string,
  outputDirectory: string,
  sheetNames: string[],
  config: ExtensionConfig,
  progress?: vscode.Progress<{ message?: string; increment?: number }>,
  token?: vscode.CancellationToken
): Promise<ConversionResult> {
  const safeConfig = validateLimits(config);
  const workbook = await readWorkbook(filePath, safeConfig);
  const existingNames = new Set<string>();
  const results: ConversionResult['files'] = [];
  const warnings: string[] = [];

  for (let i = 0; i < sheetNames.length; i += 1) {
    const name = sheetNames[i];
    if (token?.isCancellationRequested) {
      break;
    }
    progress?.report({ message: `Processing ${name} (${i + 1}/${sheetNames.length})` });
    const sheetMarkdown = sheetToMarkdown(workbook, name, safeConfig);
    const fileName = buildOutputFileName(path.basename(filePath, path.extname(filePath)), name, existingNames);
    const outputPath = await writeMarkdown(outputDirectory, fileName, sheetMarkdown.markdown);
    results.push({
      sheetName: name,
      outputPath,
      truncatedRows: sheetMarkdown.truncatedRows,
      truncatedCols: sheetMarkdown.truncatedCols,
      rowCount: sheetMarkdown.rowCount,
      colCount: sheetMarkdown.colCount
    });
    if (sheetMarkdown.truncatedRows) {
      warnings.push(`Sheet "${name}" truncated to ${safeConfig.maxRows} rows.`);
    }
    if (sheetMarkdown.truncatedCols) {
      warnings.push(`Sheet "${name}" truncated to ${safeConfig.maxCols} columns.`);
    }
  }

  return { files: results, warnings, combined: false };
}
