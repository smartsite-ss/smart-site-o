// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import {
  fadeIn,
  slideInFn,
  rotateInFn,
  bounceInFn,
  scaleInFn,
  slideExpandFn,
  lightSpeedFn,
  rotate3DFn,
  loopBounce,
  loopBlink,
  loopPulseScale,
  loopShakeX,
  loopShakeY,
  loopShakeXY,
  loopFanSwing,
  loopFanSwingAlt,
  loopWobbleScale,
  loopRotatePulse,
} from '../../animations/transforms';
import { AnimationTransform } from '../../animations/types';

function hasValidShape(transform: AnimationTransform) {
  expect(transform).toHaveProperty('translateX');
  expect(transform).toHaveProperty('translateY');
  expect(transform).toHaveProperty('rotate');
  expect(transform).toHaveProperty('scaleX');
  expect(transform).toHaveProperty('scaleY');
  expect(transform).toHaveProperty('opacity');
  expect(transform).toHaveProperty('skewX');
  expect(transform).toHaveProperty('clipRect');
}

function expectIdentityAtP1(fn: (p: number, w?: number, h?: number) => AnimationTransform, w = 100, h = 100) {
  const result = fn(1, w, h);
  expect(result.translateX).toBeCloseTo(0, 4);
  expect(result.translateY).toBeCloseTo(0, 4);
  expect(result.rotate).toBeCloseTo(0, 4);
  expect(result.scaleX).toBeCloseTo(1, 4);
  expect(result.scaleY).toBeCloseTo(1, 4);
  expect(result.opacity).toBeCloseTo(1, 4);
  expect(result.skewX).toBeCloseTo(0, 4);
  expect(result.clipRect).toBeNull();
}

