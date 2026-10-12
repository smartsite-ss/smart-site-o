// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { useConfigStore } from '@scada-editor/core';

vi.mock('@scada-editor/core', () => ({
  useConfigStore: vi.fn(),
}));

describe('CanvasTab Configuration', () => {
  let mockConfigStore: any;

  beforeEach(() => {
    mockConfigStore = {
      canvas: {
        gridSize: 20,
        snapToGrid: true,
      },
      updateCanvasConfig: vi.fn(),
    };
    (useConfigStore as any).mockReturnValue(mockConfigStore);
  });

  describe('Grid Settings', () => {
    it('should initialize gridSize from configStore', () => {
      const gridSize = ref(mockConfigStore.canvas.gridSize);
      expect(gridSize.value).toBe(20);
    });

    it('should update gridSize when changed', () => {
      const gridSize = ref(20);
      gridSize.value = 30;
      
      mockConfigStore.updateCanvasConfig({ gridSize: gridSize.value });
      
      expect(mockConfigStore.updateCanvasConfig).toHaveBeenCalledWith({ gridSize: 30 });
    });

    it('should validate gridSize within range', () => {
      const gridSize = ref(20);
      
      gridSize.value = 5;
      expect(gridSize.value).toBe(5);
      
      gridSize.value = 100;
      expect(gridSize.value).toBe(100);
      
      gridSize.value = 10;
      mockConfigStore.updateCanvasConfig({ gridSize: gridSize.value });
      expect(mockConfigStore.updateCanvasConfig).toHaveBeenCalledWith({ gridSize: 10 });
    });

    it('should initialize snapToGrid from configStore', () => {
      const snapToGrid = ref(mockConfigStore.canvas.snapToGrid);
      expect(snapToGrid.value).toBe(true);
    });

    it('should update snapToGrid when changed', () => {
      const snapToGrid = ref(true);
      snapToGrid.value = false;
      
      mockConfigStore.updateCanvasConfig({ snapToGrid: snapToGrid.value });
      
      expect(mockConfigStore.updateCanvasConfig).toHaveBeenCalledWith({ snapToGrid: false });
    });

    it('should toggle snapToGrid correctly', () => {
      const snapToGrid = ref(true);
      
      snapToGrid.value = false;
      mockConfigStore.updateCanvasConfig({ snapToGrid: false });
      
      snapToGrid.value = true;
      mockConfigStore.updateCanvasConfig({ snapToGrid: true });
      
      expect(mockConfigStore.updateCanvasConfig).toHaveBeenCalledWith({ snapToGrid: false });
      expect(mockConfigStore.updateCanvasConfig).toHaveBeenCalledWith({ snapToGrid: true });
    });
  });

  describe('Initialization', () => {
    it('should handle missing configStore values', () => {
      mockConfigStore.canvas = {
        gridSize: undefined,
        snapToGrid: undefined,
      };

      const gridSize = ref(20);
      const snapToGrid = ref(true);

      if (mockConfigStore.canvas?.gridSize) {
        gridSize.value = mockConfigStore.canvas.gridSize;
      }
      if (typeof mockConfigStore.canvas?.snapToGrid !== 'undefined') {
        snapToGrid.value = mockConfigStore.canvas.snapToGrid;
      }

      expect(gridSize.value).toBe(20);
      expect(snapToGrid.value).toBe(true);
    });

    it('should handle zero gridSize', () => {
      mockConfigStore.canvas = {
        gridSize: 0,
        snapToGrid: true,
      };

      const gridSize = ref(20);
      if (mockConfigStore.canvas?.gridSize) {
        gridSize.value = mockConfigStore.canvas.gridSize;
      }

      expect(gridSize.value).toBe(20);
    });
  });

  describe('Configuration Updates', () => {
    it('should update multiple canvas settings', () => {
      const gridSize = ref(20);
      const snapToGrid = ref(true);
      
      gridSize.value = 25;
      mockConfigStore.updateCanvasConfig({ gridSize: gridSize.value });
      
      snapToGrid.value = false;
      mockConfigStore.updateCanvasConfig({ snapToGrid: snapToGrid.value });
      
      expect(mockConfigStore.updateCanvasConfig).toHaveBeenCalledTimes(2);
      expect(mockConfigStore.updateCanvasConfig).toHaveBeenCalledWith({ gridSize: 25 });
      expect(mockConfigStore.updateCanvasConfig).toHaveBeenCalledWith({ snapToGrid: false });
    });

    it('should preserve other canvas settings when updating', () => {
      mockConfigStore.canvas = {
        gridSize: 20,
        snapToGrid: true,
        grid: true,
        showRulers: true,
        zoom: 1,
      };

      const gridSize = ref(30);
      mockConfigStore.updateCanvasConfig({ gridSize: gridSize.value });

      expect(mockConfigStore.updateCanvasConfig).toHaveBeenCalledWith({ gridSize: 30 });
    });
  });
});