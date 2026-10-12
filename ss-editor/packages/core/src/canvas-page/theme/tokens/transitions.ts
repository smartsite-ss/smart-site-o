// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

// 过渡和动画设计令牌

// 过渡时长
export const transitionDurations = {
  // 快速
  fast: '0.2s',
  // 正常
  normal: '0.3s',
  // 慢速
  slow: '0.5s',
  
  // 常用组件过渡
  button: '0.2s',
  input: '0.2s',
  card: '0.3s',
  modal: '0.3s',
  dropdown: '0.2s',
};

// 过渡缓动函数
export const transitionEasings = {
  // 线性
  linear: 'linear',
  // 缓入
  easeIn: 'ease-in',
  // 缓出
  easeOut: 'ease-out',
  // 缓入缓出
  easeInOut: 'ease-in-out',
  
  // 弹性
  elastic: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  // 反弹
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  // 平滑
  smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
};

// 过渡属性
export const transitionProperties = {
  // 所有属性
  all: 'all',
  // 颜色
  color: 'color',
  // 背景色
  backgroundColor: 'background-color',
  // 边框
  border: 'border',
  // 变换
  transform: 'transform',
  // 不透明度
  opacity: 'opacity',
  // 宽度
  width: 'width',
  // 高度
  height: 'height',
};

// 过渡工具函数
export const transitionUtils = {
  // 获取过渡样式
  getTransition: (property: keyof typeof transitionProperties, duration: keyof typeof transitionDurations, easing: keyof typeof transitionEasings) => {
    return `${transitionProperties[property]} ${transitionDurations[duration]} ${transitionEasings[easing]}`;
  },
  
  // 获取默认过渡
  getDefaultTransition: () => {
    return `${transitionProperties.all} ${transitionDurations.normal} ${transitionEasings.easeInOut}`;
  },
};