describe('Enter Animation Transforms', () => {
  describe('fadeIn', () => {
    it('should return correct shape', () => {
      hasValidShape(fadeIn(0.5));
    });

    it('should have opacity equal to progress', () => {
      expect(fadeIn(0).opacity).toBe(0);
      expect(fadeIn(0.5).opacity).toBe(0.5);
      expect(fadeIn(1).opacity).toBe(1);
    });

    it('should have identity values for other properties', () => {
      const result = fadeIn(0.3);
      expect(result.translateX).toBe(0);
      expect(result.translateY).toBe(0);
      expect(result.scaleX).toBe(1);
      expect(result.scaleY).toBe(1);
      expect(result.rotate).toBe(0);
    });

    it('should reach identity at p=1', () => {
      expectIdentityAtP1(fadeIn);
    });
  });

  describe('slideInFn', () => {
    it('should slide from right with short distance', () => {
      const fn = slideInFn('right', 'short');
      expect(fn(0).translateX).toBe(150);
      expect(fn(0.5).translateX).toBeCloseTo(75, 0);
      expect(fn(1).translateX).toBe(0);
    });

    it('should slide from left with short distance', () => {
      const fn = slideInFn('left', 'short');
      expect(fn(0).translateX).toBe(-150);
      expect(fn(1).translateX).toBeCloseTo(0, 5);
    });

    it('should slide from up with short distance', () => {
      const fn = slideInFn('up', 'short');
      expect(fn(0).translateY).toBe(-150);
      expect(fn(1).translateY).toBeCloseTo(0, 5);
    });

    it('should slide from down with short distance', () => {
      const fn = slideInFn('down', 'short');
      expect(fn(0).translateY).toBe(150);
      expect(fn(1).translateY).toBe(0);
    });

    it('should use long distance (600)', () => {
      const fn = slideInFn('right', 'long');
      expect(fn(0).translateX).toBe(600);
      expect(fn(1).translateX).toBe(0);
    });

    it('should reach identity at p=1', () => {
      expectIdentityAtP1(slideInFn('right', 'short'));
    });

    it('should only affect appropriate axis', () => {
      const fnRight = slideInFn('right', 'short');
      expect(fnRight(0).translateY).toBe(0);

      const fnUp = slideInFn('up', 'short');
      expect(fnUp(0).translateX).toBe(0);
    });
  });

  describe('rotateInFn', () => {
    it('should rotate clockwise by default', () => {
      const fn = rotateInFn(true);
      expect(fn(0).rotate).toBeCloseTo(-Math.PI, 0);
      expect(fn(1).rotate).toBeCloseTo(0, 5);
    });

    it('should rotate counter-clockwise', () => {
      const fn = rotateInFn(false);
      expect(fn(0).rotate).toBeCloseTo(Math.PI, 0);
      expect(fn(1).rotate).toBeCloseTo(0, 5);
    });

    it('should scale from 0.8 to 1', () => {
      const fn = rotateInFn(true);
      expect(fn(0).scaleX).toBeCloseTo(0.8, 5);
      expect(fn(0).scaleY).toBeCloseTo(0.8, 5);
      expect(fn(1).scaleX).toBeCloseTo(1, 5);
      expect(fn(1).scaleY).toBeCloseTo(1, 5);
    });

    it('should add horizontal translation for left origin', () => {
      const fn = rotateInFn(true, 'left');
      expect(fn(0).translateX).toBeCloseTo(-150, 0);
      expect(fn(1).translateX).toBeCloseTo(0, 5);
    });

    it('should add horizontal translation for right origin', () => {
      const fn = rotateInFn(true, 'right');
      expect(fn(0).translateX).toBeCloseTo(150, 0);
      expect(fn(1).translateX).toBe(0);
    });

    it('should have opacity equal to progress', () => {
      const fn = rotateInFn(true);
      expect(fn(0).opacity).toBe(0);
      expect(fn(1).opacity).toBe(1);
    });

    it('should reach identity at p=1', () => {
      expectIdentityAtP1(rotateInFn(true));
    });
  });

  describe('bounceInFn', () => {
    it('should scale from 0.5 to 1 without direction', () => {
      const fn = bounceInFn();
      expect(fn(0).scaleX).toBeCloseTo(0.5, 5);
      expect(fn(0).scaleY).toBeCloseTo(0.5, 5);
      expect(fn(1).scaleX).toBeCloseTo(1, 5);
      expect(fn(1).scaleY).toBeCloseTo(1, 5);
    });

    it('should use bounce easing for opacity', () => {
      const fn = bounceInFn();
      expect(fn(0).opacity).toBeCloseTo(0, 5);
      expect(fn(1).opacity).toBeCloseTo(1, 5);
    });

    it('should include directional offset when dir specified', () => {
      const fn = bounceInFn('right');
      expect(fn(0).translateX).toBe(150);
      expect(fn(1).translateX).toBe(0);
    });

    it('should reach identity at p=1', () => {
      expectIdentityAtP1(bounceInFn());
      expectIdentityAtP1(bounceInFn('left'));
      expectIdentityAtP1(bounceInFn('down'));
    });
  });

  describe('scaleInFn', () => {
    it('should scale from 0.3 to 1 without direction', () => {
      const fn = scaleInFn();
      expect(fn(0).scaleX).toBeCloseTo(0.3, 5);
      expect(fn(0).scaleY).toBeCloseTo(0.3, 5);
      expect(fn(1).scaleX).toBeCloseTo(1, 5);
      expect(fn(1).scaleY).toBeCloseTo(1, 5);
    });

    it('should have opacity equal to progress', () => {
      const fn = scaleInFn();
      expect(fn(0).opacity).toBe(0);
      expect(fn(0.5).opacity).toBe(0.5);
      expect(fn(1).opacity).toBe(1);
    });

    it('should include half-distance directional offset', () => {
      const fn = scaleInFn('right');
      expect(fn(0).translateX).toBeCloseTo(75, 0);
      expect(fn(1).translateX).toBe(0);
    });

    it('should reach identity at p=1', () => {
      expectIdentityAtP1(scaleInFn());
      expectIdentityAtP1(scaleInFn('up'));
    });
  });

  describe('slideExpandFn', () => {
    it('should clip expand from right', () => {
      const fn = slideExpandFn('right');
      const r0 = fn(0, 200, 100);
      expect(r0.clipRect!.width).toBe(0);
      const r1 = fn(1, 200, 100);
      expect(r1.clipRect!.width).toBe(200);
    });

    it('should clip expand from left', () => {
      const fn = slideExpandFn('left');
      const r0 = fn(0, 200, 100);
      expect(r0.clipRect!.x).toBe(200);
      expect(r0.clipRect!.width).toBe(0);
      const r1 = fn(1, 200, 100);
      expect(r1.clipRect!.x).toBe(0);
      expect(r1.clipRect!.width).toBe(200);
    });

    it('should clip expand from down', () => {
      const fn = slideExpandFn('down');
      const r0 = fn(0, 100, 200);
      expect(r0.clipRect!.height).toBe(0);
      const r1 = fn(1, 100, 200);
      expect(r1.clipRect!.height).toBe(200);
    });

    it('should clip expand from up', () => {
      const fn = slideExpandFn('up');
      const r0 = fn(0, 100, 200);
      expect(r0.clipRect!.y).toBe(200);
      expect(r0.clipRect!.height).toBe(0);
      const r1 = fn(1, 100, 200);
      expect(r1.clipRect!.y).toBe(0);
      expect(r1.clipRect!.height).toBe(200);
    });

    it('should reach identity at p=1', () => {
      const fn = slideExpandFn('right');
      const result = fn(1, 300, 200);
      expect(result.clipRect).toEqual({ x: 0, y: 0, width: 300, height: 200 });
    });
  });

  describe('lightSpeedFn', () => {
    it('should enter from right', () => {
      const fn = lightSpeedFn('right', 'in');
      expect(fn(0).translateX).toBeCloseTo(600, 0);
      expect(fn(0).skewX).toBeGreaterThan(0);
      expect(fn(0).opacity).toBe(0);
      expect(fn(1).translateX).toBe(0);
      expect(fn(1).skewX).toBeCloseTo(0, 5);
      expect(fn(1).opacity).toBe(1);
    });

    it('should enter from left', () => {
      const fn = lightSpeedFn('left', 'in');
      expect(fn(0).translateX).toBeCloseTo(-600, 0);
      expect(fn(0).skewX).toBeLessThan(0);
      expect(fn(1).translateX).toBeCloseTo(0, 5);
    });

    it('should exit to right', () => {
      const fn = lightSpeedFn('right', 'out');
      expect(fn(0).translateX).toBe(0);
      expect(fn(0).opacity).toBe(1);
      expect(fn(1).translateX).toBeCloseTo(600, 0);
      expect(fn(1).opacity).toBe(0);
    });

    it('should exit to left', () => {
      const fn = lightSpeedFn('left', 'out');
      expect(fn(0).translateX).toBeCloseTo(0, 5);
      expect(fn(1).translateX).toBeCloseTo(-600, 0);
    });
  });

  describe('rotate3DFn', () => {
    it('should have identity at p=1 for Y axis', () => {
      const result = rotate3DFn('Y', 1, 200, 100);
      expect(result.scaleX).toBeCloseTo(1, 5);
      expect(result.opacity).toBe(1);
    });

    it('should have scaleX=0 and opacity=0 at p=0 for Y axis', () => {
      const result = rotate3DFn('Y', 0, 200, 100);
      expect(result.scaleX).toBeCloseTo(0, 5);
      expect(result.opacity).toBe(0);
    });

    it('should have identity at p=1 for X axis', () => {
      const result = rotate3DFn('X', 1, 200, 100);
      expect(result.scaleY).toBeCloseTo(1, 5);
      expect(result.opacity).toBe(1);
    });

    it('should have scaleY=0 and opacity=0 at p=0 for X axis', () => {
      const result = rotate3DFn('X', 0, 200, 100);
      expect(result.scaleY).toBeCloseTo(0, 5);
      expect(result.opacity).toBe(0);
    });

    it('should add large offset when specified', () => {
      const result = rotate3DFn('X', 0, 200, 100, 800);
      expect(result.translateX).toBe(800);
      expect(result.rotate).toBeCloseTo(Math.PI * 2, 0);
    });

    it('should reach identity at p=1 with large offset', () => {
      const result = rotate3DFn('X', 1, 200, 100, 800);
      expect(result.translateX).toBe(0);
      expect(result.rotate).toBe(0);
    });
  });
});

