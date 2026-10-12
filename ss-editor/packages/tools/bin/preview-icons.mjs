#!/usr/bin/env node
// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * Icon Preview Gallery Generator
 *
 * Scans the plugins directory for generated PNG icons,
 * produces a self-contained HTML gallery page for browser preview & download.
 *
 * Usage:
 *   node preview-icons.mjs --category mines
 *   node preview-icons.mjs --all
 */

import { readdirSync, existsSync, writeFileSync, mkdirSync, readFileSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PLUGINS_DIR = resolve(ROOT, '../plugins');
const PREVIEW_DIR = resolve(ROOT, 'preview');

const SKIP_DIRS = new Set(['locales', 'node_modules', '__tests__', 'dist', '.git', '.vscode']);

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = { category: null, all: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--category' || args[i] === '-c') opts.category = args[++i];
    else if (args[i] === '--all' || args[i] === '-a') opts.all = true;
  }
  return opts;
}

function scanIcons(pluginsDir, categoryFilter = null) {
  /** @type {Array<{type:string, category:string, pngPath:string, svgPath:string}>} */
  const icons = [];

  if (!existsSync(pluginsDir)) return icons;

  const catDirs = readdirSync(pluginsDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('.') && !SKIP_DIRS.has(d.name));

  for (const cat of catDirs) {
    if (categoryFilter && cat.name !== categoryFilter) continue;

    const catPath = join(pluginsDir, cat.name);
    const compDirs = readdirSync(catPath, { withFileTypes: true })
      .filter(d => d.isDirectory() && !d.name.startsWith('.') && !SKIP_DIRS.has(d.name));

    for (const comp of compDirs) {
      const compDir = join(catPath, comp.name);
      const files = readdirSync(compDir);
      const pngFile = files.find(f => f === `${comp.name}.png`);
      const svgFile = files.find(f => f === `${comp.name}.svg`);

      if (pngFile || svgFile) {
        icons.push({
          type: comp.name,
          category: cat.name,
          pngPath: pngFile ? join(compDir, pngFile) : null,
          svgPath: svgFile ? join(compDir, svgFile) : null,
        });
      }
    }
  }

  return icons;
}

