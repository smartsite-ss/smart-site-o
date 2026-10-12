// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export type AnimationType =
  | 'fade-in'
  | 'slide-right-in' | 'slide-left-in' | 'slide-up-in' | 'slide-down-in'
  | 'slide-right-long-in' | 'slide-left-long-in' | 'slide-up-long-in' | 'slide-down-long-in'
  | 'rotate-in'
  | 'rotate-cw-left-in' | 'rotate-ccw-right-in' | 'rotate-ccw-left-in' | 'rotate-cw-right-in'
  | 'bounce-in'
  | 'bounce-right-in' | 'bounce-left-in' | 'bounce-up-in' | 'bounce-down-in'
  | 'scale-in'
  | 'scale-left-in' | 'scale-right-in' | 'scale-up-in' | 'scale-down-in'
  | 'slide-expand-right' | 'slide-expand-left' | 'slide-expand-up' | 'slide-expand-down'
  | 'light-speed-right-in' | 'light-speed-left-in'
  | 'light-speed-right-out' | 'light-speed-left-out'
  | 'rotate-Y' | 'rotate-center-X' | 'rotate-center-Y' | 'rotate-left-long';

export type LoopAnimationType =
  | 'none'
  | 'bounce'
  | 'blink'
  | 'pulse-scale'
  | 'shake-x'
  | 'shake-y'
  | 'shake-xy'
  | 'fan-swing'
  | 'fan-swing-alt'
  | 'wobble-scale'
  | 'rotate-pulse';

export type EasingType =
  | 'linear'
  | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out'
  | 'bounce' | 'bounce-in' | 'bounce-out'
  | 'elastic-in' | 'elastic-out'
  | 'back-in' | 'back-out';

export interface ClipRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AnimationTransform {
  translateX: number;
  translateY: number;
  rotate: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  skewX: number;
  clipRect: ClipRect | null;
}

export interface EnterAnimationState {
  playing: boolean;
  finished: boolean;
  startTime: number;
  progress: number;
  easedProgress: number;
}

export const IDENTITY_TRANSFORM: AnimationTransform = {
  translateX: 0, translateY: 0, rotate: 0,
  scaleX: 1, scaleY: 1, opacity: 1,
  skewX: 0, clipRect: null,
};

export const ANIMATION_TYPE_LABELS: Record<AnimationType, string> = {
  'fade-in': '渐显',
  'slide-right-in': '向右进入', 'slide-left-in': '向左进入',
  'slide-up-in': '向上进入', 'slide-down-in': '向下进入',
  'slide-right-long-in': '向右长距进入', 'slide-left-long-in': '向左长距进入',
  'slide-up-long-in': '向上长距进入', 'slide-down-long-in': '向下长距进入',
  'rotate-in': '旋转进入',
  'rotate-cw-left-in': '左顺时针旋转', 'rotate-ccw-right-in': '右逆时针旋转',
  'rotate-ccw-left-in': '左逆时针旋转', 'rotate-cw-right-in': '右顺时针旋转',
  'bounce-in': '弹入',
  'bounce-right-in': '向右弹入', 'bounce-left-in': '向左弹入',
  'bounce-up-in': '向上弹入', 'bounce-down-in': '向下弹入',
  'scale-in': '由小变大进入',
  'scale-left-in': '左变大进入', 'scale-right-in': '右变大进入',
  'scale-up-in': '向上变大进入', 'scale-down-in': '向下变大进入',
  'slide-expand-right': '向右滑动展开', 'slide-expand-left': '向左滑动展开',
  'slide-expand-up': '向上滑动展开', 'slide-expand-down': '向下滑动展开',
  'light-speed-right-in': '光速从右进入', 'light-speed-left-in': '光速从左进入',
  'light-speed-right-out': '光速从右退出', 'light-speed-left-out': '光速从左退出',
  'rotate-Y': 'Y轴旋转', 'rotate-center-X': '中心X轴旋转',
  'rotate-center-Y': '中心Y轴旋转', 'rotate-left-long': '左长半径旋转',
};

export const ALL_ANIMATION_TYPE_LABELS: Record<string, string> = {
  ...ANIMATION_TYPE_LABELS,
  'loop-bounce': '弹跳（循环）',
  'loop-blink': '闪烁（循环）',
  'loop-pulse-scale': '放大缩小（循环）',
  'loop-shake-x': '左右晃动（循环）',
  'loop-shake-y': '上下晃动（循环）',
  'loop-shake-xy': '左右上下晃动（循环）',
  'loop-fan-swing': '扇形摇摆（循环）',
  'loop-fan-swing-alt': '扇形摆摆（循环）',
  'loop-wobble-scale': '放大晃动缩小（循环）',
  'loop-rotate-pulse': '扇形摆摆（循环）',
};

export const EASING_LABELS: Record<EasingType, string> = {
  'linear': '线性',
  'ease': '缓动', 'ease-in': '缓入', 'ease-out': '缓出', 'ease-in-out': '缓入缓出',
  'bounce': '弹跳', 'bounce-in': '弹跳进入', 'bounce-out': '弹跳退出',
  'elastic-in': '弹性进入', 'elastic-out': '弹性退出',
  'back-in': '回弹进入', 'back-out': '回弹退出',
};

export const LOOP_ANIMATION_TYPE_LABELS: Record<LoopAnimationType, string> = {
  'none': '无',
  'bounce': '弹跳',
  'blink': '闪烁',
  'pulse-scale': '放大缩小',
  'shake-x': '左右晃动',
  'shake-y': '上下晃动',
  'shake-xy': '左右上下晃动',
  'fan-swing': '扇形摇摆',
  'fan-swing-alt': '扇形摆摆',
  'wobble-scale': '放大晃动缩小',
  'rotate-pulse': '扇形摆摆',
};

export interface LoopAnimationState {
  playing: boolean;
  startTime: number;
  cycleProgress: number; // 0~1 within one cycle
}