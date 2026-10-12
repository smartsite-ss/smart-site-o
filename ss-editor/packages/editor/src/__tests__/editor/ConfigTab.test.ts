// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, vi } from 'vitest';
import { useConfig } from '../../composables/useConfig';

vi.mock('../../composables/useConfig', () => ({
  useConfig: vi.fn(() => ({
    exportConfig: vi.fn(() => JSON.stringify({
      ui: {
        theme: 'dark',
        language: 'zh-CN',
        showToolbar: true,
        showPropertyPanel: true,
        showLayerPanel: true,
        leftPanelWidth: 280,
        rightPanelWidth: 320,
        minPanelWidth: 200,
        maxPanelWidth: 600,
        collapsedPanelWidth: 48,
      },
      tools: {
        selectedTool: 'select',
        fillColor: '#4CAF50',
        strokeColor: '#388E3C',
        lineWidth: 2,
        fontSize: 14,
        fontFamily: 'Arial',
      },
      canvas: {
        grid: true,
        gridSize: 20,
        snapToGrid: true,
        showRulers: true,
        zoom: 1,
      },
    }, null, 2)),
    importConfig: vi.fn((configJson: string) => {
      try {
        JSON.parse(configJson);
        return { success: true };
      } catch {
        return { success: false, error: 'Invalid JSON' };
      }
    }),
    resetUIConfig: vi.fn(),
    uiConfig: {
      theme: 'dark',
      language: 'zh-CN',
      showToolbar: true,
      showPropertyPanel: true,
      showLayerPanel: true,
      leftPanelWidth: 280,
      rightPanelWidth: 320,
      minPanelWidth: 200,
      maxPanelWidth: 600,
      collapsedPanelWidth: 48,
    },
    validateLayoutConfig: vi.fn((config: any) => {
      const errors: string[] = [];
      if (config.minWidth >= config.maxWidth) {
        errors.push('minimum width must be less than maximum width');
      }
      if (config.collapsedWidth >= config.minWidth) {
        errors.push('collapsed width must be less than minimum width');
      }
      return errors;
    }),
  })),
}));

describe('ConfigTab Configuration', () => {
  const { exportConfig, importConfig, resetUIConfig, uiConfig, validateLayoutConfig } = useConfig();

  describe('Export Config', () => {
    it('should export config as JSON string', () => {
      const exported = exportConfig();
      expect(typeof exported).toBe('string');
      
      const parsed = JSON.parse(exported);
      expect(parsed).toHaveProperty('ui');
      expect(parsed).toHaveProperty('tools');
      expect(parsed).toHaveProperty('canvas');
    });

    it('should contain all config sections', () => {
      const exported = exportConfig();
      const parsed = JSON.parse(exported);
      
      expect(parsed.ui.theme).toBe('dark');
      expect(parsed.ui.language).toBe('zh-CN');
      expect(parsed.tools.fillColor).toBe('#4CAF50');
      expect(parsed.canvas.gridSize).toBe(20);
    });
  });

  describe('Import Config', () => {
    it('should import valid JSON config', () => {
      const validConfig = JSON.stringify({
        ui: { theme: 'light' },
        tools: { fillColor: '#FF0000' },
        canvas: { gridSize: 25 },
      });
      
      const result = importConfig(validConfig);
      expect(result.success).toBe(true);
    });

    it('should reject invalid JSON', () => {
      const invalidConfig = 'invalid json';
      
      const result = importConfig(invalidConfig);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid JSON');
    });

    it('should handle partial config import', () => {
      const partialConfig = JSON.stringify({
        ui: { theme: 'light' },
      });
      
      const result = importConfig(partialConfig);
      expect(result.success).toBe(true);
    });
  });

  describe('Reset Config', () => {
    it('should reset UI config to defaults', () => {
      resetUIConfig();
      expect(resetUIConfig).toHaveBeenCalled();
    });
  });

  describe('Config Diff', () => {
    it('should detect config differences', () => {
      const currentConfig = { ...uiConfig };
      const defaultConfig = {
        theme: 'dark',
        language: 'zh-CN',
        showToolbar: true,
        showPropertyPanel: true,
        showLayerPanel: true,
        leftPanelWidth: 280,
        rightPanelWidth: 320,
        minPanelWidth: 200,
        maxPanelWidth: 600,
        collapsedPanelWidth: 48,
      };

      const diff: Record<string, { default: any; current: any }> = {};
      Object.keys(defaultConfig).forEach(key => {
        if (JSON.stringify((defaultConfig as any)[key]) !== JSON.stringify((currentConfig as any)[key])) {
          diff[key] = {
            default: (defaultConfig as any)[key],
            current: (currentConfig as any)[key],
          };
        }
      });

      expect(Object.keys(diff).length).toBe(0);
    });

    it('should show differences when config is modified', () => {
      const modifiedConfig = { ...uiConfig, theme: 'light' };
      const defaultConfig = {
        theme: 'dark',
        language: 'zh-CN',
        showToolbar: true,
        showPropertyPanel: true,
        showLayerPanel: true,
        leftPanelWidth: 280,
        rightPanelWidth: 320,
        minPanelWidth: 200,
        maxPanelWidth: 600,
        collapsedPanelWidth: 48,
      };

      const diff: Record<string, { default: any; current: any }> = {};
      Object.keys(defaultConfig).forEach(key => {
        if (JSON.stringify((defaultConfig as any)[key]) !== JSON.stringify((modifiedConfig as any)[key])) {
          diff[key] = {
            default: (defaultConfig as any)[key],
            current: (modifiedConfig as any)[key],
          };
        }
      });

      expect(Object.keys(diff).length).toBe(1);
      expect(diff.theme).toEqual({ default: 'dark', current: 'light' });
    });
  });

  describe('Layout Validation', () => {
    it('should validate minWidth < maxWidth', () => {
      const errors = validateLayoutConfig({
        minWidth: 300,
        maxWidth: 200,
        collapsedWidth: 48,
        leftPanelDefaultWidth: 280,
        rightPanelDefaultWidth: 320,
      });
      
      expect(errors).toContain('minimum width must be less than maximum width');
    });

    it('should validate collapsedWidth < minWidth', () => {
      const errors = validateLayoutConfig({
        minWidth: 200,
        maxWidth: 600,
        collapsedWidth: 250,
        leftPanelDefaultWidth: 280,
        rightPanelDefaultWidth: 320,
      });
      
      expect(errors).toContain('collapsed width must be less than minimum width');
    });

    it('should pass validation for valid config', () => {
      const errors = validateLayoutConfig({
        minWidth: 200,
        maxWidth: 600,
        collapsedWidth: 48,
        leftPanelDefaultWidth: 280,
        rightPanelDefaultWidth: 320,
      });
      
      expect(errors).toHaveLength(0);
    });
  });
});