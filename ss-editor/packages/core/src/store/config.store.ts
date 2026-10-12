// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { defineStore } from 'pinia';
import { DEFAULT_SHORTCUTS, ShortcutConfig } from '../canvas-page/shortcuts.config';
import { KeyboardContext, KeyModifiers } from '../canvas-page/keyboard.service';
import { loadPersistedState, persistState } from './persistent-store';

const CONFIG_STORAGE_KEY = 'scada-editor-config';

export const DEFAULT_MIN_PANEL_WIDTH = 200;
export const DEFAULT_MAX_PANEL_WIDTH = 600;
export const DEFAULT_LEFT_WIDTH = 220;
export const DEFAULT_RIGHT_WIDTH = 320;
export const DEFAULT_COLLAPSED_WIDTH = 16;

// 获取默认状态
function getDefaultState() {
  return {
    // 工具配置
    tools: {
      selectedTool: 'select', // select, rect, circle, text, image
      fillColor: '#4CAF50',
      strokeColor: '#388E3C',
      lineWidth: 2,
      fontSize: 14,
      fontFamily: 'Arial',
    },

    // 画布配置
    canvas: {
      grid: true,
      gridSize: 20,
      snapToGrid: true,
      showRulers: true,
      zoom: 1,
      scaleMin: 20,
      scaleMax: 300,
      zoomStep: 5,
      renderMode: 'canvas' as 'canvas' | 'konva' | 'svg' | 'webgl',
      useCanvasSelection: false,
    },

    // 界面配置
    ui: {
      showToolbar: true,
      showPropertyPanel: true,
      showLayerPanel: true,
      theme: 'dark',
      language: 'zh-CN', // zh-CN, en-US
      leftPanelWidth: DEFAULT_LEFT_WIDTH,
      rightPanelWidth: DEFAULT_RIGHT_WIDTH,
      leftPanelCollapsed: false,
      rightPanelCollapsed: false,
      minPanelWidth: DEFAULT_MIN_PANEL_WIDTH,
      maxPanelWidth: DEFAULT_MAX_PANEL_WIDTH,
      collapsedPanelWidth: DEFAULT_COLLAPSED_WIDTH,
      headerHeight: 60,       // 顶部栏高度
      sidebarWidth: 200,      // 侧栏宽度
      // AI 助手浮动面板配置（数据中台）
      aiAssistantVisible: true,  // 是否显示 AI 助手浮动按钮
      aiAssistantX: null as number | null,   // 面板位置 X（null 表示默认右下角）
      aiAssistantY: null as number | null,   // 面板位置 Y
    },

    // 自动保存配置
    autoSave: {
      enabled: true,
      interval: 300, // 默认 300 秒
    },

    // 快捷键配置
    shortcuts: DEFAULT_SHORTCUTS as ShortcutConfig[],
  };
}

function getInitialState() {
  return loadPersistedState(CONFIG_STORAGE_KEY, getDefaultState, (saved, defaults) => ({
    ...defaults,
    ...saved,
    tools: { ...defaults.tools, ...(saved as any).tools },
    canvas: { ...defaults.canvas, ...(saved as any).canvas },
    ui: { ...defaults.ui, ...(saved as any).ui },
    autoSave: { ...defaults.autoSave, ...(saved as any).autoSave },
    shortcuts: (saved as any).shortcuts || defaults.shortcuts,
  }));
}

