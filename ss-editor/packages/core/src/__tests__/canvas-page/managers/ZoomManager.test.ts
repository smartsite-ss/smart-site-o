// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, afterEach } from 'vitest';
import { ZoomManager, ZoomMode, FitMode, defaultAutoFitConfig, AutoFitConfig } from '../../../canvas-page/managers/ZoomManager';

describe('ZoomManager', () => {
  describe('calculateZoomOffset', () => {
    it('should calculate offset for MOUSE_CENTER mode', () => {
      const result = ZoomManager.calculateZoomOffset(100, 200, ZoomMode.MOUSE_CENTER, 400, 300, 800, 600);
      expect(result.offsetX).toBe(400 - (400 * 2));
      expect(result.offsetY).toBe(300 - (300 * 2));
    });

    it('should calculate offset for CANVAS_CENTER mode', () => {
      const result = ZoomManager.calculateZoomOffset(100, 200, ZoomMode.CANVAS_CENTER, 0, 0, 800, 600);
      expect(result.offsetX).toBe(400 - (400 * 2));
      expect(result.offsetY).toBe(300 - (300 * 2));
    });

    it('should calculate offset for TOP_LEFT mode', () => {
      const result = ZoomManager.calculateZoomOffset(100, 200, ZoomMode.TOP_LEFT, 0, 0, 800, 600);
      expect(result.offsetX).toBe(0);
      expect(result.offsetY).toBe(0);
    });
  });

  describe('clampScale', () => {
    it('should clamp scale within min/max bounds', () => {
      expect(ZoomManager.clampScale(50, 10, 200)).toBe(50);
      expect(ZoomManager.clampScale(5, 10, 200)).toBe(10);
      expect(ZoomManager.clampScale(300, 10, 200)).toBe(200);
    });

    it('should use default bounds when not specified', () => {
      expect(ZoomManager.clampScale(5)).toBe(10);
      expect(ZoomManager.clampScale(300)).toBe(200);
    });
  });

  describe('calculateScaledSize', () => {
    it('should calculate scaled size correctly', () => {
      const result = ZoomManager.calculateScaledSize(800, 600, 150);
      expect(result.width).toBe(1200);
      expect(result.height).toBe(900);
    });
  });

  describe('scalePoint / unscalePoint', () => {
    it('should scale point coordinates', () => {
      const result = ZoomManager.scalePoint(100, 200, 200);
      expect(result.x).toBe(200);
      expect(result.y).toBe(400);
    });

    it('should unscale point coordinates', () => {
      const result = ZoomManager.unscalePoint(200, 400, 200);
      expect(result.x).toBe(100);
      expect(result.y).toBe(200);
    });
  });

  describe('default zoom params', () => {
    it('should get and set default zoom params', () => {
      const defaults = ZoomManager.getDefaultZoomParams();
      expect(defaults.minScale).toBe(10);
      expect(defaults.maxScale).toBe(200);
      expect(defaults.step).toBe(10);

      ZoomManager.setDefaultZoomParams(5, 500, 25);
      const updated = ZoomManager.getDefaultZoomParams();
      expect(updated.minScale).toBe(5);
      expect(updated.maxScale).toBe(500);
      expect(updated.step).toBe(25);

      ZoomManager.setDefaultZoomParams(10, 200, 10);
    });
  });

  describe('autoSelectFitMode', () => {
    it('should return fitHeight for portrait (aspectRatio < 1.0)', () => {
      const result = ZoomManager.autoSelectFitMode(0.5, defaultAutoFitConfig);
      expect(result).toBe('fitHeight');
    });

    it('should return contain for near-square (1.0 <= aspectRatio < 1.5)', () => {
      const result = ZoomManager.autoSelectFitMode(1.2, defaultAutoFitConfig);
      expect(result).toBe('contain');
    });

    it('should return fitWidth for widescreen (aspectRatio >= 1.5)', () => {
      const result = ZoomManager.autoSelectFitMode(1.6, defaultAutoFitConfig);
      expect(result).toBe('fitWidth');
    });

    it('should respect custom thresholds in config', () => {
      const customConfig: AutoFitConfig = { enabled: true, debounceDelay: 300, minAspectRatio: 0.8, maxAspectRatio: 2.0 };
      expect(ZoomManager.autoSelectFitMode(0.7, customConfig)).toBe('fitHeight');
      expect(ZoomManager.autoSelectFitMode(1.5, customConfig)).toBe('contain');
      expect(ZoomManager.autoSelectFitMode(2.5, customConfig)).toBe('fitWidth');
    });
  });

  describe('calculateFitScale', () => {
    it('should calculate contain scale', () => {
      const scale = ZoomManager.calculateFitScale('contain', 800, 600, 400, 300);
      expect(scale).toBe(50);
    });

    it('should calculate fitWidth scale', () => {
      const scale = ZoomManager.calculateFitScale('fitWidth', 800, 600, 1600, 1200);
      expect(scale).toBe(200);
    });

    it('should calculate fitHeight scale', () => {
      const scale = ZoomManager.calculateFitScale('fitHeight', 800, 600, 1600, 1200);
      expect(scale).toBe(200);
    });

    it('should calculate stretch scale', () => {
      const scale = ZoomManager.calculateFitScale('stretch', 800, 600, 1600, 1200);
      expect(scale).toBe(200);
    });

    it('should return 100 for unknown mode', () => {
      const scale = ZoomManager.calculateFitScale('unknown' as FitMode, 800, 600, 1600, 1200);
      expect(scale).toBe(100);
    });
  });

  describe('calculateAutoFitScale', () => {
    it('should calculate auto fit scale for widescreen', () => {
      const result = ZoomManager.calculateAutoFitScale(800, 600, 1600, 900, defaultAutoFitConfig);
      expect(result.fitMode).toBe('fitWidth');
      expect(result.scale).toBe(200);
    });

    it('should calculate auto fit scale for portrait', () => {
      const result = ZoomManager.calculateAutoFitScale(800, 600, 400, 900, defaultAutoFitConfig);
      expect(result.fitMode).toBe('fitHeight');
      expect(result.scale).toBe(150);
    });

    it('should clamp scale to min/max bounds', () => {
      const result = ZoomManager.calculateAutoFitScale(800, 600, 10, 10, defaultAutoFitConfig);
      expect(result.scale).toBeGreaterThanOrEqual(10);
      expect(result.scale).toBeLessThanOrEqual(200);
    });
  });

  describe('calculateScaleByMode', () => {
    it('should delegate to calculateAutoFitScale for auto mode', () => {
      const result = ZoomManager.calculateScaleByMode('auto', 800, 600, 1600, 900, defaultAutoFitConfig);
      expect(result.fitMode).toBe('fitWidth');
      expect(result.scale).toBe(200);
    });

    it('should use specified mode directly', () => {
      const result = ZoomManager.calculateScaleByMode('contain', 800, 600, 1600, 900, defaultAutoFitConfig);
      expect(result.fitMode).toBe('contain');
      expect(result.scale).toBe(150);
    });

    it('should clamp scale result', () => {
      const result = ZoomManager.calculateScaleByMode('fitWidth', 800, 600, 10, 10, defaultAutoFitConfig);
      expect(result.scale).toBeGreaterThanOrEqual(10);
    });
  });

  describe('scaleRange override', () => {
    it('calculateScaleByMode should clamp to custom maxScale', () => {
      // fitWidth 原始 scale = 1600/800*100 = 200，超过自定义上限 150
      const result = ZoomManager.calculateScaleByMode(
        'fitWidth', 800, 600, 1600, 1200, defaultAutoFitConfig,
        { minScale: 20, maxScale: 150 },
      );
      expect(result.scale).toBe(150);
    });

    it('calculateScaleByMode should clamp to custom minScale', () => {
      // contain 原始 scale = 400/800*100 = 50，低于自定义下限 80
      const result = ZoomManager.calculateScaleByMode(
        'contain', 800, 600, 400, 300, defaultAutoFitConfig,
        { minScale: 80, maxScale: 300 },
      );
      expect(result.scale).toBe(80);
    });

    it('calculateAutoFitScale should clamp to custom scaleRange in auto mode', () => {
      // 宽屏 auto → fitWidth，原始 scale = 200，超过自定义上限 120
      const result = ZoomManager.calculateAutoFitScale(
        800, 600, 1600, 900, defaultAutoFitConfig,
        { minScale: 20, maxScale: 120 },
      );
      expect(result.fitMode).toBe('fitWidth');
      expect(result.scale).toBe(120);
    });

    it('should fall back to internal defaults (10~200) when scaleRange omitted', () => {
      // fitWidth 原始 200 恰好等于内部默认上限，不 clamp
      const result = ZoomManager.calculateScaleByMode('fitWidth', 800, 600, 1600, 1200, defaultAutoFitConfig);
      expect(result.scale).toBe(200);
      // 超大屏：fitWidth 原始 400 → clamp 到内部默认上限 200
      const oversized = ZoomManager.calculateScaleByMode('fitWidth', 800, 600, 3200, 1200, defaultAutoFitConfig);
      expect(oversized.scale).toBe(200);
    });
  });

  describe('FitMode overflow protection', () => {
    it('fitWidth should detect overflow on ultrawide screen (1920x1080 page, 2560x800 viewport)', () => {
      const fitWidthScale = ZoomManager.calculateFitScale('fitWidth', 1920, 1080, 2560, 800);
      const containScale = ZoomManager.calculateFitScale('contain', 1920, 1080, 2560, 800);
      expect(fitWidthScale).toBeGreaterThan(containScale);
      expect(containScale).toBeCloseTo(74.07, 2);
    });

    it('fitWidth should NOT overflow when viewport matches page ratio (1920x1080, 1600x900)', () => {
      const fitWidthScale = ZoomManager.calculateFitScale('fitWidth', 1920, 1080, 1600, 900);
      const containScale = ZoomManager.calculateFitScale('contain', 1920, 1080, 1600, 900);
      expect(fitWidthScale).toBeCloseTo(containScale, 1);
    });

    it('fitHeight should detect overflow on tall screen (800x1200 page, 400x900 viewport)', () => {
      const fitHeightScale = ZoomManager.calculateFitScale('fitHeight', 800, 1200, 400, 900);
      const containScale = ZoomManager.calculateFitScale('contain', 800, 1200, 400, 900);
      expect(fitHeightScale).toBeGreaterThan(containScale);
    });

    it('fitHeight should NOT overflow when viewport ratio allows (800x600 page, 400x300 viewport)', () => {
      const fitHeightScale = ZoomManager.calculateFitScale('fitHeight', 800, 600, 400, 300);
      const containScale = ZoomManager.calculateFitScale('contain', 800, 600, 400, 300);
      expect(fitHeightScale).toBeCloseTo(containScale, 1);
    });

    it('contain mode scale should be min of fitWidth and fitHeight scales', () => {
      const pageW = 1920, pageH = 1080, vw = 2560, vh = 800;
      const fitWidthScale = ZoomManager.calculateFitScale('fitWidth', pageW, pageH, vw, vh);
      const fitHeightScale = ZoomManager.calculateFitScale('fitHeight', pageW, pageH, vw, vh);
      const containScale = ZoomManager.calculateFitScale('contain', pageW, pageH, vw, vh);
      expect(containScale).toBe(Math.min(fitWidthScale, fitHeightScale));
    });

    it('auto mode on ultrawide should pick fitWidth which would overflow', () => {
      const result = ZoomManager.calculateAutoFitScale(1920, 1080, 2560, 800, defaultAutoFitConfig);
      expect(result.fitMode).toBe('fitWidth');
      const containScale = ZoomManager.calculateFitScale('contain', 1920, 1080, 2560, 800);
      expect(result.scale).toBeGreaterThan(containScale);
    });
  });

  describe('isWideScreen / isPortrait', () => {
    const originalInnerWidth = window.innerWidth;
    const originalInnerHeight = window.innerHeight;

    afterEach(() => {
      Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: originalInnerHeight, configurable: true });
    });

    it('should detect widescreen correctly', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1920, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 1080, configurable: true });
      expect(ZoomManager.isWideScreen()).toBe(true);
    });

    it('should detect portrait correctly', () => {
      Object.defineProperty(window, 'innerWidth', { value: 600, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 900, configurable: true });
      expect(ZoomManager.isPortrait()).toBe(true);
    });

    it('should return false for isPortrait in widescreen', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1920, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 1080, configurable: true });
      expect(ZoomManager.isPortrait()).toBe(false);
    });

    it('should use custom threshold for isWideScreen', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1200, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 1000, configurable: true });
      expect(ZoomManager.isWideScreen(1.0)).toBe(true);
      expect(ZoomManager.isWideScreen(1.5)).toBe(false);
    });
  });
});