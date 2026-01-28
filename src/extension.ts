import * as vscode from 'vscode';
import path from 'path';
import { convertAllSheets, convertSelectedSheets, getWorksheetNames } from './converter';
import { isAllowedExtension } from './sanitize';
import type { ConversionResult, ExtensionConfig } from './types';

const outputChannel = vscode.window.createOutputChannel('Excel to Markdown');

function getConfig(): ExtensionConfig {
  const cfg = vscode.workspace.getConfiguration('excelToMarkdown');
  return {
    outputMode: cfg.get<'perSheet' | 'singleFile'>('outputMode', 'perSheet'),
    outputDirectory: cfg.get<'sameAsSource' | 'pickFolder'>('outputDirectory', 'sameAsSource'),
    maxRows: cfg.get<number>('maxRows', 2000),
    maxCols: cfg.get<number>('maxCols', 100),
    includeSheetTitleHeading: cfg.get<boolean>('includeSheetTitleHeading', true),
    allowXlsm: cfg.get<boolean>('allowXlsm', false)
  };
}

async function resolveExcelFileUri(uri: vscode.Uri | undefined, config: ExtensionConfig): Promise<vscode.Uri | undefined> {
  if (uri && uri.scheme === 'file') {
    if (!isAllowedExtension(uri.fsPath, config.allowXlsm)) {
      void vscode.window.showErrorMessage('Please select a .xlsx file. Enable "Allow xlsm" in settings to open .xlsm files.');
      return undefined;
    }
    return uri;
  }

  const filters = config.allowXlsm ? { 'Excel Files': ['xlsx', 'xlsm'] } : { 'Excel Files': ['xlsx'] };
  const picks = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    openLabel: 'Select Excel workbook',
    filters
  });
  if (!picks || picks.length === 0) {
    return undefined;
  }
  const selected = picks[0];
  if (!isAllowedExtension(selected.fsPath, config.allowXlsm)) {
    void vscode.window.showErrorMessage('Selected file is not a supported Excel workbook (.xlsx or allowed .xlsm).');
    return undefined;
  }
  return selected;
}

async function resolveOutputDirectory(fileUri: vscode.Uri, config: ExtensionConfig): Promise<string | undefined> {
  if (config.outputDirectory === 'sameAsSource') {
    return path.dirname(fileUri.fsPath);
  }
  const defaultUri = vscode.Uri.file(path.dirname(fileUri.fsPath));
  const selection = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    defaultUri,
    openLabel: 'Select output folder'
  });
  if (!selection || selection.length === 0) {
    return undefined;
  }
  return selection[0].fsPath;
}

function reportWarnings(warnings: string[]): void {
  if (warnings.length === 0) {
    return;
  }
  outputChannel.appendLine('Warnings:');
  warnings.forEach((warning) => outputChannel.appendLine(`- ${warning}`));
  outputChannel.show(true);
  void vscode.window.showWarningMessage('Conversion completed with warnings. See "Excel to Markdown" output for details.');
}

function reportSuccess(result: ConversionResult): void {
  const createdPaths = result.files.map((file) => path.basename(file.outputPath));
  const message = result.combined
    ? `Created Markdown: ${createdPaths.join(', ')}`
    : `Created ${result.files.length} Markdown file(s).`;
  outputChannel.appendLine(message);
  result.files.forEach((file) => {
    outputChannel.appendLine(`- ${file.sheetName}: ${file.outputPath}`);
  });
  void vscode.window.showInformationMessage(message);
  if (result.warnings.length > 0) {
    reportWarnings(result.warnings);
  }
}

async function handleConvertAll(uri: vscode.Uri | undefined): Promise<void> {
  const config = getConfig();
  const fileUri = await resolveExcelFileUri(uri, config);
  if (!fileUri) return;
  const outputDir = await resolveOutputDirectory(fileUri, config);
  if (!outputDir) return;

  let cancelled = false;
  const result = await vscode.window.withProgress<ConversionResult | undefined>(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Converting Excel to Markdown (all sheets)',
      cancellable: true
    },
    async (progress, token) => {
      token.onCancellationRequested(() => {
        cancelled = true;
      });
      try {
        return await convertAllSheets(fileUri.fsPath, outputDir, config, progress, token);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error during conversion.';
        void vscode.window.showErrorMessage(message);
        return undefined;
      }
    }
  );

  if (!result) {
    return;
  }
  if (cancelled) {
    outputChannel.appendLine('Conversion cancelled by user.');
    void vscode.window.showInformationMessage('Excel to Markdown conversion cancelled. Partial outputs may exist.');
    return;
  }
  reportSuccess(result);
}

async function handleConvertSelect(uri: vscode.Uri | undefined): Promise<void> {
  const config = getConfig();
  const fileUri = await resolveExcelFileUri(uri, config);
  if (!fileUri) return;
  const outputDir = await resolveOutputDirectory(fileUri, config);
  if (!outputDir) return;

  let sheetNames: string[];
  try {
    sheetNames = await getWorksheetNames(fileUri.fsPath, config);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to read workbook.';
    void vscode.window.showErrorMessage(message);
    return;
  }

  if (sheetNames.length === 0) {
    void vscode.window.showErrorMessage('No worksheets found in the workbook.');
    return;
  }

  const picked = await vscode.window.showQuickPick(sheetNames, {
    placeHolder: 'Select a worksheet to convert',
    canPickMany: false
  });

  if (!picked) return;

  let cancelled = false;
  const result = await vscode.window.withProgress<ConversionResult | undefined>(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Converting sheet "${picked}" to Markdown`,
      cancellable: true
    },
    async (progress, token) => {
      token.onCancellationRequested(() => {
        cancelled = true;
      });
      try {
        return await convertSelectedSheets(fileUri.fsPath, outputDir, [picked], config, progress, token);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error during conversion.';
        void vscode.window.showErrorMessage(message);
        return undefined;
      }
    }
  );

  if (!result) {
    return;
  }
  if (cancelled) {
    outputChannel.appendLine('Conversion cancelled by user.');
    void vscode.window.showInformationMessage('Excel to Markdown conversion cancelled. Partial outputs may exist.');
    return;
  }
  reportSuccess(result);
}

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    outputChannel,
    vscode.commands.registerCommand('excelToMarkdown.convertAll', handleConvertAll),
    vscode.commands.registerCommand('excelToMarkdown.convertSelect', handleConvertSelect)
  );
}

export function deactivate(): void {
  // no-op
}
