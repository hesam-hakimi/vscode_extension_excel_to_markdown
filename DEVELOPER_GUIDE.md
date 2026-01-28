# Developer Guide (TD-AMCB)

Step-by-step instructions to work on the extension from a fresh clone through packaging.

## Prerequisites
- Node.js 18+ (LTS recommended) and npm.
- VS Code for local testing.
- Optional: `@vscode/vsce` globally (`npm install -g @vscode/vsce`) if you prefer global packaging; the project also ships `vsce` as a dev dependency.

## 1) Clone
```
git clone https://github.com/TD-AMCB/excel-to-markdown-safe.git
cd excel-to-markdown-safe
```

## 2) Install dependencies
```
npm install
```
> If you hit cache permission issues on macOS, rerun with a local cache: `npm install --cache ./tmp-npm-cache`.

## 3) Build
Transpiles TypeScript to `dist/`.
```
npm run build
```

## 4) Quality checks
```
npm run lint   # ESLint (strict TypeScript rules)
npm test       # Vitest unit tests
```

## 5) Sample workbook (optional)
Generate `sample-data/sample.xlsx` for quick manual checks:
```
npm run create:sample
```

## 6) Run the extension in VS Code
- Open the folder in VS Code.
- Press `F5` to launch the Extension Development Host.
- Use the commands:
  - `Excel: Convert to Markdown (All Sheets)`
  - `Excel: Convert to Markdown (Select Sheet)`

## 7) Package for distribution
Creates `excel-to-markdown-safe-0.0.1.vsix` in the project root.
```
npm run package
```
Install the VSIX locally for validation:
```
code --install-extension excel-to-markdown-safe-0.0.1.vsix
```

## 8) Clean
```
npm run clean   # removes dist/
```

## Notes
- Current VSIX is ~59 MB; consider bundling (esbuild/webpack) and tightening `.vscodeignore` before publishing to the Marketplace.
- The extension reads workbook data only (no macro execution). Keep row/column limits sensible when testing large files.
