import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { buildOutputFileName, ensureWithinDirectory, sanitizeFileComponent, sanitizeSheetName } from './sanitize';

const tmpBase = path.join(os.tmpdir(), 'excel-md-tests');

describe('sanitize helpers', () => {
  it('sanitizes sheet names and trims length', () => {
    const raw = '  :*Very Long Sheet Name With Illegal Chars /\\<> and spaces   ';
    const sanitized = sanitizeSheetName(raw);
    expect(sanitized).toMatch(/^Very_Long_Sheet_Name/);
    expect(sanitized.length).toBeLessThanOrEqual(50);
  });

  it('falls back to default when empty', () => {
    expect(sanitizeSheetName('   ')).toBe('Sheet');
  });

  it('sanitizes file component to safe characters', () => {
    expect(sanitizeFileComponent('My File🚀/..')).toBe('My_File');
  });

  it('prevents writing outside base directory', async () => {
    await fs.mkdir(tmpBase, { recursive: true });
    const baseDir = await fs.mkdtemp(path.join(tmpBase, 'base-'));
    const target = path.join(baseDir, '..', 'evil.md');
    expect(() => ensureWithinDirectory(target, baseDir)).toThrow();
  });

  it('builds unique output names when sanitized sheets collide', () => {
    const existing = new Set<string>();
    const name1 = buildOutputFileName('book', 'Data', existing);
    const name2 = buildOutputFileName('book', 'Data', existing);
    expect(name1).toBe('book__Data.md');
    expect(name2).toBe('book__Data__1.md');
  });
});
