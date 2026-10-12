// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

type EasingFn = (t: number) => number;

const c4 = (2 * Math.PI) / 3;

export const EASING: Record<string, EasingFn> = {
  linear: (t) => t,
  ease: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  'ease-in': (t) => t * t,
  'ease-out': (t) => t * (2 - t),
  'ease-in-out': (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

  bounce: (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
  'bounce-in': (t) => 1 - EASING.bounce(1 - t),
  'bounce-out': (t) => EASING.bounce(t),

  'elastic-in': (t) =>
    t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4),
  'elastic-out': (t) =>
    t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1,

  'back-in': (t) => {
    const s = 1.70158;
    return t * t * ((s + 1) * t - s);
  },
  'back-out': (t) => {
    const s = 1.70158;
    return --t * t * ((s + 1) * t + s) + 1;
  },
};