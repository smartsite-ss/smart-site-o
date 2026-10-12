// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { App, Component } from 'vue';
import { ConfigTemplateManager } from '@scada-editor/core';
import {
  RemotePluginLoader,
  type RemotePluginEntry,
} from '@scada-editor/plugin-sdk';
import { directoryPluginIcons } from './shared/directoryIcons';
import {
  BUNDLED_CATEGORIES,
  DIRECTORY_CATEGORIES,
  bundledModules,
} from 'virtual:bundled-plugins';

interface PluginManifest {
  type: string;
  category: string;
  label: string;
  schema?: any;
  config?: any;
  locales?: Record<string, any>;
  graphicComponent?: Component;
  graphicComponentName?: string;
}

export { BUNDLED_CATEGORIES, DIRECTORY_CATEGORIES };

const registeredComponents = new Set<string>();

let _pluginReadyResolve: () => void;
export const pluginReady = new Promise<void>((resolve) => {
  _pluginReadyResolve = resolve;
});

export function markPluginsReady() {
  _pluginReadyResolve();
}

export function registerBundledPlugins(app: App, i18n?: any): string[] {
  const registered: string[] = [];

  Object.entries(bundledModules).forEach(([_path, mod]) => {
    const manifest = (mod as any).default as PluginManifest | undefined;
    if (!manifest?.type) return;

    if (manifest.schema) {
      ConfigTemplateManager.registerPluginSchema(manifest.type, manifest.schema);
    }

    if (manifest.config) {
      ConfigTemplateManager.registerConfigComponent(manifest.type, manifest.config);
    }

    if (manifest.locales && i18n) {
      Object.entries(manifest.locales).forEach(([lang, locale]) => {
        i18n.global.mergeLocaleMessage(lang, locale);
      });
    }

    if (manifest.graphicComponent && manifest.graphicComponentName) {
      const uniqueName = `${manifest.category}-${manifest.graphicComponentName}`;
      if (!registeredComponents.has(uniqueName)) {
        registeredComponents.add(uniqueName);
        app.component(uniqueName, manifest.graphicComponent);
      }
    }

    registered.push(manifest.type);
  });

  return registered;
}

export const remotePluginLoader = new RemotePluginLoader(
  import.meta.env.VITE_PLUGIN_REGISTRY_URL || 'https://cdn.example.com/plugins'
);

export async function registerDirectoryPlugins(
  app: App,
  i18n?: any,
  categories?: string[]
): Promise<RemotePluginEntry[]> {
  let entries: RemotePluginEntry[] = [];

  if (categories && categories.length > 0) {
    for (const category of categories) {
      const result = await remotePluginLoader.loadCategory(category);
      entries = entries.concat(result);
    }
  } else {
    entries = await remotePluginLoader.loadAll();
  }

  for (const entry of entries) {
    const cached = (remotePluginLoader as any).cache?.get(entry.type);
    const manifest = cached?.instance;
    if (!manifest) continue;

    if (manifest.schema) {
      ConfigTemplateManager.registerPluginSchema(entry.type, manifest.schema);
    }

    if (manifest.config) {
      ConfigTemplateManager.registerConfigComponent(entry.type, manifest.config);
    }

    if (manifest.locales && i18n) {
      Object.entries(manifest.locales).forEach(([lang, locale]: [string, any]) => {
        i18n.global.mergeLocaleMessage(lang, locale);
      });
    }

    if (manifest.graphicComponent && manifest.graphicComponentName) {
      const uniqueName = `${entry.category}-${manifest.graphicComponentName}`;
      if (!registeredComponents.has(uniqueName)) {
        registeredComponents.add(uniqueName);
        app.component(uniqueName, manifest.graphicComponent);
      }
    }
  }

  refreshDirectoryPluginIcons();

  return entries;
}

export function refreshDirectoryPluginIcons() {
  const icons = remotePluginLoader.getInstalledIcons();
  Object.keys(directoryPluginIcons).forEach(k => delete directoryPluginIcons[k]);
  Object.assign(directoryPluginIcons, icons);
}

export async function registerAllPlugins(
  app: App,
  i18n?: any,
  options?: { directoryCategories?: string[] }
): Promise<string[]> {
  const bundledTypes = registerBundledPlugins(app, i18n);

  const directoryEntries = await registerDirectoryPlugins(
    app,
    i18n,
    options?.directoryCategories
  );
  refreshDirectoryPluginIcons();

  return [...bundledTypes, ...directoryEntries.map((e) => e.type)];
}