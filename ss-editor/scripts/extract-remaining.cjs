// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

const fs = require('fs');
const path = require('path');
const PACKAGES_DIR = path.resolve(__dirname, '..', 'packages');

function findTestFiles(dir) {
  const results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'node_modules') {
        results.push(...findTestFiles(fullPath));
      } else if (
        entry.name.endsWith('.test.ts') || entry.name.endsWith('.spec.ts') ||
        entry.name.endsWith('.test.tsx') || entry.name.endsWith('.test.js')
      ) {
        results.push(fullPath);
      }
    }
  } catch(e) {}
  return results;
}

function extractChinese(text) {
  const results = [];
  // Match Chinese text in single quotes
  const quoteRegex = /'([^']*[\u4e00-\u9fff][^']*?)'/g;
  let m;
  while ((m = quoteRegex.exec(text)) !== null) results.push(m[1].trim());
  // Match Chinese text in backtick template literals
  const backtickRegex = /`([^`]*[\u4e00-\u9fff][^`]*?)`/g;
  while ((m = backtickRegex.exec(text)) !== null) results.push(m[1].trim());
  // Match Chinese text in comments
  const commentRegex = /\/\/\s*(.+[\u4e00-\u9fff].*)/g;
  while ((m = commentRegex.exec(text)) !== null) results.push(m[1].trim());
  return results;
}

const allChinese = new Set();
const files = findTestFiles(PACKAGES_DIR);
for (const f of files) {
  try {
    const content = fs.readFileSync(f, 'utf8');
    const matches = extractChinese(content);
    matches.forEach(s => {
      if (s.length >= 3) allChinese.add(s);
    });
  } catch(e) {}
}

const filtered = [...allChinese].filter(s => 
  !s.includes("should be") &&
  !s.match(/^[a-zA-Z]/) &&
  s.length > 2
).sort();

filtered.forEach(s => console.log("  '" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "': 'FIXME',"));