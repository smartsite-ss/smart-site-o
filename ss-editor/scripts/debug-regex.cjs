// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

const fs = require('fs');
const content = fs.readFileSync('packages/core/src/__tests__/e2e/all-features.test.ts', 'utf-8');
const regex = /(it|describe|it\.only|it\.skip|describe\.only|describe\.skip)\s*\(\s*(['`])([^'`]*[\u4e00-\u9fff\u3400-\u4dbf][^'`]*)\2/g;
const matches = content.match(regex);
console.log('Matches found:', matches ? matches.length : 0);
if (matches) {
  matches.slice(0, 10).forEach(m => console.log(m));
}
// Also test the comment regex
const commentRegex = /\/\/\s*([\u4e00-\u9fff\u3400-\u4dbf].*)/g;
const commentMatches = content.match(commentRegex);
console.log('Comment matches found:', commentMatches ? commentMatches.length : 0);
if (commentMatches) {
  commentMatches.slice(0, 5).forEach(m => console.log(m));
}