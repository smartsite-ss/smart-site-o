// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { Component } from 'vue';

export interface PluginDefinition {
  type: string;
  category: string;
  version?: string;
  label: string | (() => string);
  graphic: new (...args: any[]) => any;
  schema: any;
  icon?: any;
  config?: any;
  graphicComponent?: Component;
  graphicComponentName?: string;
  locales?: Record<string, () => Promise<Record<string, any>>>;
  defaultWidth?: number;
  defaultHeight?: number;
}

export function definePlugin(def: PluginDefinition) {
  return {
    type: def.type,
    category: def.category,
    version: def.version ?? null,
    label: def.label,
    icon: def.icon ?? null,
    config: def.config ?? null,
    graphic: def.graphic,
    schema: def.schema,
    graphicComponent: def.graphicComponent ?? null,
    graphicComponentName: def.graphicComponentName ?? null,
    locales: def.locales ?? null,
    defaultWidth: def.defaultWidth ?? 100,
    defaultHeight: def.defaultHeight ?? 100,
  };
}