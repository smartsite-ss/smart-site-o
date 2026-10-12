// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

// 空间设计令牌

// 基础空间单位
export const spacingBase = 4;

// 空间尺寸
export const spacing = {
  // 小空间
  xs: spacingBase * 1, // 4px
  sm: spacingBase * 2, // 8px
  md: spacingBase * 4, // 16px
  lg: spacingBase * 6, // 24px
  xl: spacingBase * 8, // 32px
  xxl: spacingBase * 12, // 48px
  xxxl: spacingBase * 16, // 64px
  
  // 常用组合
  padding: {
    small: spacingBase * 2, // 8px
    medium: spacingBase * 4, // 16px
    large: spacingBase * 6, // 24px
  },
  
  margin: {
    small: spacingBase * 2, // 8px
    medium: spacingBase * 4, // 16px
    large: spacingBase * 6, // 24px
  },
  
  // 布局间距
  layout: {
    container: spacingBase * 8, // 32px
    section: spacingBase * 6, // 24px
    card: spacingBase * 4, // 16px
    item: spacingBase * 2, // 8px
  },
};

// 空间工具函数
export const spacingUtils = {
  // 生成间距类名
  getSpacingClass: (type: 'm' | 'p', direction: 't' | 'r' | 'b' | 'l' | 'x' | 'y' | '', size: keyof typeof spacing) => {
    if (typeof spacing[size] !== 'number') {
      return '';
    }
    
    if (direction === 'x' || direction === 'y') {
      return `${type}${direction}-${size}`;
    } else if (direction) {
      return `${type}${direction}-${size}`;
    } else {
      return `${type}-${size}`;
    }
  },
  
  // 获取间距值
  getSpacingValue: (size: keyof typeof spacing) => {
    if (typeof spacing[size] === 'number') {
      return spacing[size];
    }
    return spacing.md;
  },
};