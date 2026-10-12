// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

const fs = require('fs');
const path = require('path');
const PACKAGES_DIR = path.resolve(__dirname, '..', 'packages');
const chineseSet = new Set();

function findTestFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') {
      findTestFiles(fullPath);
    } else if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.spec.ts') || entry.name.endsWith('.test.tsx') || entry.name.endsWith('.test.js')) {
      try { processFile(fullPath); } catch(e) {}
    }
  }
}

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const regex = /[\u4e00-\u9fff][\u4e00-\u9fff\w\s\-：，。（）""''、]*(?:[\u4e00-\u9fff)])/g;
  const matches = content.match(regex);
  if (matches) matches.forEach(m => chineseSet.add(m.trim()));
}

findTestFiles(PACKAGES_DIR);
const sorted = [...chineseSet].sort();
console.log(JSON.stringify(sorted, null, 2));