describe('Loop Animation Transforms', () => {
  describe('loopBounce', () => {
    it('should return valid transform', () => {
      hasValidShape(loopBounce(0));
    });

    it('should produce vertical translation', () => {
      const r = loopBounce(0.25);
      expect(r.translateY).toBeLessThanOrEqual(0);
    });

    it('should be periodic', () => {
      expect(loopBounce(0).translateY).toBeCloseTo(loopBounce(1).translateY, 5);
    });

    it('should animate scale', () => {
      const r = loopBounce(0.25);
      expect(r.scaleX).toBeGreaterThanOrEqual(1);
      expect(r.scaleY).toBeGreaterThanOrEqual(1);
    });
  });

  describe('loopBlink', () => {
    it('should return valid transform', () => {
      hasValidShape(loopBlink(0));
    });

    it('should oscillate opacity between 0.2 and 1', () => {
      const r0 = loopBlink(0);
      expect(r0.opacity).toBeCloseTo(0.6, 1);

      const r25 = loopBlink(0.25);
      expect(r25.opacity).toBeGreaterThanOrEqual(0.2);
      expect(r25.opacity).toBeLessThanOrEqual(1);

      const r50 = loopBlink(0.5);
      expect(r50.opacity).toBeCloseTo(0.6, 1);

      const r75 = loopBlink(0.75);
      expect(r75.opacity).toBeGreaterThanOrEqual(0.2);
      expect(r75.opacity).toBeLessThanOrEqual(1);
    });

    it('should be periodic', () => {
      expect(loopBlink(0).opacity).toBeCloseTo(loopBlink(1).opacity, 5);
    });
  });

  describe('loopPulseScale', () => {
    it('should return valid transform', () => {
      hasValidShape(loopPulseScale(0));
    });

    it('should scale between 0.9 and 1', () => {
      for (let t = 0; t <= 1; t += 0.05) {
        const r = loopPulseScale(t);
        expect(r.scaleX).toBeGreaterThanOrEqual(0.89);
        expect(r.scaleX).toBeLessThanOrEqual(1.01);
        expect(r.scaleY).toBeGreaterThanOrEqual(0.89);
        expect(r.scaleY).toBeLessThanOrEqual(1.01);
      }
    });

    it('should be periodic', () => {
      expect(loopPulseScale(0).scaleX).toBeCloseTo(loopPulseScale(1).scaleX, 5);
    });
  });

  describe('loopShakeX', () => {
    it('should only affect translateX', () => {
      const r = loopShakeX(0.125);
      expect(r.translateX).not.toBe(0);
      expect(r.translateY).toBe(0);
    });

    it('should shake within amplitude bounds', () => {
      for (let t = 0; t <= 1; t += 0.02) {
        const r = loopShakeX(t);
        expect(Math.abs(r.translateX)).toBeLessThanOrEqual(8.01);
      }
    });

    it('should be periodic', () => {
      expect(loopShakeX(0).translateX).toBeCloseTo(loopShakeX(1).translateX, 5);
    });
  });

  describe('loopShakeY', () => {
    it('should only affect translateY', () => {
      const r = loopShakeY(0.125);
      expect(r.translateY).not.toBe(0);
      expect(r.translateX).toBe(0);
    });

    it('should shake within amplitude bounds', () => {
      for (let t = 0; t <= 1; t += 0.02) {
        const r = loopShakeY(t);
        expect(Math.abs(r.translateY)).toBeLessThanOrEqual(8.01);
      }
    });
  });

  describe('loopShakeXY', () => {
    it('should affect both axes', () => {
      const r = loopShakeXY(0.125);
      expect(r.translateX).not.toBe(0);
      expect(r.translateY).not.toBe(0);
    });

    it('should shake within amplitude bounds for X', () => {
      for (let t = 0; t <= 1; t += 0.02) {
        const r = loopShakeXY(t);
        expect(Math.abs(r.translateX)).toBeLessThanOrEqual(8.01);
      }
    });
  });

  describe('loopFanSwing', () => {
    it('should affect rotation', () => {
      const r = loopFanSwing(0.25);
      expect(r.rotate).not.toBe(0);
    });

    it('should swing within max angle bounds', () => {
      const maxAngle = (15 * Math.PI) / 180;
      for (let t = 0; t <= 1; t += 0.02) {
        const r = loopFanSwing(t);
        expect(Math.abs(r.rotate)).toBeLessThanOrEqual(maxAngle + 0.01);
      }
    });

    it('should be periodic', () => {
      expect(loopFanSwing(0).rotate).toBeCloseTo(loopFanSwing(1).rotate, 5);
    });
  });

  describe('loopFanSwingAlt', () => {
    it('should affect rotation and scale', () => {
      const r = loopFanSwingAlt(0.25);
      expect(r.rotate).not.toBe(0);
    });

    it('should be periodic', () => {
      expect(loopFanSwingAlt(0).rotate).toBeCloseTo(loopFanSwingAlt(1).rotate, 5);
    });
  });

  describe('loopWobbleScale', () => {
    it('should scale between 0.84 and 1', () => {
      for (let t = 0; t <= 1; t += 0.05) {
        const r = loopWobbleScale(t);
        expect(r.scaleX).toBeGreaterThanOrEqual(0.83);
        expect(r.scaleX).toBeLessThanOrEqual(1.01);
      }
    });

    it('should be periodic', () => {
      expect(loopWobbleScale(0).scaleX).toBeCloseTo(loopWobbleScale(1).scaleX, 5);
    });
  });

  describe('loopRotatePulse', () => {
    it('should affect both rotation and scale', () => {
      const r = loopRotatePulse(0.25);
      expect(r.rotate).not.toBe(0);
      expect(r.scaleX).toBeGreaterThanOrEqual(0.99);
    });

    it('should be periodic', () => {
      expect(loopRotatePulse(0).rotate).toBeCloseTo(loopRotatePulse(1).rotate, 5);
    });
  });
});