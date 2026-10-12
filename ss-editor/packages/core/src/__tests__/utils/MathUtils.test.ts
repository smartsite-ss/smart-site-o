// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import { MathUtils } from '../../utils/math/MathUtils';

describe('MathUtils', () => {
  describe('degToRad', () => {
    it('should convert 0 degrees to 0 radians', () => {
      expect(MathUtils.degToRad(0)).toBe(0);
    });

    it('should convert 180 degrees to PI radians', () => {
      expect(MathUtils.degToRad(180)).toBeCloseTo(Math.PI);
    });

    it('should convert 360 degrees to 2*PI radians', () => {
      expect(MathUtils.degToRad(360)).toBeCloseTo(2 * Math.PI);
    });

    it('should convert 90 degrees to PI/2 radians', () => {
      expect(MathUtils.degToRad(90)).toBeCloseTo(Math.PI / 2);
    });

    it('should convert 45 degrees correctly', () => {
      expect(MathUtils.degToRad(45)).toBeCloseTo(Math.PI / 4);
    });

    it('should handle negative degrees', () => {
      expect(MathUtils.degToRad(-180)).toBeCloseTo(-Math.PI);
    });
  });

  describe('radToDeg', () => {
    it('should convert 0 radians to 0 degrees', () => {
      expect(MathUtils.radToDeg(0)).toBe(0);
    });

    it('should convert PI radians to 180 degrees', () => {
      expect(MathUtils.radToDeg(Math.PI)).toBeCloseTo(180);
    });

    it('should convert 2*PI radians to 360 degrees', () => {
      expect(MathUtils.radToDeg(2 * Math.PI)).toBeCloseTo(360);
    });

    it('should convert PI/2 radians to 90 degrees', () => {
      expect(MathUtils.radToDeg(Math.PI / 2)).toBeCloseTo(90);
    });

    it('should handle negative radians', () => {
      expect(MathUtils.radToDeg(-Math.PI)).toBeCloseTo(-180);
    });
  });

  describe('degToRad and radToDeg roundtrip', () => {
    it('should be inverse operations', () => {
      const testAngles = [0, 30, 45, 60, 90, 180, 270, 360, -45, -90, 720];
      for (const deg of testAngles) {
        expect(MathUtils.radToDeg(MathUtils.degToRad(deg))).toBeCloseTo(deg);
      }
    });
  });

  describe('normaliseAngle', () => {
    it('should normalize 0 to 0', () => {
      expect(MathUtils.normaliseAngle(0)).toBe(0);
    });

    it('should normalize angle within range as-is', () => {
      expect(MathUtils.normaliseAngle(Math.PI)).toBeCloseTo(Math.PI);
    });

    it('should normalize negative angle to positive range', () => {
      const result = MathUtils.normaliseAngle(-Math.PI);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(2 * Math.PI);
      expect(result).toBeCloseTo(Math.PI);
    });

    it('should normalize angle > 2*PI', () => {
      const result = MathUtils.normaliseAngle(3 * Math.PI);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(2 * Math.PI);
      expect(result).toBeCloseTo(Math.PI);
    });

    it('should normalize large angle', () => {
      const result = MathUtils.normaliseAngle(10 * Math.PI);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(2 * Math.PI);
    });

    it('should always return angle in [0, 2*PI]', () => {
      const testAngles = [-720, -360, -180, -90, 0, 90, 180, 360, 720, 1080];
      for (const deg of testAngles) {
        const rad = MathUtils.degToRad(deg);
        const normalized = MathUtils.normaliseAngle(rad);
        expect(normalized).toBeGreaterThanOrEqual(0);
        expect(normalized).toBeLessThanOrEqual(2 * Math.PI + 1e-10);
      }
    });
  });

  describe('normalizeAngle (alias)', () => {
    it('should work the same as normaliseAngle', () => {
      expect(MathUtils.normalizeAngle(Math.PI)).toBe(MathUtils.normaliseAngle(Math.PI));
      expect(MathUtils.normalizeAngle(0)).toBe(MathUtils.normaliseAngle(0));
      expect(MathUtils.normalizeAngle(-Math.PI)).toBe(MathUtils.normaliseAngle(-Math.PI));
    });
  });

  describe('clamp', () => {
    it('should clamp value below min to min', () => {
      expect(MathUtils.clamp(-5, 0, 10)).toBe(0);
    });

    it('should clamp value above max to max', () => {
      expect(MathUtils.clamp(15, 0, 10)).toBe(10);
    });

    it('should return value unchanged when within range', () => {
      expect(MathUtils.clamp(5, 0, 10)).toBe(5);
    });

    it('should return min when value equals min', () => {
      expect(MathUtils.clamp(0, 0, 10)).toBe(0);
    });

    it('should return max when value equals max', () => {
      expect(MathUtils.clamp(10, 0, 10)).toBe(10);
    });

    it('should handle negative ranges', () => {
      expect(MathUtils.clamp(-15, -10, -5)).toBe(-10);
      expect(MathUtils.clamp(-7, -10, -5)).toBe(-7);
      expect(MathUtils.clamp(-3, -10, -5)).toBe(-5);
    });

    it('should handle floating point values', () => {
      expect(MathUtils.clamp(3.5, 1.2, 5.8)).toBeCloseTo(3.5);
      expect(MathUtils.clamp(0.5, 1.2, 5.8)).toBeCloseTo(1.2);
      expect(MathUtils.clamp(7.2, 1.2, 5.8)).toBeCloseTo(5.8);
    });
  });
});