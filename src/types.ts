export type OutputMode = 'perSheet' | 'singleFile';
export type OutputDirectoryMode = 'sameAsSource' | 'pickFolder';

export interface ExtensionConfig {
  outputMode: OutputMode;
  outputDirectory: OutputDirectoryMode;
  maxRows: number;
  maxCols: number;
  includeSheetTitleHeading: boolean;
  allowXlsm: boolean;
}

export interface SheetMarkdown {
  sheetName: string;
  markdown: string;
  truncatedRows: boolean;
  truncatedCols: boolean;
  rowCount: number;
  colCount: number;
}

export interface ConversionResultEntry {
  sheetName: string;
  outputPath: string;
  truncatedRows: boolean;
  truncatedCols: boolean;
  rowCount: number;
  colCount: number;
}

export interface ConversionResult {
  files: ConversionResultEntry[];
  warnings: string[];
  combined: boolean;
}
