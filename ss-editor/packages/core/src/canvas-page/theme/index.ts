// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

// Theme config (re-exported from plugin-sdk)
export * from './config/themes';

// Theme engine (re-exported from plugin-sdk)
export { themeManager, ThemeManager } from './ThemeManager';
export { themeRegistry, ThemeRegistry } from './ThemeRegistry';
export type { ThemeRegistration } from './ThemeRegistry';
export { initBridge } from './ThemeBridge';

// ThemeProvider (re-exported from plugin-sdk for unified API)
export { ThemeProvider, ThemeSwitcher } from '@scada-editor/plugin-sdk';
export type { IThemeEngine } from '@scada-editor/plugin-sdk';

// Vue composables (core-specific)
export * from './useTheme';
export * from './useThemeSwitcher';
export * from './useGraphicStyle';
export * from './themeColors';

// Design tokens (core-specific)
export * from './tokens';