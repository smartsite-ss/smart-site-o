// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import { getAnimationTransform } from '../../animations/registry';
import { IDENTITY_TRANSFORM, AnimationType } from '../../animations/types';

describe('getAnimationTransform', () => {
  const ALL_TYPES: AnimationType[] = [
    'fade-in',
    'slide-right-in', 'slide-left-in', 'slide-up-in', 'slide-down-in',
    'slide-right-long-in', 'slide-left-long-in', 'slide-up-long-in', 'slide-down-long-in',
    'rotate-in',
    'rotate-cw-left-in', 'rotate-ccw-right-in', 'rotate-ccw-left-in', 'rotate-cw-right-in',
    'bounce-in',
    'bounce-right-in', 'bounce-left-in', 'bounce-up-in', 'bounce-down-in',
    'scale-in',
    'scale-left-in', 'scale-right-in', 'scale-up-in', 'scale-down-in',
    'slide-expand-right', 'slide-expand-left', 'slide-expand-up', 'slide-expand-down',
    'light-speed-right-in', 'light-speed-left-in',
    'light-speed-right-out', 'light-speed-left-out',
    'rotate-Y', 'rotate-center-X', 'rotate-center-Y', 'rotate-left-long',
  ];

  describe('registered animation types', () => {
    ALL_TYPES.forEach(type => {
      it(`should return valid transform for "${type}" at p=0`, () => {
        const result = getAnimationTransform(type, 0, 200, 100);
        expect(result).toBeDefined();
        expect(result).toHaveProperty('translateX');
        expect(result).toHaveProperty('translateY');
        expect(result).toHaveProperty('opacity');
        expect(result).toHaveProperty('scaleX');
        expect(result).toHaveProperty('scaleY');
        expect(result).toHaveProperty('rotate');
        expect(result).toHaveProperty('skewX');
        expect(result).toHaveProperty('clipRect');
      });

      it(`should return identical transform for "${type}" at p=1`, () => {
        const result = getAnimationTransform(type, 1, 200, 100);
        const isSlideExpand = type.startsWith('slide-expand');
        const isLightSpeedOut = type.endsWith('-out');
        const isLightSpeedLeftOut = type === 'light-speed-left-out';
        const expectedTranslateX = isLightSpeedLeftOut ? -600 : isLightSpeedOut ? 600 : 0;
        const LIGHT_SPEED_SKEW = (30 * Math.PI) / 180;
        const expectedSkewX = isLightSpeedLeftOut ? -LIGHT_SPEED_SKEW : isLightSpeedOut ? LIGHT_SPEED_SKEW : 0;
        expect(result.translateX).toBeCloseTo(expectedTranslateX, 4);
        expect(result.translateY).toBeCloseTo(0, 4);
        expect(result.rotate).toBeCloseTo(0, 4);
        expect(result.scaleX).toBeCloseTo(1, 4);
        expect(result.scaleY).toBeCloseTo(1, 4);
        expect(result.opacity).toBeCloseTo(isLightSpeedOut ? 0 : 1, 4);
        expect(result.skewX).toBeCloseTo(expectedSkewX, 4);
        if (!isSlideExpand) {
          expect(result.clipRect).toBeNull();
        }
      });

      it(`should return defined transform for "${type}" at p=0.5`, () => {
        const result = getAnimationTransform(type, 0.5, 200, 100);
        expect(result).toBeDefined();
        expect(isNaN(result.translateX)).toBe(false);
        expect(isNaN(result.translateY)).toBe(false);
        expect(isNaN(result.opacity)).toBe(false);
      });
    });
  });

  describe('unknown animation type', () => {
    it('should return IDENTITY_TRANSFORM for unknown type', () => {
      const result = getAnimationTransform('unknown-type' as AnimationType, 0.5, 200, 100);
      expect(result).toEqual(IDENTITY_TRANSFORM);
    });

    it('should return IDENTITY_TRANSFORM for empty string', () => {
      const result = getAnimationTransform('' as AnimationType, 0.5, 200, 100);
      expect(result).toEqual(IDENTITY_TRANSFORM);
    });
  });

  describe('progress interpolation', () => {
    it('should produce different transforms at different progress values', () => {
      const r0 = getAnimationTransform('slide-right-in', 0, 200, 100);
      const r5 = getAnimationTransform('slide-right-in', 0.5, 200, 100);
      const r1 = getAnimationTransform('slide-right-in', 1, 200, 100);

      expect(r0.translateX).not.toBe(r5.translateX);
      expect(r5.translateX).not.toBe(r1.translateX);
    });

    it('should produce monotonic progress for fade-in', () => {
      const progresses = [0, 0.25, 0.5, 0.75, 1];
      const opacities = progresses.map(p => getAnimationTransform('fade-in', p, 200, 100).opacity);

      for (let i = 1; i < opacities.length; i++) {
        expect(opacities[i]).toBeGreaterThanOrEqual(opacities[i - 1]);
      }
    });
  });

  describe('dimensions', () => {
    it('slide expand should use width correctly', () => {
      const r0 = getAnimationTransform('slide-expand-right', 0, 400, 200);
      expect(r0.clipRect!.width).toBe(0);

      const r5 = getAnimationTransform('slide-expand-right', 0.5, 400, 200);
      expect(r5.clipRect!.width).toBeCloseTo(200, 0);

      const r1 = getAnimationTransform('slide-expand-right', 1, 400, 200);
      expect(r1.clipRect!.width).toBe(400);
    });

    it('slide expand should use height correctly', () => {
      const r0 = getAnimationTransform('slide-expand-down', 0, 200, 300);
      expect(r0.clipRect!.height).toBe(0);

      const r5 = getAnimationTransform('slide-expand-down', 0.5, 200, 300);
      expect(r5.clipRect!.height).toBeCloseTo(150, 0);

      const r1 = getAnimationTransform('slide-expand-down', 1, 200, 300);
      expect(r1.clipRect!.height).toBe(300);
    });
  });
});