// 配置状态管理
export const useConfigStore = defineStore('config', {
  state: () => getInitialState(),

  actions: {
    saveConfig(): { success: boolean; error?: string } {
      try {
        persistState(CONFIG_STORAGE_KEY, {
          tools: this.tools,
          canvas: this.canvas,
          ui: this.ui,
          autoSave: this.autoSave,
          shortcuts: this.shortcuts,
        });
        return { success: true };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[ConfigStore] Failed to save config: ${errorMessage}`);
        return { success: false, error: errorMessage };
      }
    },

    // 更新工具配置
    updateToolConfig(config: Partial<Record<string, any>>) {
      Object.assign(this.tools, config);
      this.saveConfig();
    },

    // 更新画布配置
    updateCanvasConfig(config: Partial<Record<string, any>>) {
      Object.assign(this.canvas, config);
      this.saveConfig();
    },

    // 更新界面配置
    updateUIConfig(config: Partial<Record<string, any>>) {
      Object.assign(this.ui, config);
      this.saveConfig();
    },

    // 更新自动保存配置
    updateAutoSaveConfig(config: Partial<{ enabled: boolean; interval: number }>) {
      Object.assign(this.autoSave, config);
      this.saveConfig();
    },

    // 更新单个快捷键
    updateShortcut(id: string, config: Partial<ShortcutConfig>) {
      const index = this.shortcuts.findIndex((s: ShortcutConfig) => s.id === id);
      if (index !== -1) {
        this.shortcuts[index] = { ...this.shortcuts[index], ...config };
        this.saveConfig();
      }
    },

    // 批量更新快捷键
    updateShortcuts(shortcuts: Partial<ShortcutConfig>[]) {
      shortcuts.forEach(shortcut => {
        if (shortcut.id) {
          this.updateShortcut(shortcut.id, shortcut);
        }
      });
    },

    // 重置单个快捷键为默认值
    resetShortcut(id: string) {
      const defaultShortcut = DEFAULT_SHORTCUTS.find((s: ShortcutConfig) => s.id === id);
      if (defaultShortcut) {
        const index = this.shortcuts.findIndex((s: ShortcutConfig) => s.id === id);
        if (index !== -1) {
          this.shortcuts[index] = { ...defaultShortcut };
          this.saveConfig();
        }
      }
    },

    // 重置所有快捷键为默认值
    resetAllShortcuts() {
      this.shortcuts = [...DEFAULT_SHORTCUTS];
      this.saveConfig();
    },

    // 获取快捷键配置
    getShortcut(id: string): ShortcutConfig | undefined {
      return this.shortcuts.find((s: ShortcutConfig) => s.id === id);
    },

    // 获取所有快捷键
    getAllShortcuts(): ShortcutConfig[] {
      return [...this.shortcuts];
    },

    // 检查快捷键是否冲突
    checkShortcutConflict(key: string, modifiers: KeyModifiers, context: KeyboardContext, excludeId?: string): boolean {
      return this.shortcuts.some((s: ShortcutConfig) => {
        if (excludeId && s.id === excludeId) return false;
        if (s.context !== context && s.context !== KeyboardContext.GLOBAL) return false;
        if (s.key.toLowerCase() !== key.toLowerCase()) return false;
        return (
          (modifiers.ctrl === undefined || s.modifiers.ctrl === modifiers.ctrl) &&
          (modifiers.shift === undefined || s.modifiers.shift === modifiers.shift) &&
          (modifiers.alt === undefined || s.modifiers.alt === modifiers.alt) &&
          (modifiers.meta === undefined || s.modifiers.meta === modifiers.meta)
        );
      });
    },

    // 重置配置
    resetConfig() {
      this.$reset();
      this.saveConfig();
    },

    // 导入配置
    importConfig(data: any) {
      if (data.tools) {
        this.tools = data.tools;
      }
      if (data.canvas) {
        this.canvas = data.canvas;
      }
      if (data.ui) {
        this.ui = data.ui;
      }
      if (data.autoSave) {
        this.autoSave = data.autoSave;
      }
      if (data.shortcuts) {
        this.shortcuts = data.shortcuts;
      }
      this.saveConfig();
    },

    // 导出配置
    exportConfig() {
      return {
        tools: this.tools,
        canvas: this.canvas,
        ui: this.ui,
        autoSave: this.autoSave,
        shortcuts: this.shortcuts,
      };
    },
  },
});
