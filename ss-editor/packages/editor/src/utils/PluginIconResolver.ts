// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { Component } from 'vue';
import { bundledPngModules, bundledJpgModules, bundledIndexModules } from 'virtual:plugin-icons';

export type PluginIconInfo = {
  type: 'image' | 'component' | 'none';
  value: string | Component | null;
};

function extractPluginType(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 2];
}

function extractTypeFromIndexPath(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 2];
}

export function getPluginIconMap(): Record<string, PluginIconInfo> {
  const iconMap: Record<string, PluginIconInfo> = {};

  for (const [path, module] of Object.entries(bundledPngModules)) {
    const type = extractPluginType(path);
    if (module.default) {
      iconMap[type] = { type: 'image', value: module.default };
    }
  }

  for (const [path, module] of Object.entries(bundledJpgModules)) {
    const type = extractPluginType(path);
    if (!iconMap[type] && module.default) {
      iconMap[type] = { type: 'image', value: module.default };
    }
  }

  for (const [path, module] of Object.entries(bundledIndexModules)) {
    const type = extractTypeFromIndexPath(path);
    if (iconMap[type]) continue;

    const mod = module as Record<string, any>;

    if (mod.default?.icon) {
      iconMap[type] = { type: 'component', value: mod.default.icon };
      continue;
    }

    if (mod.default?.iconComponent) {
      iconMap[type] = { type: 'component', value: mod.default.iconComponent };
      continue;
    }

    const iconExportKey = Object.keys(mod).find(
      (key) => key !== 'default' && (key.endsWith('Icon') || key === 'icon'),
    );

    if (iconExportKey) {
      iconMap[type] = { type: 'component', value: mod[iconExportKey] };
    }
  }

  return iconMap;
}