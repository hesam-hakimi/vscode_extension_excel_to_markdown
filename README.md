# Excel to Markdown (Safe)

Convert Excel workbooks (.xlsx) into Markdown tables directly from VS Code. Each worksheet becomes Markdown—either individual files or one combined file—while keeping security and robustness in mind.

## Features
- Convert **all sheets** or pick a **single sheet** from an Excel workbook.
- Output as **one file per sheet** or a **single combined file** with headings (configurable).
- Works from **Explorer context menu** or **Command Palette**; supports optional .xlsm (values only, never executes macros).
- Escapes Markdown safely, keeps dates/numbers/booleans, handles empty cells and uneven rows.
- Row/column limits to avoid huge outputs; warns when truncation happens.
- Safe file naming and directory checks prevent path traversal; progress notification with cancellation.

## Commands
- `Excel: Convert to Markdown (All Sheets)` (`excelToMarkdown.convertAll`)
- `Excel: Convert to Markdown (Select Sheet)` (`excelToMarkdown.convertSelect`)

## Settings
- `excelToMarkdown.outputMode`: `"perSheet"` | `"singleFile"` (default `perSheet`).
- `excelToMarkdown.outputDirectory`: `"sameAsSource"` | `"pickFolder"` (default `sameAsSource`).
- `excelToMarkdown.maxRows`: maximum rows per sheet (default `2000`).
- `excelToMarkdown.maxCols`: maximum columns per sheet (default `100`).
- `excelToMarkdown.includeSheetTitleHeading`: include sheet heading above each table (default `true`).
- `excelToMarkdown.allowXlsm`: allow picking `.xlsm` files (default `false`). Macros are never executed.

## Usage
1. Right-click a `.xlsx` in Explorer and choose a command **or** run the command from the palette and pick a file.
2. Choose output folder if prompted (based on settings).
3. For "Select Sheet", pick the worksheet from the quick pick list.
4. Watch progress; on success, created file paths appear in the "Excel to Markdown" output channel. Warnings are surfaced there too.

## Output
- File naming: `<excelBaseName>__<sheetName>.md` (sanitized, unique per folder).
- Combined mode: `<excelBaseName>__all.md` with optional headings per sheet.
- Markdown table structure:
```
| Header 1 | Header 2 |
| --- | --- |
| value | value |
```

## Security Notes
- Only reads cell data; **does not execute macros or embedded code**.
- Validates extensions (`.xlsx` by default, optional `.xlsm`).
- Sanitizes sheet names and output paths; refuses to write outside the chosen directory.
- Limits rows/columns to reduce ReDoS/memory risk from very large sheets.
- Known upstream advisories: `xlsx@0.18.5` reports prototype pollution/ReDoS (no patch available). Mitigated by treating input as untrusted data only, setting conversion limits, and never executing formulas or macros.

## Development
- Install: `npm install`
- Lint: `npm run lint`
- Tests: `npm test`
- Build: `npm run build`
- Package vsix: `npm run package` (requires `vsce` dev dependency)
- Verify icon is present in the VSIX before publishing:\n  - `npm run package:ls | grep -i icon`\n  - or `unzip -l excel-to-markdown-safe-*.vsix | grep -i icon`\n  If missing, ensure `.vscodeignore` contains `!icon.png`, rebuild, then reinstall the VSIX to refresh the cache.\n*** End Patch

## Sample Data
Generate a small sample workbook for testing: `npm run create:sample` (writes to `sample-data/sample.xlsx`).
