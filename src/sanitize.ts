import path from 'path';

const MAX_NAME_LENGTH = 50;

export function sanitizeSheetName(name: string): string {
  const base = name.trim() || 'Sheet';
  const cleaned = base
    .replace(/[\\/:*?"<>|]/g, '_')
    // eslint-disable-next-line no-control-regex -- intentionally strip ASCII control characters
    .replace(/[\u0000-\u001f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_');
  const trimmed = cleaned.slice(0, MAX_NAME_LENGTH).replace(/^_+|_+$/g, '');
  return trimmed || 'Sheet';
}

export function sanitizeFileComponent(name: string): string {
  const cleaned = sanitizeSheetName(name)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned || 'file';
}

export function ensureWithinDirectory(targetPath: string, baseDirectory: string): string {
  const base = path.resolve(baseDirectory);
  const target = path.resolve(targetPath);
  if (target === base || target.startsWith(base + path.sep)) {
    return target;
  }
  throw new Error('Refusing to write outside the selected output directory.');
}

export function isAllowedExtension(filePath: string, allowXlsm: boolean): boolean {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.xlsx') {
    return true;
  }
  if (allowXlsm && ext === '.xlsm') {
    return true;
  }
  return false;
}

export function makeUniqueName(baseName: string, existing: Set<string>): string {
  let candidate = baseName;
  let counter = 1;
  while (existing.has(candidate)) {
    candidate = `${baseName}__${counter}`;
    counter += 1;
  }
  existing.add(candidate);
  return candidate;
}

export function buildOutputFileName(workbookBase: string, sheetName: string, existing: Set<string>): string {
  const safeWorkbook = sanitizeFileComponent(workbookBase);
  const safeSheet = sanitizeSheetName(sheetName);
  const base = `${safeWorkbook}__${safeSheet || 'Sheet'}`;
  return `${makeUniqueName(base, existing)}.md`;
}
