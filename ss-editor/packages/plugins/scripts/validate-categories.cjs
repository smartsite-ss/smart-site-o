// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

const { readdirSync, existsSync } = require('fs');
const { resolve, join } = require('path');

const PLUGINS_ROOT = resolve(__dirname, '..');
const CATEGORIES_PATH = join(PLUGINS_ROOT, 'categories.json');
const IGNORED_DIRS = ['node_modules', 'scripts', '__tests__', 'bundled', 'directory'];

function loadCategories() {
  if (!existsSync(CATEGORIES_PATH)) {
    throw new Error('categories.json not found: ' + CATEGORIES_PATH);
  }
  const content = require(CATEGORIES_PATH);
  if (!Array.isArray(content)) {
    throw new Error('categories.json must be an array');
  }
  return content;
}

function scanPluginDirs() {
  if (!existsSync(PLUGINS_ROOT)) return [];
  return readdirSync(PLUGINS_ROOT, { withFileTypes: true })
    .filter(function (d) { return d.isDirectory() && IGNORED_DIRS.indexOf(d.name) === -1; })
    .map(function (d) { return d.name; })
    .sort();
}

function validate() {
  console.log('Validating categories.json vs directory structure...\n');

  const categories = loadCategories();
  const pluginDirs = scanPluginDirs();
  const declaredIds = categories.map(function (c) { return c.id; });
  const declaredBundled = categories.filter(function (c) { return c.deployMode === 'bundled'; }).map(function (c) { return c.id; });
  const declaredDir = categories.filter(function (c) { return c.deployMode === 'directory'; }).map(function (c) { return c.id; });

  console.log('  categories.json:');
  console.log('    bundled:   [' + declaredBundled.join(', ') + ']');
  console.log('    directory: [' + declaredDir.join(', ') + ']');
  console.log();
  console.log('  Plugin dirs (flat): [' + pluginDirs.join(', ') + ']');
  console.log();

  const errors = [];
  const warnings = [];

  for (var i = 0; i < categories.length; i++) {
    var cat = categories[i];
    if (pluginDirs.indexOf(cat.id) === -1) {
      errors.push('"' + cat.id + '" declared in categories.json but directory not found');
    }
  }

  for (var j = 0; j < pluginDirs.length; j++) {
    var dir = pluginDirs[j];
    if (declaredIds.indexOf(dir) === -1) {
      warnings.push('"' + dir + '" directory exists but not declared in categories.json');
    }
  }

  if (warnings.length > 0) {
    console.log('Warnings:');
    warnings.forEach(function (w) { console.log('   ' + w); });
    console.log();
  }

  if (errors.length > 0) {
    console.log('Errors:');
    errors.forEach(function (e) { console.log('   ' + e); });
    console.log();
    console.log('Fix: edit categories.json or create/move directories to match.');
    process.exit(1);
  }

  console.log('All ' + declaredIds.length + ' categories match physical directories');
  console.log('   bundled: ' + declaredBundled.length + ' | directory: ' + declaredDir.length);
  console.log('\nBundle imports are now resolved at build time via vite-plugin-bundled-plugins.cjs.');
  console.log('No manual code generation required.');
}

validate();