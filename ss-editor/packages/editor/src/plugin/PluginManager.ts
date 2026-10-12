// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { UIPlugin, PanelConfig, ToolConfig } from '../types';

export class UIPluginManager {
  private plugins: UIPlugin[] = [];
  private panels: PanelConfig[] = [];
  private tools: ToolConfig[] = [];
  private components: Record<string, any> = {};

  install(plugin: UIPlugin, context: any) {
    if (this.plugins.find(p => p.name === plugin.name)) {
      console.warn(`Plugin ${plugin.name} already installed`);
      return;
    }

    plugin.install(context);

    if (plugin.components) {
      Object.assign(this.components, plugin.components);
    }

    if (plugin.panels) {
      this.panels.push(...plugin.panels);
    }

    if (plugin.tools) {
      this.tools.push(...plugin.tools);
    }

    this.plugins.push(plugin);
  }

  uninstall(pluginName: string) {
    const index = this.plugins.findIndex(p => p.name === pluginName);
    if (index !== -1) {
      this.plugins.splice(index, 1);
      // 清理对应的面板和工具
      this.panels = this.panels.filter(p => !p.id.startsWith(`${pluginName}-`));
      this.tools = this.tools.filter(t => !t.id.startsWith(`${pluginName}-`));
    }
  }

  getPlugins() {
    return [...this.plugins];
  }

  getPanels() {
    return [...this.panels];
  }

  getTools() {
    return [...this.tools];
  }

  getComponents() {
    return { ...this.components };
  }
}

// 创建单例
let uiPluginManagerInstance: UIPluginManager | null = null;

export function getUIPluginManager() {
  if (!uiPluginManagerInstance) {
    uiPluginManagerInstance = new UIPluginManager();
  }
  return uiPluginManagerInstance;
}
