// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ref, computed } from 'vue';
import { useConfigStore, eventBus } from '@scada-editor/core';

export interface ConfigChangeEvent {
  type: 'ui' | 'tools' | 'canvas';
  config: Partial<Record<string, any>>;
}

export function useConfig() {
  const configStore = useConfigStore();
  const lastChange = ref<ConfigChangeEvent | null>(null);

  const updateUIConfig = (config: Partial<Record<string, any>>) => {
    configStore.updateUIConfig(config);
    lastChange.value = { type: 'ui', config };
    eventBus.emit('config-changed', lastChange.value);
  };

  const updateToolConfig = (config: Partial<Record<string, any>>) => {
    configStore.updateToolConfig(config);
    lastChange.value = { type: 'tools', config };
    eventBus.emit('config-changed', lastChange.value);
  };

  const updateCanvasConfig = (config: Partial<Record<string, any>>) => {
    configStore.updateCanvasConfig(config);
    lastChange.value = { type: 'canvas', config };
    eventBus.emit('config-changed', lastChange.value);
  };

  const updateAndNotify = (configType: 'ui' | 'tools' | 'canvas', config: any) => {
    switch (configType) {
      case 'ui':
        updateUIConfig(config);
        break;
      case 'tools':
        updateToolConfig(config);
        break;
      case 'canvas':
        updateCanvasConfig(config);
        break;
    }
  };

  const resetUIConfig = () => {
    configStore.updateUIConfig({
      showToolbar: true,
      showPropertyPanel: true,
      showLayerPanel: true,
      theme: 'dark',
      language: 'zh-CN',
      leftPanelWidth: 280,
      rightPanelWidth: 320,
      leftPanelCollapsed: false,
      rightPanelCollapsed: false,
      minPanelWidth: 200,
      maxPanelWidth: 600,
      collapsedPanelWidth: 48,
    });
    lastChange.value = { type: 'ui', config: {} };
    eventBus.emit('config-changed', lastChange.value);
    eventBus.emit('reset-panel-layout', null);
  };

  const exportConfig = (): string => {
    const config = {
      ui: { ...configStore.ui },
      tools: { ...configStore.tools },
      canvas: { ...configStore.canvas },
    };
    return JSON.stringify(config, null, 2);
  };

  const importConfig = (configJson: string): { success: boolean; error?: string } => {
    try {
      const config = JSON.parse(configJson);
      
      if (config.ui) {
        updateUIConfig(config.ui);
      }
      if (config.tools) {
        updateToolConfig(config.tools);
      }
      if (config.canvas) {
        updateCanvasConfig(config.canvas);
      }
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  };

  const validateLayoutConfig = (config: {
    minWidth: number;
    maxWidth: number;
    collapsedWidth: number;
    leftPanelDefaultWidth: number;
    rightPanelDefaultWidth: number;
  }): string[] => {
    const errors: string[] = [];

    if (config.minWidth >= config.maxWidth) {
      errors.push('最小宽度必须小于最大宽度');
    }

    if (config.collapsedWidth >= config.minWidth) {
      errors.push('折叠宽度必须小于最小宽度');
    }

    if (config.leftPanelDefaultWidth < config.minWidth || 
        config.leftPanelDefaultWidth > config.maxWidth) {
      errors.push('左侧面板默认宽度必须在最小宽度和最大宽度之间');
    }

    if (config.rightPanelDefaultWidth < config.minWidth || 
        config.rightPanelDefaultWidth > config.maxWidth) {
      errors.push('右侧面板默认宽度必须在最小宽度和最大宽度之间');
    }

    return errors;
  };

  const watchConfig = (callback: (event: ConfigChangeEvent) => void) => {
    eventBus.on('config-changed', callback);
    return () => {
      eventBus.off('config-changed', callback);
    };
  };

  const uiConfig = computed(() => configStore.ui);
  const toolConfig = computed(() => configStore.tools);
  const canvasConfig = computed(() => configStore.canvas);

  return {
    configStore,
    uiConfig,
    toolConfig,
    canvasConfig,
    lastChange,
    updateUIConfig,
    updateToolConfig,
    updateCanvasConfig,
    updateAndNotify,
    resetUIConfig,
    exportConfig,
    importConfig,
    validateLayoutConfig,
    watchConfig,
  };
}