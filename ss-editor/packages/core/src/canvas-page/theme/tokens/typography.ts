// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

// 排版设计令牌

// 字体家族
export const fonts = {
  // 主要字体
  primary: 'Arial, sans-serif',
  // 等宽字体
  mono: 'Consolas, Monaco, monospace',
  // 标题字体
  heading: 'Arial, sans-serif',
};

// 字体大小
export const fontSizes = {
  // 小字体
  xs: '10px',
  sm: '12px',
  md: '14px',
  lg: '16px',
  xl: '18px',
  xxl: '24px',
  xxxl: '32px',
  
  // 标题字体大小
  heading: {
    h1: '28px',
    h2: '24px',
    h3: '20px',
    h4: '18px',
    h5: '16px',
    h6: '14px',
  },
};

// 字重
export const fontWeights = {
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
};

// 行高
export const lineHeights = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.8,
  
  // 标题行高
  heading: 1.3,
  // 正文行高
  body: 1.6,
};

// 字间距
export const letterSpacings = {
  tight: '-0.025em',
  normal: '0em',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em',
};

// 排版工具函数
export const typographyUtils = {
  // 获取字体样式
  getFontStyle: (variant: 'body' | 'heading' | 'caption' | 'button') => {
    switch (variant) {
      case 'body':
        return {
          fontFamily: fonts.primary,
          fontSize: fontSizes.md,
          fontWeight: fontWeights.regular,
          lineHeight: lineHeights.body,
          letterSpacing: letterSpacings.normal,
        };
      case 'heading':
        return {
          fontFamily: fonts.heading,
          fontSize: fontSizes.xxl,
          fontWeight: fontWeights.bold,
          lineHeight: lineHeights.heading,
          letterSpacing: letterSpacings.tight,
        };
      case 'caption':
        return {
          fontFamily: fonts.primary,
          fontSize: fontSizes.sm,
          fontWeight: fontWeights.regular,
          lineHeight: lineHeights.normal,
          letterSpacing: letterSpacings.normal,
        };
      case 'button':
        return {
          fontFamily: fonts.primary,
          fontSize: fontSizes.md,
          fontWeight: fontWeights.medium,
          lineHeight: lineHeights.tight,
          letterSpacing: letterSpacings.wide,
        };
      default:
        return {
          fontFamily: fonts.primary,
          fontSize: fontSizes.md,
          fontWeight: fontWeights.regular,
          lineHeight: lineHeights.normal,
          letterSpacing: letterSpacings.normal,
        };
    }
  },
  
  // 获取标题样式
  getHeadingStyle: (level: 1 | 2 | 3 | 4 | 5 | 6) => {
    return {
      fontFamily: fonts.heading,
      fontSize: fontSizes.heading[`h${level}` as keyof typeof fontSizes.heading],
      fontWeight: fontWeights.bold,
      lineHeight: lineHeights.heading,
      letterSpacing: letterSpacings.tight,
    };
  },
};