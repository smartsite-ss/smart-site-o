// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

// 阴影设计令牌

// 阴影类型
export const shadows = {
  // 小阴影
  small: '0 2px 4px rgba(0, 0, 0, 0.1)',
  // 中等阴影
  medium: '0 4px 8px rgba(0, 0, 0, 0.15)',
  // 大阴影
  large: '0 8px 16px rgba(0, 0, 0, 0.2)',
  // 超大阴影
  xlarge: '0 16px 32px rgba(0, 0, 0, 0.25)',
  
  // 特殊阴影
  inner: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)',
  hover: '0 4px 12px rgba(0, 0, 0, 0.15)',
  focus: '0 0 0 3px rgba(33, 150, 243, 0.3)',
  
  // 常用组件阴影
  card: '0 4px 8px rgba(0, 0, 0, 0.1)',
  modal: '0 10px 25px rgba(0, 0, 0, 0.25)',
  dropdown: '0 4px 12px rgba(0, 0, 0, 0.15)',
};

// 阴影工具函数
export const shadowUtils = {
  // 获取阴影样式
  getShadow: (type: keyof typeof shadows) => {
    return shadows[type];
  },
  
  // 获取主题阴影
  getThemeShadow: (theme: 'light' | 'dark', type: keyof typeof shadows) => {
    if (theme === 'dark') {
      // 深色主题下的阴影
      switch (type) {
        case 'small':
          return '0 2px 4px rgba(0, 0, 0, 0.3)';
        case 'medium':
          return '0 4px 8px rgba(0, 0, 0, 0.4)';
        case 'large':
          return '0 8px 16px rgba(0, 0, 0, 0.5)';
        default:
          return shadows[type];
      }
    }
    return shadows[type];
  },
};