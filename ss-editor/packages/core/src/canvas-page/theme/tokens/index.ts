// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

// 设计令牌入口

// 颜色
import * as colorsModule from './colors';
export * from './colors';

// 空间
import * as spacingModule from './spacing';
export * from './spacing';

// 排版
import * as typographyModule from './typography';
export * from './typography';

// 边框和圆角
import * as bordersModule from './borders';
export * from './borders';

// 阴影
import * as shadowsModule from './shadows';
export * from './shadows';

// 过渡和动画
import * as transitionsModule from './transitions';
export * from './transitions';

// 设计令牌版本
export const tokensVersion = '1.0.0';

// 设计令牌配置
export const designTokens = {
  version: tokensVersion,
  colors: colorsModule.colors,
  spacing: spacingModule.spacing,
  fonts: typographyModule.fonts,
  fontSizes: typographyModule.fontSizes,
  fontWeights: typographyModule.fontWeights,
  lineHeights: typographyModule.lineHeights,
  letterSpacings: typographyModule.letterSpacings,
  borderWidths: bordersModule.borderWidths,
  borderStyles: bordersModule.borderStyles,
  borderRadius: bordersModule.borderRadius,
  shadows: shadowsModule.shadows,
  transitionDurations: transitionsModule.transitionDurations,
  transitionEasings: transitionsModule.transitionEasings,
  transitionProperties: transitionsModule.transitionProperties,
};

// 工具函数
export const tokenUtils = {
  color: colorsModule.colorUtils,
  spacing: spacingModule.spacingUtils,
  typography: typographyModule.typographyUtils,
  border: bordersModule.borderUtils,
  shadow: shadowsModule.shadowUtils,
  transition: transitionsModule.transitionUtils,
};