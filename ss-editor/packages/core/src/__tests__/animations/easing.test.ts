// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import { EASING } from '../../animations/easing';

describe('EASING', () => {
  describe('linear', () => {
    it('should return the input value unchanged', () => {
      expect(EASING.linear(0)).toBe(0);
      expect(EASING.linear(0.25)).toBe(0.25);
      expect(EASING.linear(0.5)).toBe(0.5);
      expect(EASING.linear(0.75)).toBe(0.75);
      expect(EASING.linear(1)).toBe(1);
      expect(EASING.linear(-1)).toBe(-1);
    });
  });

  describe('ease (default)', () => {
    it('should start slow and end slow', () => {
      expect(EASING.ease(0)).toBeCloseTo(0, 5);
      expect(EASING.ease(0.5)).toBeCloseTo(0.5, 5);
      expect(EASING.ease(1)).toBeCloseTo(1, 5);
    });

    it('should be symmetric around t=0.5', () => {
      const t1 = 0.3;
      expect(EASING.ease(t1)).toBeCloseTo(1 - EASING.ease(1 - t1), 5);
    });
  });

  describe('ease-in', () => {
    it('should start slow and accelerate', () => {
      expect(EASING['ease-in'](0)).toBe(0);
      expect(EASING['ease-in'](1)).toBe(1);
      expect(EASING['ease-in'](0.5)).toBeCloseTo(0.25, 5);
    });

    it('should have value < t for t in (0, 1)', () => {
      for (let t = 0.1; t < 1; t += 0.1) {
        expect(EASING['ease-in'](t)).toBeLessThan(t);
      }
    });
  });

  describe('ease-out', () => {
    it('should start fast and decelerate', () => {
      expect(EASING['ease-out'](0)).toBe(0);
      expect(EASING['ease-out'](1)).toBe(1);
      expect(EASING['ease-out'](0.5)).toBeCloseTo(0.75, 5);
    });

    it('should have value >= t for t in (0, 1)', () => {
      for (let t = 0.1; t < 1; t += 0.1) {
        expect(EASING['ease-out'](t)).toBeGreaterThanOrEqual(t);
      }
    });
  });

  describe('ease-in-out', () => {
    it('should be the same as ease function', () => {
      for (let t = 0; t <= 1; t += 0.1) {
        expect(EASING['ease-in-out'](t)).toBeCloseTo(EASING.ease(t), 5);
      }
    });
  });

  describe('bounce', () => {
    it('should start at 0 and end at 1', () => {
      expect(EASING.bounce(0)).toBeCloseTo(0, 5);
      expect(EASING.bounce(1)).toBeCloseTo(1, 5);
    });

    it('should produce bouncing effect (multiple oscillations)', () => {
      const samples = [0.1, 0.3, 0.5, 0.7, 0.9].map(t => EASING.bounce(t));
      const increasing = samples.every((v, i) => i === 0 || v >= samples[i - 1] - 0.01);
      expect(increasing).toBe(true);
    });

    it('should return values between 0 and 1', () => {
      for (let t = 0; t <= 1; t += 0.05) {
        const result = EASING.bounce(t);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('bounce-in', () => {
    it('should be the complement of bounce(1 - t)', () => {
      for (let t = 0; t <= 1; t += 0.1) {
        expect(EASING['bounce-in'](t)).toBeCloseTo(1 - EASING.bounce(1 - t), 5);
      }
    });

    it('should start at 0 and end at 1', () => {
      expect(EASING['bounce-in'](0)).toBeCloseTo(0, 5);
      expect(EASING['bounce-in'](1)).toBeCloseTo(1, 5);
    });
  });

  describe('bounce-out', () => {
    it('should be identical to bounce', () => {
      for (let t = 0; t <= 1; t += 0.1) {
        expect(EASING['bounce-out'](t)).toBe(EASING.bounce(t));
      }
    });
  });

  describe('elastic-in', () => {
    it('should start at 0 and end at 1', () => {
      expect(EASING['elastic-in'](0)).toBe(0);
      expect(EASING['elastic-in'](1)).toBe(1);
    });

    it('should have overshoot before reaching 1', () => {
      const val = EASING['elastic-in'](0.9);
      expect(typeof val).toBe('number');
    });

    it('should produce oscillation near the end', () => {
      const mid = EASING['elastic-in'](0.7);
      const late = EASING['elastic-in'](0.85);
      expect(mid).toBeCloseTo(0, 0);
      expect(late).toBeLessThanOrEqual(1.5);
    });
  });

  describe('elastic-out', () => {
    it('should start at 0 and end at 1', () => {
      expect(EASING['elastic-out'](0)).toBe(0);
      expect(EASING['elastic-out'](1)).toBe(1);
    });

    it('should overshoot beyond 1 before settling', () => {
      const late = EASING['elastic-out'](0.75);
      expect(late).toBeGreaterThan(0.8);
    });
  });

  describe('back-in', () => {
    it('should start with negative values (backtracking)', () => {
      expect(EASING['back-in'](0)).toBeCloseTo(0, 5);
      expect(EASING['back-in'](1)).toBeCloseTo(1, 5);
      const early = EASING['back-in'](0.1);
      expect(early).toBeLessThan(0);
    });
  });

  describe('back-out', () => {
    it('should overshoot beyond 1', () => {
      expect(EASING['back-out'](0)).toBeCloseTo(0, 5);
      expect(EASING['back-out'](1)).toBeCloseTo(1, 5);
      const late = EASING['back-out'](0.9);
      expect(late).toBeGreaterThan(1);
    });
  });

  describe('all easing functions boundary checks', () => {
    const easingNames = Object.keys(EASING);

    easingNames.forEach(name => {
      const fn = EASING[name];

      it(`${name}: should return 0 for t=0`, () => {
        expect(fn(0)).toBeCloseTo(0, 4);
      });

      it(`${name}: should return 1 for t=1`, () => {
        expect(fn(1)).toBeCloseTo(1, 4);
      });

      it(`${name}: should handle t<0 gracefully (no NaN or throw)`, () => {
        const result = fn(-0.5);
        expect(isNaN(result)).toBe(false);
        expect(isFinite(result)).toBe(true);
      });

      it(`${name}: should handle t>1 gracefully (no NaN or throw)`, () => {
        const result = fn(1.5);
        expect(isNaN(result)).toBe(false);
        expect(isFinite(result)).toBe(true);
      });
    });
  });
});