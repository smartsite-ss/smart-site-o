// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import { ZoomManager } from '../../canvas-page/managers/ZoomManager';
import type { FitMode } from '../../canvas-page/managers/ZoomManager';

describe('FitMode', () => {
  describe('FitMode type values', () => {
    it('should have valid FitMode values', () => {
      const modes: FitMode[] = ['auto', 'contain', 'fitWidth', 'fitHeight', 'stretch'];
      expect(modes).toHaveLength(5);
    });
  });

  describe('autoSelectFitMode', () => {
    it('should return fitHeight for portrait screens', () => {
      const result = ZoomManager.autoSelectFitMode(0.75);
      expect(result).toBe('fitHeight');
    });

    it('should return contain for roughly square screens', () => {
      const result = ZoomManager.autoSelectFitMode(1.2);
      expect(result).toBe('contain');
    });

    it('should return fitWidth for wide screens', () => {
      const result = ZoomManager.autoSelectFitMode(2.0);
      expect(result).toBe('fitWidth');
    });
  });

  describe('calculateFitScale', () => {
    const contentWidth = 1000;
    const contentHeight = 800;
    const viewportWidth = 1200;
    const viewportHeight = 900;

    it('should calculate contain mode scale (min ratio)', () => {
      const scale = ZoomManager.calculateFitScale('contain', contentWidth, contentHeight, viewportWidth, viewportHeight);
      expect(scale).toBeLessThanOrEqual(150);
      expect(scale).toBeGreaterThan(0);
    });

    it('should calculate fitWidth mode scale', () => {
      const scale = ZoomManager.calculateFitScale('fitWidth', contentWidth, contentHeight, viewportWidth, viewportHeight);
      expect(scale).toBe(120);
    });

    it('should calculate fitHeight mode scale', () => {
      const scale = ZoomManager.calculateFitScale('fitHeight', contentWidth, contentHeight, viewportWidth, viewportHeight);
      expect(scale).toBe(112.5);
    });

    it('should return 100 for default auto mode', () => {
      const scale = ZoomManager.calculateFitScale('auto', contentWidth, contentHeight, viewportWidth, viewportHeight);
      expect(scale).toBe(100);
    });
  });

  describe('calculateScaleByMode', () => {
    const contentWidth = 1000;
    const contentHeight = 800;
    const viewportWidth = 1200;
    const viewportHeight = 900;

    it('should auto select for auto mode', () => {
      const result = ZoomManager.calculateScaleByMode('auto', contentWidth, contentHeight, viewportWidth, viewportHeight);
      expect(result.fitMode).toBeTruthy();
      expect(typeof result.scale).toBe('number');
    });

    it('should respect explicit mode', () => {
      const result = ZoomManager.calculateScaleByMode('fitWidth', contentWidth, contentHeight, viewportWidth, viewportHeight);
      expect(result.fitMode).toBe('fitWidth');
      expect(result.scale).toBe(120);
    });
  });
});