// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

// 边框和圆角设计令牌

// 边框宽度
export const borderWidths = {
  none: '0px',
  thin: '1px',
  medium: '2px',
  thick: '3px',
};

// 边框样式
export const borderStyles = {
  none: 'none',
  solid: 'solid',
  dashed: 'dashed',
  dotted: 'dotted',
};

// 圆角半径
export const borderRadius = {
  none: '0px',
  sm: '2px',
  md: '4px',
  lg: '8px',
  xl: '12px',
  full: '9999px',
  
  // 常用组件圆角
  button: '4px',
  card: '8px',
  input: '4px',
  modal: '8px',
};

// 边框工具函数
export const borderUtils = {
  // 获取边框样式
  getBorderStyle: (width: keyof typeof borderWidths, style: keyof typeof borderStyles, color: string) => {
    return `${borderWidths[width]} ${borderStyles[style]} ${color}`;
  },
  
  // 获取圆角样式
  getBorderRadius: (size: keyof typeof borderRadius) => {
    return borderRadius[size];
  },
};