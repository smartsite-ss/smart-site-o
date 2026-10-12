// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packagesDir = path.resolve(__dirname, '..', 'packages');
const coreLocalesDir = path.resolve(packagesDir, 'core', 'src', 'locales');
const zhCNPath = path.join(coreLocalesDir, 'zh-CN.json');
const enUSPath = path.join(coreLocalesDir, 'en-US.json');

const zhCN = JSON.parse(fs.readFileSync(zhCNPath, 'utf-8'));
const enUS = JSON.parse(fs.readFileSync(enUSPath, 'utf-8'));

const dryRun = process.argv.includes('--dry-run');

function deepSet(obj, path, value) {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) current[keys[i]] = {};
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
}

function collectChineseInTemplate(template) {
  const results = [];
  const regex = /(?:>([^<]*[\u4e00-\u9fa5][^<]*)<|placeholder="([^"]*[\u4e00-\u9fa5][^"]*)"|label="([^"]*[\u4e00-\u9fa5][^"]*)"|title="([^"]*[\u4e00-\u9fa5][^"]*)"|:label="'([^']*[\u4e00-\u9fa5][^']*)'"|:placeholder="'([^']*[\u4e00-\u9fa5][^']*)'")/g;
  let match;
  while ((match = regex.exec(template)) !== null) {
    const text = (match[1] || match[2] || match[3] || match[4] || match[5] || match[6]).trim();
    if (text && text.length > 1 && !text.startsWith('{{') && !text.startsWith('$t(')) {
      results.push({ text, type: match[1] ? 'textContent' : match[2] ? 'placeholder' : match[3] ? 'label' : 'title' });
    }
  }
  return results;
}

function collectChineseInScript(script) {
  const results = [];
  const regex = /'([^']*[\u4e00-\u9fa5][^']*)'/g;
  let match;
  while ((match = regex.exec(script)) !== null) {
    const text = match[1];
    if (text && !text.includes('i18n.global.t') && !text.includes('$t(') && !text.includes('import ') && !text.includes('from ') && !text.startsWith('./') && !text.startsWith('@/')) {
      results.push(text);
    }
  }
  return results;
}

function generateI18nKey(chineseText) {
  return chineseText.replace(/\s+/g, '_').slice(0, 30).toLowerCase();
}

// Find all Vue and TS files with Chinese in editor package
function findFilesWithChinese(basePath, extensions = ['.vue', '.ts']) {
  const results = [];
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '__tests__' || entry.name === 'locales' || entry.name.startsWith('.')) continue;
        walk(fullPath);
      } else if (extensions.some(ext => entry.name.endsWith(ext))) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        if (/[\u4e00-\u9fa5]/.test(content) && !content.includes("import { i18n } from '@scada-editor/core'") && !content.includes('$t(')) {
          results.push(fullPath);
        }
      }
    }
  }
  walk(basePath);
  return results;
}

// Process editor Vue files - only focus on user-visible template strings
function processVueFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;
  let newContent = content;

  // Check if file already has i18n
  if (content.includes('i18n.global.t') || content.includes('$t(')) {
    return { modified: false, newContent: content };
  }

  const templateMatch = content.match(/<template>([\s\S]*?)<\/template>/);
  const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/);

  // Collect Chinese strings from template
  const templateChinese = templateMatch ? collectChineseInTemplate(templateMatch[1]) : [];
  const scriptChinese = scriptMatch ? collectChineseInScript(scriptMatch[1]) : [];

  if (templateChinese.length === 0 && scriptChinese.length === 0) {
    return { modified: false, newContent: content };
  }

  // Replace Chinese strings in template with $t() calls
  let templateContent = templateMatch ? templateMatch[1] : '';
  for (const item of templateChinese) {
    const key = generateI18nKey(item.text);
    // Add translation if not exists
    if (!zhCN[key]) {
      deepSet(zhCN, key, item.text);
    }
    if (!enUS[key]) {
      deepSet(enUS, key, item.text);
    }
    
    if (item.type === 'textContent') {
      templateContent = templateContent.replace(`>${item.text}<`, `>{{ $t('${key}') }}<`);
      modified = true;
    } else if (item.type === 'placeholder') {
      templateContent = templateContent.replace(`placeholder="${item.text}"`, `:placeholder="$t('${key}')"`);
      modified = true;
    } else if (item.type === 'label') {
      templateContent = templateContent.replace(`label="${item.text}"`, `:label="$t('${key}')"`);
      modified = true;
    }
  }

  if (modified) {
    newContent = content.replace(/<template>[\s\S]*?<\/template>/, `<template>${templateContent}</template>`);
  }

  return { modified, newContent, templateChinese, scriptChinese };
}

// Process editor TS files
function processTsFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  if (content.includes('i18n.global.t') || content.includes("import { i18n } from '@scada-editor/core'")) {
    return { modified: false };
  }

  const chineseStrings = collectChineseInScript(content);
  if (chineseStrings.length === 0) {
    return { modified: false };
  }

  // Check if all Chinese strings are in import/export paths
  const userVisible = chineseStrings.filter(s => !s.startsWith('./') && !s.startsWith('../') && !s.startsWith('@/') && s.length > 1);
  if (userVisible.length === 0) {
    return { modified: false };
  }

  return { modified: true, chineseStrings: userVisible, filePath };
}

// Main processing
const editorDir = path.resolve(packagesDir, 'editor', 'src');
const systemDir = path.resolve(packagesDir, 'system', 'src');

console.log('=== Scanning editor package ===');
const editorFiles = findFilesWithChinese(editorDir);
console.log(`Found ${editorFiles.length} files with Chinese in editor`);

console.log('\n=== Scanning system package ===');
const systemFiles = findFilesWithChinese(systemDir);
console.log(`Found ${systemFiles.length} files with Chinese in system`);

// Process Vue files
console.log('\n=== Processing Vue files ===');
const vueFiles = [...editorFiles, ...systemFiles].filter(f => f.endsWith('.vue'));
let processedVue = 0;
for (const filePath of vueFiles) {
  const result = processVueFile(filePath);
  if (result.modified) {
    processedVue++;
    console.log(`  Vue: ${path.relative(packagesDir, filePath)}`);
    console.log(`    Template Chinese: ${result.templateChinese.map(c => c.text).join(', ')}`);
  }
}

// Process TS files (report only for now)
console.log('\n=== TS files needing i18n (report only) ===');
const tsFiles = [...editorFiles, ...systemFiles].filter(f => f.endsWith('.ts') && !f.includes('__tests__'));
let tsNeedingI18n = 0;
for (const filePath of tsFiles) {
  const result = processTsFile(filePath);
  if (result.modified) {
    tsNeedingI18n++;
    console.log(`  TS: ${path.relative(packagesDir, filePath)}`);
    console.log(`    Chinese strings: ${result.chineseStrings.join(', ')}`);
  }
}

console.log(`\n=== Summary ===`);
console.log(`Editor Vue files with Chinese: ${vueFiles.filter(f => f.includes('editor')).length}`);
console.log(`System Vue files with Chinese: ${vueFiles.filter(f => f.includes('system')).length}`);
console.log(`TS files needing i18n: ${tsNeedingI18n}`);

if (!dryRun) {
  fs.writeFileSync(zhCNPath, JSON.stringify(zhCN, null, 2) + '\n', 'utf-8');
  fs.writeFileSync(enUSPath, JSON.stringify(enUS, null, 2) + '\n', 'utf-8');
  console.log('\nUpdated core locale files');
}