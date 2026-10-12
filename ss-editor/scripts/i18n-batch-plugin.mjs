// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pluginsDir = path.resolve(__dirname, '..', 'packages', 'plugins');

function toPascalCase(str) {
  return str.replace(/(?:^|-)([a-z])/g, (_, c) => c.toUpperCase());
}

function findPluginDirs(basePath) {
  const results = [];
  const categories = fs.readdirSync(basePath);
  for (const cat of categories) {
    const catPath = path.join(basePath, cat);
    if (!fs.statSync(catPath).isDirectory()) continue;
    if (cat.startsWith('__') || cat.startsWith('.') || cat === 'dist-plugins') continue;
    const plugins = fs.readdirSync(catPath);
    for (const plugin of plugins) {
      const pluginPath = path.join(catPath, plugin);
      if (!fs.statSync(pluginPath).isDirectory()) continue;
      const files = fs.readdirSync(pluginPath).filter(f => f.endsWith('Plugin.ts'));
      const localesDir = path.join(pluginPath, 'locales');
      const zhCN = path.join(localesDir, 'zh-CN.json');
      const enUS = path.join(localesDir, 'en-US.json');
      const indexTs = path.join(pluginPath, 'index.ts');
      
      // Find the actual Plugin.ts file
      let actualPluginTs = null;
      for (const f of files) {
        const fpath = path.join(pluginPath, f);
        const content = fs.readFileSync(fpath, 'utf-8');
        if (/name:\s*'[^']*[\u4e00-\u9fa5]/.test(content) || /description:\s*'[^']*[\u4e00-\u9fa5]/.test(content)) {
          actualPluginTs = fpath;
          
          // Try to get i18n key from index.ts
          let i18nKey = plugin; // default: directory name
          if (fs.existsSync(indexTs)) {
            const idxContent = fs.readFileSync(indexTs, 'utf-8');
            const match = idxContent.match(/i18n\.global\.t\('([^.]+)\.label'\)/);
            if (match) {
              i18nKey = match[1];
            }
          }
          
          results.push({
            pluginPath,
            pluginTsPath: actualPluginTs,
            pluginType: i18nKey,
            hasZhCN: fs.existsSync(zhCN),
            hasEnUS: fs.existsSync(enUS),
            localesDir,
            zhCNPath: zhCN,
            enUSPath: enUS,
            category: cat,
            pluginTsName: f,
            dirName: plugin,
          });
          break;
        }
      }
    }
  }
  return results;
}

function extractChineseFromGraphic(content) {
  const nameMatch = content.match(/name:\s*'([^']*)/);
  const descMatch = content.match(/description:\s*'([^']*)/);
  return {
    name: nameMatch ? nameMatch[1] : null,
    description: descMatch ? descMatch[1] : null,
  };
}

function processPluginTs(content, pluginType) {
  // Add i18n import if not present
  if (!content.includes("import { i18n } from '@scada-editor/core'")) {
    const lines = content.split('\n');
    let lastImportLine = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trimStart().startsWith('import ')) {
        lastImportLine = i;
      }
    }
    if (lastImportLine >= 0) {
      lines.splice(lastImportLine + 1, 0, "import { i18n } from '@scada-editor/core';");
    }
    content = lines.join('\n');
  }

  // Add locale imports if not present
  if (!content.includes("import zhCN from './locales/zh-CN.json'")) {
    content = content.replace(
      /(import { i18n } from '@scada-editor\/core';)/,
      "$1\nimport zhCN from './locales/zh-CN.json';\nimport enUS from './locales/en-US.json';"
    );
  }

  // Add mergeLocaleMessage calls before @Graphic if not present
  if (!content.includes("i18n.global.mergeLocaleMessage('zh-CN', zhCN);")) {
    content = content.replace(
      /(@Graphic\()/,
      "i18n.global.mergeLocaleMessage('zh-CN', zhCN);\ni18n.global.mergeLocaleMessage('en-US', enUS);\n\n$1"
    );
  }

  // Replace name with i18n
  content = content.replace(
    /(name:\s*)'[^']*'/,
    `$1i18n.global.t('${pluginType}.label')`
  );

  // Replace description with i18n
  content = content.replace(
    /(description:\s*)'[^']*'/,
    `$1i18n.global.t('${pluginType}.description')`
  );

  return content;
}

