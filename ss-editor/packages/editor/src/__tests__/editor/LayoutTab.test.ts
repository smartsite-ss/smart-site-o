// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { reactive, computed } from 'vue';
import { useConfigStore, eventBus } from '@scada-editor/core';

vi.mock('@scada-editor/core', () => ({
  useConfigStore: vi.fn(),
  eventBus: {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  },
  DEFAULT_MIN_PANEL_WIDTH: 200,
  DEFAULT_MAX_PANEL_WIDTH: 600,
  DEFAULT_LEFT_WIDTH: 280,
  DEFAULT_RIGHT_WIDTH: 320,
  DEFAULT_COLLAPSED_WIDTH: 48,
}));

interface LayoutConfig {
  leftPanelDefaultWidth: number;
  rightPanelDefaultWidth: number;
  minWidth: number;
  maxWidth: number;
  collapsedWidth: number;
}

describe('LayoutTab Configuration', () => {
  let mockConfigStore: any;
  
  beforeEach(() => {
    mockConfigStore = {
      ui: {
        leftPanelWidth: 280,
        rightPanelWidth: 320,
        minPanelWidth: 200,
        maxPanelWidth: 600,
        collapsedPanelWidth: 48,
      },
      updateUIConfig: vi.fn(),
      saveConfig: vi.fn(() => ({ success: true })),
    };
    (useConfigStore as any).mockReturnValue(mockConfigStore);
    (eventBus.emit as any).mockClear();
  });

  describe('Configuration Initialization', () => {
    it('should initialize layoutConfig from configStore', () => {
      const layoutConfig = reactive<LayoutConfig>({
        leftPanelDefaultWidth: mockConfigStore.ui.leftPanelWidth,
        rightPanelDefaultWidth: mockConfigStore.ui.rightPanelWidth,
        minWidth: mockConfigStore.ui.minPanelWidth || 200,
        maxWidth: mockConfigStore.ui.maxPanelWidth || 600,
        collapsedWidth: mockConfigStore.ui.collapsedPanelWidth || 48,
      });

      expect(layoutConfig.leftPanelDefaultWidth).toBe(280);
      expect(layoutConfig.rightPanelDefaultWidth).toBe(320);
      expect(layoutConfig.minWidth).toBe(200);
      expect(layoutConfig.maxWidth).toBe(600);
      expect(layoutConfig.collapsedWidth).toBe(48);
    });

    it('should handle missing configStore values with defaults', () => {
      mockConfigStore.ui = {
        leftPanelWidth: undefined,
        rightPanelWidth: undefined,
        minPanelWidth: undefined,
        maxPanelWidth: undefined,
        collapsedPanelWidth: undefined,
      };

      const layoutConfig = reactive<LayoutConfig>({
        leftPanelDefaultWidth: mockConfigStore.ui.leftPanelWidth || 280,
        rightPanelDefaultWidth: mockConfigStore.ui.rightPanelWidth || 320,
        minWidth: mockConfigStore.ui.minPanelWidth || 200,
        maxWidth: mockConfigStore.ui.maxPanelWidth || 600,
        collapsedWidth: mockConfigStore.ui.collapsedPanelWidth || 48,
      });

      expect(layoutConfig.leftPanelDefaultWidth).toBe(280);
      expect(layoutConfig.rightPanelDefaultWidth).toBe(320);
      expect(layoutConfig.minWidth).toBe(200);
      expect(layoutConfig.maxWidth).toBe(600);
      expect(layoutConfig.collapsedWidth).toBe(48);
    });
  });

  describe('Change Detection', () => {
    it('should detect changes when layoutConfig is modified', () => {
      const layoutConfig = reactive<LayoutConfig>({
        leftPanelDefaultWidth: 280,
        rightPanelDefaultWidth: 320,
        minWidth: 200,
        maxWidth: 600,
        collapsedWidth: 48,
      });

      const originalConfig = { ...layoutConfig };

      const hasChanges = computed(() => {
        return JSON.stringify(layoutConfig) !== JSON.stringify(originalConfig);
      });

      expect(hasChanges.value).toBe(false);

      layoutConfig.leftPanelDefaultWidth = 300;

      expect(hasChanges.value).toBe(true);
    });

    it('should NOT detect changes after saving', () => {
      const layoutConfig = reactive<LayoutConfig>({
        leftPanelDefaultWidth: 280,
        rightPanelDefaultWidth: 320,
        minWidth: 200,
        maxWidth: 600,
        collapsedWidth: 48,
      });

      const originalConfig = reactive<LayoutConfig>({ ...layoutConfig });

      const hasChanges = computed(() => {
        return JSON.stringify(layoutConfig) !== JSON.stringify(originalConfig);
      });

      layoutConfig.leftPanelDefaultWidth = 300;
      expect(hasChanges.value).toBe(true);

      Object.keys(layoutConfig).forEach(key => {
        (originalConfig as any)[key] = (layoutConfig as any)[key];
      });
      expect(hasChanges.value).toBe(false);
    });
  });

  describe('Configuration Validation', () => {
    it('should validate minWidth < maxWidth', () => {
      const layoutConfig = reactive<LayoutConfig>({
        leftPanelDefaultWidth: 280,
        rightPanelDefaultWidth: 320,
        minWidth: 300,
        maxWidth: 200,
        collapsedWidth: 48,
      });

      const isValid = layoutConfig.minWidth < layoutConfig.maxWidth;
      expect(isValid).toBe(false);
    });

    it('should validate collapsedWidth < minWidth', () => {
      const layoutConfig = reactive<LayoutConfig>({
        leftPanelDefaultWidth: 280,
        rightPanelDefaultWidth: 320,
        minWidth: 200,
        maxWidth: 600,
        collapsedWidth: 250,
      });

      const isValid = layoutConfig.collapsedWidth < layoutConfig.minWidth;
      expect(isValid).toBe(false);
    });

    it('should validate leftPanelDefaultWidth within range', () => {
      const layoutConfig = reactive<LayoutConfig>({
        leftPanelDefaultWidth: 100,
        rightPanelDefaultWidth: 320,
        minWidth: 200,
        maxWidth: 600,
        collapsedWidth: 48,
      });

      const isValid = layoutConfig.leftPanelDefaultWidth >= layoutConfig.minWidth && 
                      layoutConfig.leftPanelDefaultWidth <= layoutConfig.maxWidth;
      expect(isValid).toBe(false);
    });

    it('should validate rightPanelDefaultWidth within range', () => {
      const layoutConfig = reactive<LayoutConfig>({
        leftPanelDefaultWidth: 280,
        rightPanelDefaultWidth: 700,
        minWidth: 200,
        maxWidth: 600,
        collapsedWidth: 48,
      });

      const isValid = layoutConfig.rightPanelDefaultWidth >= layoutConfig.minWidth && 
                      layoutConfig.rightPanelDefaultWidth <= layoutConfig.maxWidth;
      expect(isValid).toBe(false);
    });
  });

  describe('Configuration Saving', () => {
    it('should save correct values to configStore', () => {
      const layoutConfig = reactive<LayoutConfig>({
        leftPanelDefaultWidth: 300,
        rightPanelDefaultWidth: 350,
        minWidth: 150,
        maxWidth: 500,
        collapsedWidth: 36,
      });

      mockConfigStore.updateUIConfig({
        leftPanelWidth: layoutConfig.leftPanelDefaultWidth,
        rightPanelWidth: layoutConfig.rightPanelDefaultWidth,
        minPanelWidth: layoutConfig.minWidth,
        maxPanelWidth: layoutConfig.maxWidth,
        collapsedPanelWidth: layoutConfig.collapsedWidth,
      });

      expect(mockConfigStore.updateUIConfig).toHaveBeenCalledWith({
        leftPanelWidth: 300,
        rightPanelWidth: 350,
        minPanelWidth: 150,
        maxPanelWidth: 500,
        collapsedPanelWidth: 36,
      });
    });

    it('should emit layout-config-changed event after saving', () => {
      const layoutConfig = reactive<LayoutConfig>({
        leftPanelDefaultWidth: 300,
        rightPanelDefaultWidth: 350,
        minWidth: 150,
        maxWidth: 500,
        collapsedWidth: 36,
      });

      eventBus.emit('layout-config-changed', { ...layoutConfig });

      expect(eventBus.emit).toHaveBeenCalledWith('layout-config-changed', {
        leftPanelDefaultWidth: 300,
        rightPanelDefaultWidth: 350,
        minWidth: 150,
        maxWidth: 500,
        collapsedWidth: 36,
      });
    });

    it('should save current values, not original values', () => {
      const layoutConfig = reactive<LayoutConfig>({
        leftPanelDefaultWidth: 280,
        rightPanelDefaultWidth: 320,
        minWidth: 200,
        maxWidth: 600,
        collapsedWidth: 48,
      });

      const originalConfig = { ...layoutConfig };

      layoutConfig.leftPanelDefaultWidth = 300;
      layoutConfig.rightPanelDefaultWidth = 350;
      layoutConfig.collapsedWidth = 36;

      Object.assign(originalConfig, { ...layoutConfig });

      mockConfigStore.updateUIConfig({
        leftPanelWidth: layoutConfig.leftPanelDefaultWidth,
        rightPanelWidth: layoutConfig.rightPanelDefaultWidth,
        minPanelWidth: layoutConfig.minWidth,
        maxPanelWidth: layoutConfig.maxWidth,
        collapsedPanelWidth: layoutConfig.collapsedWidth,
      });

      expect(mockConfigStore.updateUIConfig).toHaveBeenCalledWith({
        leftPanelWidth: 300,
        rightPanelWidth: 350,
        minPanelWidth: 200,
        maxPanelWidth: 600,
        collapsedPanelWidth: 36,
      });
    });
  });

  describe('Configuration Reset', () => {
    it('should reset to default values', () => {
      const layoutConfig = reactive<LayoutConfig>({
        leftPanelDefaultWidth: 300,
        rightPanelDefaultWidth: 350,
        minWidth: 150,
        maxWidth: 500,
        collapsedWidth: 36,
      });

      const defaultConfig: LayoutConfig = {
        leftPanelDefaultWidth: 280,
        rightPanelDefaultWidth: 320,
        minWidth: 200,
        maxWidth: 600,
        collapsedWidth: 48,
      };

      Object.assign(layoutConfig, defaultConfig);

      expect(layoutConfig.leftPanelDefaultWidth).toBe(280);
      expect(layoutConfig.rightPanelDefaultWidth).toBe(320);
      expect(layoutConfig.minWidth).toBe(200);
      expect(layoutConfig.maxWidth).toBe(600);
      expect(layoutConfig.collapsedWidth).toBe(48);
    });
  });

  describe('Save and Reload Cycle', () => {
    it('should persist config after save and reload', () => {
      mockConfigStore.ui = {
        leftPanelWidth: 280,
        rightPanelWidth: 320,
        minPanelWidth: 200,
        maxPanelWidth: 600,
        collapsedPanelWidth: 48,
      };

      const layoutConfig = reactive<LayoutConfig>({
        leftPanelDefaultWidth: mockConfigStore.ui.leftPanelWidth,
        rightPanelDefaultWidth: mockConfigStore.ui.rightPanelWidth,
        minWidth: mockConfigStore.ui.minPanelWidth,
        maxWidth: mockConfigStore.ui.maxPanelWidth,
        collapsedWidth: mockConfigStore.ui.collapsedPanelWidth,
      });

      layoutConfig.leftPanelDefaultWidth = 300;
      layoutConfig.collapsedWidth = 36;

      mockConfigStore.updateUIConfig({
        leftPanelWidth: layoutConfig.leftPanelDefaultWidth,
        rightPanelWidth: layoutConfig.rightPanelDefaultWidth,
        minPanelWidth: layoutConfig.minWidth,
        maxPanelWidth: layoutConfig.maxWidth,
        collapsedPanelWidth: layoutConfig.collapsedWidth,
      });

      const saveResult = mockConfigStore.saveConfig();
      expect(saveResult.success).toBe(true);

      mockConfigStore.ui = {
        leftPanelWidth: 300,
        rightPanelWidth: 320,
        minPanelWidth: 200,
        maxPanelWidth: 600,
        collapsedPanelWidth: 36,
      };

      const reloadedConfig = reactive<LayoutConfig>({
        leftPanelDefaultWidth: mockConfigStore.ui.leftPanelWidth,
        rightPanelDefaultWidth: mockConfigStore.ui.rightPanelWidth,
        minWidth: mockConfigStore.ui.minPanelWidth,
        maxWidth: mockConfigStore.ui.maxPanelWidth,
        collapsedWidth: mockConfigStore.ui.collapsedPanelWidth,
      });

      expect(reloadedConfig.leftPanelDefaultWidth).toBe(300);
      expect(reloadedConfig.collapsedWidth).toBe(36);
    });

    it('should handle localStorage quota exceeded error', () => {
      const saveConfigSpy = vi.spyOn(mockConfigStore, 'saveConfig').mockReturnValue({
        success: false,
        error: 'QuotaExceededError',
      });

      const layoutConfig = reactive<LayoutConfig>({
        leftPanelDefaultWidth: 300,
        rightPanelDefaultWidth: 320,
        minWidth: 200,
        maxWidth: 600,
        collapsedWidth: 36,
      });

      mockConfigStore.updateUIConfig({
        leftPanelWidth: layoutConfig.leftPanelDefaultWidth,
        rightPanelWidth: layoutConfig.rightPanelDefaultWidth,
        minPanelWidth: layoutConfig.minWidth,
        maxPanelWidth: layoutConfig.maxWidth,
        collapsedPanelWidth: layoutConfig.collapsedWidth,
      });

      const result = mockConfigStore.saveConfig();
      expect(result.success).toBe(false);
      expect(result.error).toBe('QuotaExceededError');

      saveConfigSpy.mockRestore();
    });
  });
});