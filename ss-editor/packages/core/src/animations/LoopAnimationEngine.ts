// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { AnimationTransform } from './types';
import {
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
} from './transforms';
import { LoopAnimationType } from './types';

type LoopTransformFn = (t: number) => AnimationTransform;

const LOOP_TRANSFORMS: Record<LoopAnimationType, LoopTransformFn> = {
  'none': (_t) => ({ translateX: 0, translateY: 0, rotate: 0, scaleX: 1, scaleY: 1, opacity: 1, skewX: 0, clipRect: null }),
  'bounce': loopBounce,
  'blink': loopBlink,
  'pulse-scale': loopPulseScale,
  'shake-x': loopShakeX,
  'shake-y': loopShakeY,
  'shake-xy': loopShakeXY,
  'fan-swing': loopFanSwing,
  'fan-swing-alt': loopFanSwingAlt,
  'wobble-scale': loopWobbleScale,
  'rotate-pulse': loopRotatePulse,
};

export interface LoopAnimationConfig {
  type: LoopAnimationType;
  duration: number; // 单个周期时长（ms），默认 1000
  speed?: number;   // 播放速度倍率，默认 1
}

export class LoopAnimationEngine {
  private configs = new Map<string, LoopAnimationConfig>();
  private states = new Map<string, { playing: boolean; startTime: number }>();

  configure(id: string, config: LoopAnimationConfig): void {
    this.configs.set(id, config);
  }

  remove(id: string): void {
    this.configs.delete(id);
    this.states.delete(id);
  }

  play(id: string): void {
    const state = this.states.get(id);
    if (state) state.playing = true;
    else this.states.set(id, { playing: true, startTime: Date.now() });
  }

  stop(id: string): void {
    const state = this.states.get(id);
    if (state) state.playing = false;
  }

  isPlaying(id: string): boolean {
    return this.states.get(id)?.playing ?? false;
  }

  getTransform(id: string): AnimationTransform | null {
    const config = this.configs.get(id);
    const state = this.states.get(id);
    if (!config || !state || !state.playing || config.type === 'none') return null;

    const fn = LOOP_TRANSFORMS[config.type];
    if (!fn) return null;

    const duration = (config.duration || 1000) / (config.speed || 1);
    const elapsed = Date.now() - state.startTime;
    const t = (elapsed % duration) / duration;

    return fn(t);
  }

  destroy(): void {
    this.configs.clear();
    this.states.clear();
  }
}
