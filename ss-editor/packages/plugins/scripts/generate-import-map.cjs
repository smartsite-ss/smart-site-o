// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

const { writeFileSync, existsSync, mkdirSync } = require('fs');
const { join, resolve } = require('path');
const { generateDevImportMap } = require('./import-map-config.cjs');

const PLUGINS_ROOT = resolve(__dirname, '..');
const OUTPUT_DIR = join(PLUGINS_ROOT, '..', '..', 'apps', 'web', 'public');

function main() {
  var editorDir = resolve(PLUGINS_ROOT, '..', '..');
  var importMap = generateDevImportMap(editorDir);

  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  writeFileSync(join(OUTPUT_DIR, 'import-map.json'), JSON.stringify(importMap, null, 2));

  console.log('Import map generated (dev mode, @fs URLs):');
  console.log(JSON.stringify(importMap, null, 2));
}

main();