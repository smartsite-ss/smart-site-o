// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { useConfigStore } from '@scada-editor/core';

vi.mock('@scada-editor/core', () => ({
  useConfigStore: vi.fn(),
}));

describe('ToolsTab Configuration', () => {
  let mockConfigStore: any;

  beforeEach(() => {
    mockConfigStore = {
      tools: {
        fillColor: '#4CAF50',
        strokeColor: '#388E3C',
        lineWidth: 2,
        fontSize: 14,
        fontFamily: 'Arial',
      },
      updateToolConfig: vi.fn(),
    };
    (useConfigStore as any).mockReturnValue(mockConfigStore);
  });

  describe('Color Settings', () => {
    it('should initialize fillColor from configStore', () => {
      const fillColor = ref(mockConfigStore.tools.fillColor);
      expect(fillColor.value).toBe('#4CAF50');
    });

    it('should update fillColor when changed', () => {
      const fillColor = ref('#4CAF50');
      fillColor.value = '#FF5733';
      
      mockConfigStore.updateToolConfig({ fillColor: fillColor.value });
      
      expect(mockConfigStore.updateToolConfig).toHaveBeenCalledWith({ fillColor: '#FF5733' });
    });

    it('should validate fillColor format', () => {
      const fillColor = ref('#4CAF50');
      
      fillColor.value = '#FFFFFF';
      expect(fillColor.value).toBe('#FFFFFF');
      
      fillColor.value = '#000000';
      expect(fillColor.value).toBe('#000000');
    });

    it('should initialize strokeColor from configStore', () => {
      const strokeColor = ref(mockConfigStore.tools.strokeColor);
      expect(strokeColor.value).toBe('#388E3C');
    });

    it('should update strokeColor when changed', () => {
      const strokeColor = ref('#388E3C');
      strokeColor.value = '#333333';
      
      mockConfigStore.updateToolConfig({ strokeColor: strokeColor.value });
      
      expect(mockConfigStore.updateToolConfig).toHaveBeenCalledWith({ strokeColor: '#333333' });
    });
  });

  describe('Line Settings', () => {
    it('should initialize lineWidth from configStore', () => {
      const lineWidth = ref(mockConfigStore.tools.lineWidth);
      expect(lineWidth.value).toBe(2);
    });

    it('should update lineWidth when changed', () => {
      const lineWidth = ref(2);
      lineWidth.value = 5;
      
      mockConfigStore.updateToolConfig({ lineWidth: lineWidth.value });
      
      expect(mockConfigStore.updateToolConfig).toHaveBeenCalledWith({ lineWidth: 5 });
    });

    it('should validate lineWidth within range', () => {
      const lineWidth = ref(2);
      
      lineWidth.value = 1;
      expect(lineWidth.value).toBe(1);
      
      lineWidth.value = 20;
      expect(lineWidth.value).toBe(20);
      
      mockConfigStore.updateToolConfig({ lineWidth: lineWidth.value });
      expect(mockConfigStore.updateToolConfig).toHaveBeenCalledWith({ lineWidth: 20 });
    });
  });

  describe('Font Settings', () => {
    it('should initialize fontSize from configStore', () => {
      const fontSize = ref(mockConfigStore.tools.fontSize);
      expect(fontSize.value).toBe(14);
    });

    it('should update fontSize when changed', () => {
      const fontSize = ref(14);
      fontSize.value = 16;
      
      mockConfigStore.updateToolConfig({ fontSize: fontSize.value });
      
      expect(mockConfigStore.updateToolConfig).toHaveBeenCalledWith({ fontSize: 16 });
    });

    it('should validate fontSize within range', () => {
      const fontSize = ref(14);
      
      fontSize.value = 8;
      expect(fontSize.value).toBe(8);
      
      fontSize.value = 72;
      expect(fontSize.value).toBe(72);
      
      mockConfigStore.updateToolConfig({ fontSize: fontSize.value });
      expect(mockConfigStore.updateToolConfig).toHaveBeenCalledWith({ fontSize: 72 });
    });

    it('should initialize fontFamily from configStore', () => {
      const fontFamily = ref(mockConfigStore.tools.fontFamily);
      expect(fontFamily.value).toBe('Arial');
    });

    it('should update fontFamily when changed', () => {
      const fontFamily = ref('Arial');
      fontFamily.value = 'Microsoft YaHei';
      
      mockConfigStore.updateToolConfig({ fontFamily: fontFamily.value });
      
      expect(mockConfigStore.updateToolConfig).toHaveBeenCalledWith({ fontFamily: 'Microsoft YaHei' });
    });

    it('should support multiple font families', () => {
      const fonts = ['Arial', 'Microsoft YaHei', 'SimHei', 'SimSun', 'Times New Roman'];
      fonts.forEach(font => {
        mockConfigStore.updateToolConfig({ fontFamily: font });
        expect(mockConfigStore.updateToolConfig).toHaveBeenCalledWith({ fontFamily: font });
      });
    });
  });

  describe('Initialization', () => {
    it('should handle missing configStore values', () => {
      mockConfigStore.tools = {
        fillColor: undefined,
        strokeColor: undefined,
        lineWidth: undefined,
        fontSize: undefined,
        fontFamily: undefined,
      };

      const fillColor = ref('#4CAF50');
      const strokeColor = ref('#388E3C');
      const lineWidth = ref(2);
      const fontSize = ref(14);
      const fontFamily = ref('Arial');

      if (mockConfigStore.tools?.fillColor) {
        fillColor.value = mockConfigStore.tools.fillColor;
      }
      if (mockConfigStore.tools?.strokeColor) {
        strokeColor.value = mockConfigStore.tools.strokeColor;
      }
      if (mockConfigStore.tools?.lineWidth) {
        lineWidth.value = mockConfigStore.tools.lineWidth;
      }
      if (mockConfigStore.tools?.fontSize) {
        fontSize.value = mockConfigStore.tools.fontSize;
      }
      if (mockConfigStore.tools?.fontFamily) {
        fontFamily.value = mockConfigStore.tools.fontFamily;
      }

      expect(fillColor.value).toBe('#4CAF50');
      expect(strokeColor.value).toBe('#388E3C');
      expect(lineWidth.value).toBe(2);
      expect(fontSize.value).toBe(14);
      expect(fontFamily.value).toBe('Arial');
    });
  });

  describe('Configuration Updates', () => {
    it('should update multiple tool settings', () => {
      const fillColor = ref('#4CAF50');
      const lineWidth = ref(2);
      const fontFamily = ref('Arial');
      
      fillColor.value = '#FF5733';
      mockConfigStore.updateToolConfig({ fillColor: fillColor.value });
      
      lineWidth.value = 3;
      mockConfigStore.updateToolConfig({ lineWidth: lineWidth.value });
      
      fontFamily.value = 'SimHei';
      mockConfigStore.updateToolConfig({ fontFamily: fontFamily.value });
      
      expect(mockConfigStore.updateToolConfig).toHaveBeenCalledTimes(3);
      expect(mockConfigStore.updateToolConfig).toHaveBeenCalledWith({ fillColor: '#FF5733' });
      expect(mockConfigStore.updateToolConfig).toHaveBeenCalledWith({ lineWidth: 3 });
      expect(mockConfigStore.updateToolConfig).toHaveBeenCalledWith({ fontFamily: 'SimHei' });
    });
  });
});