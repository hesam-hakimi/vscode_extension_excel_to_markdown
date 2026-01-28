import { describe, expect, it } from 'vitest';
import { escapeMarkdown, normalizeRows, rowsToMarkdownTable } from './markdown';

describe('markdown helpers', () => {
  it('escapes markdown special characters and newlines', () => {
    const input = 'a*b_c[1]\n<test>';
    const escaped = escapeMarkdown(input);
    expect(escaped).toBe('a\\*b\\_c\\[1\\]<br>&lt;test&gt;');
  });

  it('normalizes uneven rows', () => {
    const rows = [
      ['h1', 'h2'],
      ['r1c1'],
      ['r2c1', 'r2c2', 'r2c3']
    ];
    const normalized = normalizeRows(rows, 3);
    expect(normalized[1][2]).toBe('');
    expect(normalized[2][2]).toBe('r2c3');
  });

  it('produces a markdown table with heading', () => {
    const rows = [
      ['Name', 'Age'],
      ['Ada', 30],
      ['Bob', 28]
    ];
    const { markdown } = rowsToMarkdownTable(rows, 'Team', true);
    expect(markdown.split('\n')[0]).toBe('## Team');
    expect(markdown).toContain('| Name | Age |');
    expect(markdown).toContain('| Ada | 30 |');
  });
});