function generateHtml(icons, title) {
  const cards = icons.map(icon => {
    const imgSrc = icon.pngPath
      ? `data:image/png;base64,${base64FromFile(icon.pngPath)}`
      : `data:image/svg+xml;base64,${base64FromFile(icon.svgPath)}`;
    const downloadHref = icon.pngPath
      ? `data:image/png;base64,${base64FromFile(icon.pngPath)}`
      : `data:image/svg+xml;base64,${base64FromFile(icon.svgPath)}`;
    const ext = icon.pngPath ? 'png' : 'svg';
    return `
    <div class="card">
      <div class="img-wrap">
        <a href="${downloadHref}" download="${icon.type}.${ext}" title="点击下载">
          <img src="${imgSrc}" alt="${icon.type}" loading="lazy" />
        </a>
      </div>
      <div class="label">${icon.type}</div>
      <div class="cat">${icon.category}</div>
    </div>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} — 图标预览</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Segoe UI","Microsoft YaHei",sans-serif;background:#1a1a2e;color:#eee;min-height:100vh}
.header{position:sticky;top:0;z-index:10;background:#16213e;padding:16px 32px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;box-shadow:0 2px 12px rgba(0,0,0,.4)}
.header h1{font-size:20px;font-weight:600}
.header .stats{font-size:13px;color:#8892b0}
.header .btn{display:inline-flex;align-items:center;gap:6px;padding:8px 18px;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer;text-decoration:none;border:1px solid transparent;transition:all .2s}
.btn-primary{background:#3b82f6;color:#fff}
.btn-primary:hover{background:#2563eb}
.btn-outline{background:transparent;border-color:#475569;color:#cbd5e1}
.btn-outline:hover{background:#1e293b;border-color:#64748b}
.grid{padding:24px 32px;display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:20px}
.card{background:#16213e;border-radius:10px;overflow:hidden;transition:transform .2s,box-shadow .2s;display:flex;flex-direction:column;align-items:center}
.card:hover{transform:translateY(-4px);box-shadow:0 8px 24px rgba(0,0,0,.35)}
.img-wrap{width:100%;aspect-ratio:1;display:flex;align-items:center;justify-content:center;background:#0f3460;padding:16px}
.img-wrap a{display:flex;align-items:center;justify-content:center;width:100%;height:100%}
.img-wrap img{max-width:100%;max-height:100%;object-fit:contain}
.label{font-size:13px;font-weight:600;padding:10px 12px 4px;text-align:center;word-break:break-all}
.cat{font-size:11px;color:#64748b;padding:0 12px 10px}
.search-bar{display:flex;align-items:center;gap:8px}
.search-bar input{padding:6px 12px;border-radius:6px;border:1px solid #475569;background:#1e293b;color:#e2e8f0;font-size:13px;width:200px;outline:none}
.search-bar input:focus{border-color:#3b82f6}
.footer{padding:16px 32px;text-align:center;font-size:12px;color:#475569;border-top:1px solid #1e293b}
</style>
</head>
<body>
<div class="header">
  <div>
    <h1>${title} - Icon Preview</h1>
    <div class="stats">${icons.length} components · Click icon to download</div>
  </div>
  <div class="search-bar">
    <input type="text" id="search" placeholder="Search components..." oninput="filterCards(this.value)" />
    <button class="btn btn-outline" onclick="downloadAll()">Download All</button>
  </div>
</div>
<div class="grid" id="grid">${cards}</div>
<div class="footer">Generated by SCADA Editor Icon Generator · Right-click to Save As</div>
<script>
function filterCards(q) {
  const cards = document.querySelectorAll('.card');
  const lower = q.toLowerCase();
  cards.forEach(c => {
    const name = c.querySelector('.label').textContent.toLowerCase();
    c.style.display = name.includes(lower) ? '' : 'none';
  });
}
function downloadAll() {
  const links = document.querySelectorAll('.img-wrap a');
  let i = 0;
  function next() {
    if (i >= links.length) return;
    const a = links[i];
    const orig = a.getAttribute('download');
    a.click();
    i++;
    setTimeout(next, 200);
  }
  next();
}
document.addEventListener('keydown', e => {
  if (e.key === '/' && document.activeElement !== document.getElementById('search')) {
    e.preventDefault();
    document.getElementById('search').focus();
  }
  if (e.key === 'Escape') document.getElementById('search').blur();
});
</script>
</body>
</html>`;
}

function base64FromFile(filePath) {
  const buf = readFileSync(filePath);
  return buf.toString('base64');
}

function main() {
  const opts = parseArgs(process.argv);

  if (!opts.all && !opts.category) {
    console.error('Usage: node preview-icons.mjs --category <name> | --all');
    process.exit(1);
  }

  const categoryName = opts.all ? 'all' : opts.category;
  const icons = scanIcons(PLUGINS_DIR, opts.all ? null : opts.category);

  if (icons.length === 0) {
    console.log(`No icons found for "${categoryName}". Run generate-icons.mjs first.`);
    console.log(`  node bin/generate-icons.mjs ${opts.all ? '--all' : '--category ' + opts.category}`);
    process.exit(0);
  }

  mkdirSync(PREVIEW_DIR, { recursive: true });
  const title = opts.all ? 'All Components' : opts.category;
  const html = generateHtml(icons, title);
  const outPath = join(PREVIEW_DIR, `${opts.all ? 'all' : opts.category}-icons.html`);
  writeFileSync(outPath, html, 'utf-8');

  console.log(`Preview: ${outPath}`);
  console.log(`Icons: ${icons.length}`);
}

main();