// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { AnimationType, AnimationTransform, IDENTITY_TRANSFORM } from './types';
import {
  fadeIn,
  slideInFn,
  rotateInFn,
  bounceInFn,
  scaleInFn,
  slideExpandFn,
  lightSpeedFn,
  rotate3DFn,
} from './transforms';

type TransformFn = (progress: number, width: number, height: number) => AnimationTransform;

const REGISTRY: Record<string, TransformFn> = {
  'fade-in': (p) => fadeIn(p),

  'slide-right-in': slideInFn('right', 'short'),
  'slide-left-in': slideInFn('left', 'short'),
  'slide-up-in': slideInFn('up', 'short'),
  'slide-down-in': slideInFn('down', 'short'),
  'slide-right-long-in': slideInFn('right', 'long'),
  'slide-left-long-in': slideInFn('left', 'long'),
  'slide-up-long-in': slideInFn('up', 'long'),
  'slide-down-long-in': slideInFn('down', 'long'),

  'rotate-in': rotateInFn(true),
  'rotate-cw-left-in': rotateInFn(true, 'left'),
  'rotate-ccw-right-in': rotateInFn(false, 'right'),
  'rotate-ccw-left-in': rotateInFn(false, 'left'),
  'rotate-cw-right-in': rotateInFn(true, 'right'),

  'bounce-in': bounceInFn(),
  'bounce-right-in': bounceInFn('right'),
  'bounce-left-in': bounceInFn('left'),
  'bounce-up-in': bounceInFn('up'),
  'bounce-down-in': bounceInFn('down'),

  'scale-in': scaleInFn(),
  'scale-left-in': scaleInFn('left'),
  'scale-right-in': scaleInFn('right'),
  'scale-up-in': scaleInFn('up'),
  'scale-down-in': scaleInFn('down'),

  'slide-expand-right': slideExpandFn('right'),
  'slide-expand-left': slideExpandFn('left'),
  'slide-expand-up': slideExpandFn('up'),
  'slide-expand-down': slideExpandFn('down'),

  'light-speed-right-in': lightSpeedFn('right', 'in'),
  'light-speed-left-in': lightSpeedFn('left', 'in'),
  'light-speed-right-out': lightSpeedFn('right', 'out'),
  'light-speed-left-out': lightSpeedFn('left', 'out'),

  'rotate-Y': (p, w, h) => rotate3DFn('Y', p, w, h),
  'rotate-center-X': (p, w, h) => rotate3DFn('X', p, w, h),
  'rotate-center-Y': (p, w, h) => rotate3DFn('Y', p, w, h),
  'rotate-left-long': (p, w, h) => rotate3DFn('X', p, w, h, 800),
};

export function getAnimationTransform(
  type: AnimationType,
  progress: number,
  width: number,
  height: number,
): AnimationTransform {
  const fn = REGISTRY[type];
  if (!fn) return IDENTITY_TRANSFORM;
  return fn(progress, width, height);
}