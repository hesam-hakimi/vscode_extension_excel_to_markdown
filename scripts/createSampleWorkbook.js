#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

function createWorkbook() {
  const wb = XLSX.utils.book_new();
  const sheet1 = XLSX.utils.aoa_to_sheet([
    ['Name', 'Role', 'Active'],
    ['Ada', 'Engineer', true],
    ['Bob', 'Analyst', false]
  ]);
  const sheet2 = XLSX.utils.aoa_to_sheet([
    ['Date', 'Value'],
    [new Date('2024-01-01'), 10],
    [new Date('2024-02-01'), 15]
  ]);
  XLSX.utils.book_append_sheet(wb, sheet1, 'Team');
  XLSX.utils.book_append_sheet(wb, sheet2, 'Metrics');
  return wb;
}

function main() {
  const outDir = path.join(process.cwd(), 'sample-data');
  fs.mkdirSync(outDir, { recursive: true });
  const filePath = path.join(outDir, 'sample.xlsx');
  XLSX.writeFile(createWorkbook(), filePath, { bookType: 'xlsx' });
  console.log(`Sample workbook written to ${filePath}`);
}

main();
