// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { DeployMode } from '../types/DeployMode';

export interface RemotePluginEntry {
  type: string;
  category: string;
  label: string;
  labelEn: string;
  url: string;
  version: string;
  checksum?: string;
  deployMode: DeployMode.DIRECTORY;
  sdkVersionRange: string;
  dependencies?: Record<string, string>;
  icon?: string;
}

export interface RemotePluginManifest {
  name: string;
  version: string;
  entries: RemotePluginEntry[];
}

interface LoadedPlugin {
  manifest: RemotePluginEntry;
  loadedAt: number;
  instance?: any;
}

export class RemotePluginLoader {
  private cache = new Map<string, LoadedPlugin>();
  private registryUrl: string;
  private onRegister?: (manifest: RemotePluginEntry) => void;

  constructor(registryUrl: string) {
    this.registryUrl = registryUrl;
  }

  setRegisterCallback(cb: (manifest: RemotePluginEntry) => void): void {
    this.onRegister = cb;
  }

  async load(entry: RemotePluginEntry): Promise<RemotePluginEntry | null> {
    const cached = this.cache.get(entry.type);
    if (cached) {
      return cached.manifest;
    }

    try {
      const mod = await import(entry.url);
      const exported = mod.default;

      if (exported && exported.type) {
        entry.type = exported.type || entry.type;
        entry.category = exported.category || entry.category;
      }

      this.cache.set(entry.type, {
        manifest: entry,
        loadedAt: Date.now(),
        instance: exported,
      });

      this.onRegister?.(entry);

      return entry;
    } catch (error) {
      console.error(`Failed to load plugin "${entry.type}" from ${entry.url}:`, error);
      return null;
    }
  }

  async loadCategory(category: string): Promise<RemotePluginEntry[]> {
    const manifestUrl = `${this.registryUrl}/${category}/plugin-manifest.json`;

    try {
      const response = await fetch(manifestUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch manifest: ${response.statusText}`);
      }
      const data: RemotePluginManifest = await response.json();
      const entries = data.entries || [];

      const results = await Promise.allSettled(entries.map((e) => this.load(e)));
      return results
        .filter((r) => r.status === 'fulfilled' && r.value !== null)
        .map((r) => (r as PromiseFulfilledResult<RemotePluginEntry>).value);
    } catch (error) {
      console.error(`Failed to load category "${category}" from registry:`, error);
      return [];
    }
  }

  async loadFromManifestUrl(manifestUrl: string): Promise<RemotePluginEntry[]> {
    try {
      const response = await fetch(manifestUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch manifest: ${response.statusText}`);
      }
      const data: RemotePluginManifest = await response.json();
      const entries = data.entries || [];

      const results = await Promise.allSettled(entries.map((e) => this.load(e)));
      return results
        .filter((r) => r.status === 'fulfilled' && r.value !== null)
        .map((r) => (r as PromiseFulfilledResult<RemotePluginEntry>).value);
    } catch (error) {
      console.error(`Failed to load manifest from ${manifestUrl}:`, error);
      return [];
    }
  }

  async loadAll(): Promise<RemotePluginEntry[]> {
    const registryEndpoint = `${this.registryUrl}/registry.json`;

    try {
      const response = await fetch(registryEndpoint);
      if (!response.ok) {
        throw new Error(`Failed to fetch registry: ${response.statusText}`);
      }
      const data = await response.json();
      const allEntries: RemotePluginEntry[] = data.entries || [];

      const results = await Promise.allSettled(allEntries.map((e) => this.load(e)));
      return results
        .filter((r) => r.status === 'fulfilled' && r.value !== null)
        .map((r) => (r as PromiseFulfilledResult<RemotePluginEntry>).value);
    } catch (error) {
      console.error('Failed to load registry:', error);
      return [];
    }
  }

  getInstalledIcons(): Record<string, string> {
    const icons: Record<string, string> = {};
    this.cache.forEach((loaded, type) => {
      if (loaded.manifest.icon) {
        icons[type] = loaded.manifest.icon;
      }
    });
    return icons;
  }

  getInstalled(): RemotePluginEntry[] {
    return Array.from(this.cache.values()).map((c) => c.manifest);
  }

  isLoaded(type: string): boolean {
    return this.cache.has(type);
  }

  getLoadedCategories(): string[] {
    const categories = new Set<string>();
    this.cache.forEach((_, key) => {
      const entry = this.cache.get(key);
      if (entry) {
        categories.add(entry.manifest.category);
      }
    });
    return Array.from(categories).sort();
  }

  unload(type: string): boolean {
    return this.cache.delete(type);
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  clearCache(): void {
    this.cache.clear();
  }
}