function processZhCN(content, pluginType, chineseName, chineseDesc) {
  let data;
  try {
    data = JSON.parse(content);
  } catch (e) {
    console.error(`  Failed to parse zh-CN.json for ${pluginType}`);
    return content;
  }

  if (!data[pluginType]) {
    data[pluginType] = {};
  }

  if (!data[pluginType].label) {
    data[pluginType].label = chineseName || pluginType;
  }
  if (!data[pluginType].description) {
    data[pluginType].description = chineseDesc || `${(chineseName || pluginType)}图元`;
  }

  return JSON.stringify(data, null, 2) + '\n';
}

function processEnUS(content, pluginType, chineseName, chineseDesc) {
  let data;
  try {
    data = JSON.parse(content);
  } catch (e) {
    console.error(`  Failed to parse en-US.json for ${pluginType}`);
    return content;
  }

  if (!data[pluginType]) {
    data[pluginType] = {};
  }

  if (!data[pluginType].label) {
    data[pluginType].label = pluginType.charAt(0).toUpperCase() + pluginType.slice(1);
  }
  if (!data[pluginType].description) {
    data[pluginType].description = `${pluginType.charAt(0).toUpperCase() + pluginType.slice(1)} graphic element`;
  }

  return JSON.stringify(data, null, 2) + '\n';
}

// Main
const plugins = findPluginDirs(pluginsDir);
console.log(`Found ${plugins.length} plugins needing i18n fixes`);
console.log('');

const dryRun = process.argv.includes('--dry-run');

for (const p of plugins) {
  console.log(`Processing: ${p.category}/${p.dirName} (key: ${p.pluginType})`);

  // Read Plugin.ts
  let pluginTsContent = fs.readFileSync(p.pluginTsPath, 'utf-8');
  
  // Extract Chinese strings
  const chinese = extractChineseFromGraphic(pluginTsContent);

  // Check if already processed
  if (pluginTsContent.includes('i18n.global.t')) {
    console.log(`  SKIP: Already has i18n`);
    continue;
  }

  // Process Plugin.ts
  const newPluginTs = processPluginTs(pluginTsContent, p.pluginType);
  if (newPluginTs !== pluginTsContent) {
    if (!dryRun) {
      fs.writeFileSync(p.pluginTsPath, newPluginTs, 'utf-8');
      console.log(`  OK Plugin.ts`);
    } else {
      console.log(`  [DRY] Would update Plugin.ts`);
    }
  }

  // Process zh-CN
  if (p.hasZhCN) {
    let zhContent = fs.readFileSync(p.zhCNPath, 'utf-8');
    const newZh = processZhCN(zhContent, p.pluginType, chinese.name, chinese.description);
    if (newZh !== zhContent) {
      if (!dryRun) {
        fs.writeFileSync(p.zhCNPath, newZh, 'utf-8');
        console.log(`  OK zh-CN.json`);
      } else {
        console.log(`  [DRY] Would update zh-CN.json`);
      }
    }
  } else {
    const zhData = {};
    zhData[p.pluginType] = {
      label: chinese.name || p.pluginType,
      description: chinese.description || `${(chinese.name || p.pluginType)}图元`,
    };
    if (!dryRun) {
      if (!fs.existsSync(p.localesDir)) {
        fs.mkdirSync(p.localesDir, { recursive: true });
      }
      fs.writeFileSync(p.zhCNPath, JSON.stringify(zhData, null, 2) + '\n', 'utf-8');
      console.log(`  CREATED zh-CN.json`);
    } else {
      console.log(`  [DRY] Would create zh-CN.json`);
    }
  }

  // Process en-US
  if (p.hasEnUS) {
    let enContent = fs.readFileSync(p.enUSPath, 'utf-8');
    const newEn = processEnUS(enContent, p.pluginType, chinese.name, chinese.description);
    if (newEn !== enContent) {
      if (!dryRun) {
        fs.writeFileSync(p.enUSPath, newEn, 'utf-8');
        console.log(`  OK en-US.json`);
      } else {
        console.log(`  [DRY] Would update en-US.json`);
      }
    }
  } else {
    const enData = {};
    enData[p.pluginType] = {
      label: p.pluginType.charAt(0).toUpperCase() + p.pluginType.slice(1),
      description: `${p.pluginType.charAt(0).toUpperCase() + p.pluginType.slice(1)} graphic element`,
    };
    if (!dryRun) {
      if (!fs.existsSync(p.localesDir)) {
        fs.mkdirSync(p.localesDir, { recursive: true });
      }
      fs.writeFileSync(p.enUSPath, JSON.stringify(enData, null, 2) + '\n', 'utf-8');
      console.log(`  CREATED en-US.json`);
    } else {
      console.log(`  [DRY] Would create en-US.json`);
    }
  }
}

console.log('\nDone!');