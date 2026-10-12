// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { AnimationTransform } from './types';
import { EASING } from './easing';

const SHORT_DIST = 150;
const LONG_DIST = 600;
const LIGHT_SPEED_SKEW = (30 * Math.PI) / 180;

function identity(overrides?: Partial<AnimationTransform>): AnimationTransform {
  return { translateX: 0, translateY: 0, rotate: 0, scaleX: 1, scaleY: 1, opacity: 1, skewX: 0, clipRect: null, ...overrides };
}

function dirOffset(dir: 'left' | 'right' | 'up' | 'down', offset: number): Partial<AnimationTransform> {
  switch (dir) {
    case 'right': return { translateX: offset };
    case 'left': return { translateX: -offset };
    case 'up': return { translateY: -offset };
    case 'down': return { translateY: offset };
  }
}

export const fadeIn = (p: number): AnimationTransform => identity({ opacity: p });

export function slideInFn(dir: 'left' | 'right' | 'up' | 'down', dist: 'short' | 'long') {
  const d = dist === 'long' ? LONG_DIST : SHORT_DIST;
  return (p: number): AnimationTransform => identity({ ...dirOffset(dir, d * (1 - p)) });
}

export function rotateInFn(clockwise: boolean, origin?: 'left' | 'right') {
  const angle = Math.PI * (clockwise ? -1 : 1);
  return (p: number): AnimationTransform => {
    const s = 0.8 + 0.2 * p;
    const base = identity({ rotate: angle * (1 - p), opacity: p, scaleX: s, scaleY: s });
    if (origin === 'left') base.translateX = -150 * (1 - p);
    if (origin === 'right') base.translateX = 150 * (1 - p);
    return base;
  };
}

export function bounceInFn(dir?: 'left' | 'right' | 'up' | 'down') {
  return (p: number): AnimationTransform => {
    const bounce = EASING.bounce(p);
    const scalar = 0.5 + 0.5 * bounce;
    if (!dir) return identity({ scaleX: scalar, scaleY: scalar, opacity: bounce });
    const offset = SHORT_DIST * (1 - bounce);
    return identity({ scaleX: scalar, scaleY: scalar, opacity: bounce, ...dirOffset(dir, offset) });
  };
}

export function scaleInFn(dir?: 'left' | 'right' | 'up' | 'down') {
  return (p: number): AnimationTransform => {
    const s = 0.3 + 0.7 * p;
    const base = identity({ scaleX: s, scaleY: s, opacity: p });
    if (!dir) return base;
    const offset = SHORT_DIST * 0.5 * (1 - p);
    return { ...base, ...dirOffset(dir, offset) };
  };
}

export function slideExpandFn(dir: 'left' | 'right' | 'up' | 'down') {
  return (p: number, w: number, h: number): AnimationTransform => {
    const clip: { x: number; y: number; width: number; height: number } = { x: 0, y: 0, width: w, height: h };
    switch (dir) {
      case 'right': clip.width = w * p; break;
      case 'left': clip.x = w * (1 - p); clip.width = w * p; break;
      case 'down': clip.height = h * p; break;
      case 'up': clip.y = h * (1 - p); clip.height = h * p; break;
    }
    return identity({ clipRect: clip });
  };
}

export function lightSpeedFn(dir: 'left' | 'right', mode: 'in' | 'out') {
  const sign = dir === 'right' ? 1 : -1;
  const startDist = mode === 'in' ? LONG_DIST : 0;
  const endDist = mode === 'in' ? 0 : LONG_DIST;
  return (p: number): AnimationTransform => {
    const eased = EASING['ease-out'](p);
    return identity({
      translateX: sign * (startDist + (endDist - startDist) * eased),
      skewX: (mode === 'in' ? (1 - eased) : eased) * LIGHT_SPEED_SKEW * sign,
      opacity: mode === 'in' ? eased : 1 - eased,
    });
  };
}

export function rotate3DFn(axis: 'X' | 'Y', p: number, _w: number, _h: number, largeOffset?: number) {
  const angle = Math.PI * (1 - p);
  const base = identity({ opacity: p });
  if (axis === 'Y') {
    base.scaleX = Math.max(0, Math.cos(angle));
  } else {
    base.scaleY = Math.max(0, Math.cos(angle));
  }
  if (largeOffset) {
    base.translateX = largeOffset * (1 - p);
    base.rotate = Math.PI * 2 * (1 - p);
  }
  return base;
}

// ===== 循环动画变换函数 =====
// 所有循环动画的参数 t 为 0~1 的周期进度，使用 sin/cos 实现平滑往复

const SHAKE_AMP = 8;
const SCALE_PULSE_MIN = 0.9;
const FAN_SWING_MAX_ANGLE = (15 * Math.PI) / 180;

export function loopBounce(t: number): AnimationTransform {
  const y = Math.abs(Math.sin(t * Math.PI * 2));
  const s = 1 + y * 0.12;
  return identity({ translateY: -y * 10, scaleX: s, scaleY: s });
}

export function loopBlink(t: number): AnimationTransform {
  const a = (Math.sin(t * Math.PI * 2) + 1) / 2;
  return identity({ opacity: 0.2 + a * 0.8 });
}

export function loopPulseScale(t: number): AnimationTransform {
  const s = SCALE_PULSE_MIN + (1 - SCALE_PULSE_MIN) * (Math.sin(t * Math.PI * 2) + 1) / 2;
  return identity({ scaleX: s, scaleY: s });
}

export function loopShakeX(t: number): AnimationTransform {
  return identity({ translateX: Math.sin(t * Math.PI * 4) * SHAKE_AMP });
}

export function loopShakeY(t: number): AnimationTransform {
  return identity({ translateY: Math.sin(t * Math.PI * 4) * SHAKE_AMP });
}

export function loopShakeXY(t: number): AnimationTransform {
  return identity({
    translateX: Math.sin(t * Math.PI * 4) * SHAKE_AMP,
    translateY: Math.cos(t * Math.PI * 6) * SHAKE_AMP * 0.7,
  });
}

export function loopFanSwing(t: number): AnimationTransform {
  const angle = Math.sin(t * Math.PI * 2) * FAN_SWING_MAX_ANGLE;
  return identity({ rotate: angle });
}

export function loopFanSwingAlt(t: number): AnimationTransform {
  const angle = Math.sin(t * Math.PI * 2 + Math.PI / 2) * FAN_SWING_MAX_ANGLE * 1.5;
  const s = 1 + Math.abs(Math.sin(t * Math.PI * 4)) * 0.05;
  return identity({ rotate: angle, scaleX: s, scaleY: s });
}

export function loopWobbleScale(t: number): AnimationTransform {
  const s = 0.92 + Math.sin(t * Math.PI * 4) * 0.08;
  return identity({ scaleX: s, scaleY: s });
}

export function loopRotatePulse(t: number): AnimationTransform {
  const angle = Math.sin(t * Math.PI * 2) * FAN_SWING_MAX_ANGLE;
  const s = 1 + Math.abs(Math.sin(t * Math.PI * 3)) * 0.06;
  return identity({ rotate: angle, scaleX: s, scaleY: s });
}