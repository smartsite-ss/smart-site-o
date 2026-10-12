// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

const SRC_DIR = resolve(__dirname, '..', 'packages', 'plugins', 'directory');
const PUBLIC_DIR = resolve(__dirname, '..', 'apps', 'web', 'public', 'plugins');
const CATEGORIES = ['electric', 'industrial', 'mines', '3d'];

function syncManifests(): void {
  console.log('🔄 Syncing plugin manifests to public/plugins/...\n');

  const allEntries: any[] = [];

  for (const cat of CATEGORIES) {
    const targetDir = join(PUBLIC_DIR, cat);
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }

    const srcManifest = join(SRC_DIR, cat, 'plugin-manifest.json');
    const destManifest = join(targetDir, 'plugin-manifest.json');

    if (existsSync(srcManifest)) {
      copyFileSync(srcManifest, destManifest);
      const manifest = JSON.parse(readFileSync(srcManifest, 'utf-8'));
      allEntries.push(...(manifest.entries || []));
      console.log(`  ✅ ${cat}/plugin-manifest.json (${manifest.entries?.length || 0} plugins)`);
    } else {
      console.log(`  ⚠️  ${cat}/plugin-manifest.json not found`);
    }
  }

  const registry = {
    name: 'scada-editor-plugins-local',
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    entries: allEntries,
  };

  writeFileSync(join(PUBLIC_DIR, 'registry.json'), JSON.stringify(registry, null, 2));
  console.log(`\n✅ registry.json generated (${allEntries.length} total plugins)`);
  console.log(`   Served at: http://localhost:5173/plugins/`);
}

syncManifests();