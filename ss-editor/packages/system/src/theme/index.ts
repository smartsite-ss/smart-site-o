// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { themeManager } from '@scada-editor/core';
import './system.css';

/**
 * Initialize the theme system for the system package.
 * ThemeProvider now directly uses ThemeManager, so initBridge is no longer needed.
 */
export function initSystemTheme() {
  // Ensure CSS variables are applied to DOM
  themeManager.applyThemeToDOM();
}

export { themeManager };
export { useTheme } from '@scada-editor/core';