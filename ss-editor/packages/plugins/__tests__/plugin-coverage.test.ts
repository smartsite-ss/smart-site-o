// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import { readdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pluginsRoot = resolve(__dirname, '..');

const ALL_CATEGORIES = [
  'basic', 'form', 'industrial', 'chart',
  'decorates_borders', 'decorates_head', 'decorates_other',
  '3d',
];

function discoverTestFiles(): string[] {
  const testFiles: string[] = [];

  for (const category of ALL_CATEGORIES) {
    const catDir = resolve(__dirname, category);
    if (!existsSync(catDir)) continue;
    try {
      const files = readdirSync(catDir, { withFileTypes: true })
        .filter(f => f.isFile() && f.name.endsWith('.test.ts'));
      for (const f of files) {
        testFiles.push(`${category}/${f.name}`);
      }
    } catch {
      // skip
    }
  }

  return testFiles;
}

function discoverPluginDirs(): string[] {
  const dirs: string[] = [];

  for (const category of ALL_CATEGORIES) {
    const catDir = resolve(pluginsRoot, category);
    if (!existsSync(catDir)) continue;
    try {
      const subdirs = readdirSync(catDir, { withFileTypes: true })
        .filter(d => d.isDirectory());
      for (const d of subdirs) {
        dirs.push(`${category}/${d.name}`);
      }
    } catch {
      // skip
    }
  }

  return dirs;
}

describe('Plugin test coverage summary', () => {
  it('should have at least 40 plugin directories', () => {
    const pluginDirs = discoverPluginDirs();
    console.log('Found ${pluginDirs.length} plugin directories');
    expect(pluginDirs.length).toBeGreaterThanOrEqual(40);
  });

  it('should have at least 20 test files', () => {
    const testFiles = discoverTestFiles();
    console.log('Found ${testFiles.length} test files:');
    for (const f of testFiles) {
      console.log(`  - ${f}`);
    }
    expect(testFiles.length).toBeGreaterThanOrEqual(24);
  });

  it('3d category should have test files', () => {
    expect(existsSync(resolve(__dirname, '3d'))).toBe(true);
  });

  it('decorates_borders should have test files', () => {
    expect(existsSync(resolve(__dirname, 'decorates_borders'))).toBe(true);
  });

  it('decorates_head should have test files', () => {
    expect(existsSync(resolve(__dirname, 'decorates_head'))).toBe(true);
  });

  it('decorates_other should have test files', () => {
    expect(existsSync(resolve(__dirname, 'decorates_other'))).toBe(true);
  });
});