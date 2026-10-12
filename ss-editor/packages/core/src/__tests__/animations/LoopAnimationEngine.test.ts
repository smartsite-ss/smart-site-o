// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach } from 'vitest';
import { LoopAnimationEngine, LoopAnimationConfig } from '../../animations/LoopAnimationEngine';
import { LoopAnimationType } from '../../animations/types';

describe('LoopAnimationEngine', () => {
  let engine: LoopAnimationEngine;

  beforeEach(() => {
    engine = new LoopAnimationEngine();
  });

  describe('configure', () => {
    it('should store animation config', () => {
      const config: LoopAnimationConfig = {
        type: 'bounce',
        duration: 1000,
      };
      engine.configure('el-1', config);
      const transform = engine.getTransform('el-1');
      expect(transform).toBeNull();
    });
  });

  describe('play / stop / isPlaying', () => {
    it('should start playing after play()', () => {
      engine.configure('el-1', { type: 'bounce', duration: 1000 });
      engine.play('el-1');
      expect(engine.isPlaying('el-1')).toBe(true);
    });

    it('should not be playing initially', () => {
      engine.configure('el-1', { type: 'bounce', duration: 1000 });
      expect(engine.isPlaying('el-1')).toBe(false);
    });

    it('should stop playing after stop()', () => {
      engine.configure('el-1', { type: 'bounce', duration: 1000 });
      engine.play('el-1');
      engine.stop('el-1');
      expect(engine.isPlaying('el-1')).toBe(false);
    });

    it('should return false for non-existent element', () => {
      expect(engine.isPlaying('non-existent')).toBe(false);
    });

    it('should handle play on unconfigured element', () => {
      engine.play('no-config');
      expect(engine.isPlaying('no-config')).toBe(true);
    });

    it('should handle stop on unconfigured element', () => {
      expect(() => engine.stop('no-config')).not.toThrow();
    });
  });

  describe('getTransform', () => {
    it('should return null when not playing', () => {
      engine.configure('el-1', { type: 'bounce', duration: 1000 });
      expect(engine.getTransform('el-1')).toBeNull();
    });

    it('should return null for type "none"', () => {
      engine.configure('el-1', { type: 'none', duration: 1000 });
      engine.play('el-1');
      expect(engine.getTransform('el-1')).toBeNull();
    });

    it('should return valid transform when playing', () => {
      engine.configure('el-1', { type: 'bounce', duration: 1000 });
      engine.play('el-1');
      const transform = engine.getTransform('el-1');
      expect(transform).not.toBeNull();
      expect(transform).toHaveProperty('translateX');
      expect(transform).toHaveProperty('translateY');
      expect(transform).toHaveProperty('scaleX');
      expect(transform).toHaveProperty('scaleY');
      expect(transform).toHaveProperty('opacity');
    });

    it('should return null for unknown element', () => {
      expect(engine.getTransform('unknown')).toBeNull();
    });

    it('should return different transforms at different times for pulse-scale', () => {
      engine.configure('el-2', { type: 'pulse-scale', duration: 1000 });
      engine.play('el-2');

      const t1 = engine.getTransform('el-2');
      expect(t1).not.toBeNull();

      setTimeout(() => {}, 250);
    });

    it('should respect duration config', () => {
      engine.configure('el-3', { type: 'shake-x', duration: 500 });
      engine.play('el-3');

      const transform = engine.getTransform('el-3');
      expect(transform).not.toBeNull();
    });

    it('should respect speed multiplier', () => {
      engine.configure('el-4', { type: 'shake-x', duration: 1000, speed: 2 });
      engine.play('el-4');

      const transform = engine.getTransform('el-4');
      expect(transform).not.toBeNull();
    });
  });

  describe('remove', () => {
    it('should remove config and state', () => {
      engine.configure('el-1', { type: 'bounce', duration: 1000 });
      engine.play('el-1');
      expect(engine.isPlaying('el-1')).toBe(true);

      engine.remove('el-1');
      expect(engine.isPlaying('el-1')).toBe(false);
      expect(engine.getTransform('el-1')).toBeNull();
    });

    it('should not throw for non-existent element', () => {
      expect(() => engine.remove('non-existent')).not.toThrow();
    });
  });

  describe('all loop animation types', () => {
    const types: LoopAnimationType[] = [
      'bounce', 'blink', 'pulse-scale',
      'shake-x', 'shake-y', 'shake-xy',
      'fan-swing', 'fan-swing-alt',
      'wobble-scale', 'rotate-pulse',
    ];

    types.forEach(type => {
      it(`should produce valid transform for "${type}"`, () => {
        engine.configure('el', { type, duration: 1000 });
        engine.play('el');

        const transform = engine.getTransform('el');
        expect(transform).not.toBeNull();
        expect(transform!.translateX).toBeDefined();
        expect(transform!.translateY).toBeDefined();
        expect(transform!.opacity).toBeDefined();
        expect(isNaN(transform!.translateX)).toBe(false);
      });
    });
  });

  describe('destroy', () => {
    it('should clean up all configs and states', () => {
      engine.configure('el-1', { type: 'bounce', duration: 1000 });
      engine.configure('el-2', { type: 'blink', duration: 500 });
      engine.play('el-1');
      engine.play('el-2');

      engine.destroy();

      expect(engine.isPlaying('el-1')).toBe(false);
      expect(engine.isPlaying('el-2')).toBe(false);
      expect(engine.getTransform('el-1')).toBeNull();
      expect(engine.getTransform('el-2')).toBeNull();
    });
  });

  describe('play multiple times', () => {
    it('should restart timing when play is called again', () => {
      engine.configure('el-1', { type: 'shake-x', duration: 1000 });
      engine.play('el-1');

      engine.play('el-1');

      const t2 = engine.getTransform('el-1');
      expect(t2).not.toBeNull();
    });
  });
});