// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export type SupportedLocale = 'zh-CN' | 'en-US';

export interface I18nResource {
  [key: string]: string | I18nResource;
}

interface PluginLocaleEntry {
  pluginType: string;
  loader: () => Promise<{ default: I18nResource }>;
}

export class I18nProvider {
  private static _locale: SupportedLocale = 'zh-CN';
  private static _resources: Map<string, I18nResource> = new Map();
  private static _pluginLoaders: PluginLocaleEntry[] = [];
  private static _listeners: Array<() => void> = [];
  private static _systemResources: Record<SupportedLocale, I18nResource> = {
    'zh-CN': {
      common: {
        ok: '确定',
        cancel: '取消',
        save: '保存',
        delete: '删除',
        edit: '编辑',
        add: '新增',
        search: '搜索',
        reset: '重置',
        export: '导出',
        import: '导入',
        confirm: '确认',
        close: '关闭',
        refresh: '刷新',
      },
      category: {
        basic: '基础组件',
        form: '表单组件',
        chart: '图表组件',
        industrial: '工业组件',
        media: '媒体组件',
        layout: '布局组件',
        '3d': '3D 组件',
        svg: 'SVG 组件',
      },
    },
    'en-US': {
      common: {
        ok: 'OK',
        cancel: 'Cancel',
        save: 'Save',
        delete: 'Delete',
        edit: 'Edit',
        add: 'Add',
        search: 'Search',
        reset: 'Reset',
        export: 'Export',
        import: 'Import',
        confirm: 'Confirm',
        close: 'Close',
        refresh: 'Refresh',
      },
      category: {
        basic: 'Basic',
        form: 'Form',
        chart: 'Chart',
        industrial: 'Industrial',
        media: 'Media',
        layout: 'Layout',
        '3d': '3D',
        svg: 'SVG Components',
      },
    },
  };

  static get locale(): SupportedLocale {
    return this._locale;
  }

  static registerPluginLocale(pluginType: string, loader: () => Promise<{ default: I18nResource }>): void {
    const existing = this._pluginLoaders.find((e) => e.pluginType === pluginType);
    if (existing) {
      existing.loader = loader;
    } else {
      this._pluginLoaders.push({ pluginType, loader });
    }
  }

  static async setLocale(locale: SupportedLocale): Promise<void> {
    this._locale = locale;
    this._resources.clear();

    this._resources.set('__system__', this._systemResources[locale]);

    await Promise.all(
      this._pluginLoaders.map(async (entry) => {
        try {
          const mod = await entry.loader();
          this._resources.set(entry.pluginType, mod.default);
        } catch {
          // 插件未提供该语言包，静默跳过
        }
      }),
    );

    this._listeners.forEach((cb) => cb());
  }

  static onLocaleChanged(cb: () => void): () => void {
    this._listeners.push(cb);
    return () => {
      this._listeners = this._listeners.filter((l) => l !== cb);
    };
  }

  static t(pluginType: string, path: string, fallback?: string): string {
    const pluginRes = this._resources.get(pluginType);
    if (pluginRes) {
      const value = this._resolvePath(pluginRes, path);
      if (value !== undefined) return String(value);
    }

    const sysRes = this._resources.get('__system__');
    if (sysRes) {
      const value = this._resolvePath(sysRes, path);
      if (value !== undefined) return String(value);
    }

    return fallback ?? path;
  }

  static tCommon(key: string, fallback?: string): string {
    return this.t('__system__', `common.${key}`, fallback);
  }

  static tCategory(category: string, fallback?: string): string {
    return this.t('__system__', `category.${category}`, fallback);
  }

  private static _resolvePath(obj: I18nResource, path: string): string | undefined {
    const parts = path.split('.');
    let current: any = obj;
    for (const part of parts) {
      if (current === undefined || current === null) return undefined;
      current = current[part];
    }
    return typeof current === 'string' ? current : undefined;
  }
}