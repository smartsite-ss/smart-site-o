// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

const { execSync } = require('child_process');
const { resolve } = require('path');

// Vite 构建大型包时默认 4GB 堆内存不足（system 包 OOM），提升至 8GB
if (!process.env.NODE_OPTIONS || !process.env.NODE_OPTIONS.includes('max-old-space-size')) {
  process.env.NODE_OPTIONS = [process.env.NODE_OPTIONS, '--max-old-space-size=8192']
    .filter(Boolean)
    .join(' ');
}

const EDITOR_DIR = resolve(__dirname, '..', '..', '..');
const PLUGINS_DIR = resolve(EDITOR_DIR, 'packages', 'plugins');

function run(cmd, cwd, label) {
  console.log('\n' + '='.repeat(60));
  console.log('  ' + (label || cmd));
  console.log('='.repeat(60));
  var opts = { cwd: cwd || EDITOR_DIR, stdio: 'inherit', shell: true };
  execSync(cmd, opts);
}

function runNode(scriptPath, args, label) {
  var fullArgs = (args || []).join(' ');
  run('node ' + scriptPath + ' ' + fullArgs, PLUGINS_DIR, label);
}

function validateCategories() {
  runNode('scripts/validate-categories.cjs', [], 'Validate categories.json consistency');
}

function generateManifests() {
  // Pass --dev flag in dev mode so generate-directory-configs.cjs
  // loads .env.development (VITE_DEPLOY_BASE=empty) instead of
  // .env.production (VITE_DEPLOY_BASE=/) → generates @plugins/.../index.ts URLs
  var isDev = process.argv[2] === 'dev';
  var args = isDev ? ['--all', '--dev'] : ['--all'];
  runNode('scripts/generate-directory-configs.cjs', args, 'Generate directory plugin manifests');
}

function generateImportMap() {
  runNode('scripts/generate-import-map.cjs', [], 'Generate import map');
}

function buildPluginSDK() {
  run('pnpm --filter @scada-editor/plugin-sdk build', EDITOR_DIR, 'Build @scada-editor/plugin-sdk');
}

function buildCore() {
  run('pnpm --filter @scada-editor/core build', EDITOR_DIR, 'Build @scada-editor/core');
}

function buildEditor() {
  run('pnpm --filter @scada-editor/editor build', EDITOR_DIR, 'Build @scada-editor/editor');
}

function buildSystem() {
  run('pnpm --filter @scada-editor/system build', EDITOR_DIR, 'Build @scada-editor/system');
}

function buildWeb() {
  run('pnpm --filter scada-editor-web build', EDITOR_DIR, 'Build scada-editor-web');
}

function buildDirectoryPlugins() {
  runNode('scripts/build-directory-plugins.cjs', ['--all'], 'Build directory plugins');
}

function devServer() {
  run('pnpm --filter scada-editor-web dev --host', EDITOR_DIR, 'Start Vite dev server');
}

var command = process.argv[2];

switch (command) {
  case 'dev':
    generateManifests();
    generateImportMap();
    validateCategories();
    buildPluginSDK();
    buildCore();
    buildEditor();
    devServer();
    break;

  case 'build':
    validateCategories();
    generateManifests();
    generateImportMap();
    buildPluginSDK();
    buildCore();
    buildEditor();
    buildSystem();
    buildWeb();
    buildDirectoryPlugins();
    console.log('\n' + '='.repeat(60));
    console.log('  BUILD COMPLETED SUCCESSFULLY');
    console.log('='.repeat(60));
    break;

  case 'build:plugins':
    generateManifests();
    validateCategories();
    buildDirectoryPlugins();
    console.log('\n' + '='.repeat(60));
    console.log('  DIRECTORY PLUGINS BUILT SUCCESSFULLY');
    console.log('='.repeat(60));
    break;

  case 'validate':
    validateCategories();
    console.log('\n  Categories validation passed.');
    break;

  default:
    console.log('Usage: node plugins-cli.cjs <command>');
    console.log('  dev            - Generate configs + build core + start dev server');
    console.log('  build          - Full production build');
    console.log('  build:plugins  - Build directory plugins only');
    console.log('  validate       - Validate categories.json consistency');
    break;
}