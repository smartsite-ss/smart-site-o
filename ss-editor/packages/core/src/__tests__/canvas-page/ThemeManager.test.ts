// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ThemeManager } from '../../canvas-page/theme/ThemeManager';
import { lightTheme as _lightTheme, darkTheme, techLightBlueTheme, techDarkBlueTheme, blueTheme, highContrastTheme } from '../../canvas-page/theme/config/themes';
import type { ThemeName } from '../../canvas-page/theme/config/themes';

const STORAGE_KEY = 'scada-editor-theme';

describe('ThemeManager', () => {
  let themeManager: ThemeManager;

  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    themeManager = new ThemeManager();
  });

  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    vi.restoreAllMocks();
  });

  describe('default theme', () => {
    it('should return dark on new instance', () => {
      expect(themeManager.getCurrentThemeName()).toBe('dark');
    });
  });

  describe('getCurrentTheme', () => {
    it('should return dark theme object matching config', () => {
      const theme = themeManager.getCurrentTheme();
      expect(theme).toEqual(darkTheme);
      expect(theme.primary).toBe('#4A90D9');
      expect(theme.background).toBe('#14181E');
    });
  });

  describe('setTheme', () => {
    it('should change theme to dark and verify name change', () => {
      themeManager.setTheme('dark');
      expect(themeManager.getCurrentThemeName()).toBe('dark');
      expect(themeManager.getCurrentTheme()).toEqual(darkTheme);
    });

    it('should fall back to dark with console.warn on invalid theme', () => {
      themeManager.setTheme('dark');
      themeManager.setTheme('invalid-theme' as ThemeName);
      expect(themeManager.getCurrentThemeName()).toBe('dark');
      expect(themeManager.getCurrentTheme()).toEqual(darkTheme);
      expect(console.warn).toHaveBeenCalledWith(
        'Theme "invalid-theme" not found, falling back to "dark"'
      );
    });

    it('should work with techLightBlue theme', () => {
      themeManager.setTheme('tech-light-blue');
      expect(themeManager.getCurrentThemeName()).toBe('tech-light-blue');
      expect(themeManager.getCurrentTheme()).toEqual(techLightBlueTheme);
    });

    it('should work with techDarkBlue theme', () => {
      themeManager.setTheme('tech-dark-blue');
      expect(themeManager.getCurrentThemeName()).toBe('tech-dark-blue');
      expect(themeManager.getCurrentTheme()).toEqual(techDarkBlueTheme);
    });

    it('should work with blue theme', () => {
      themeManager.setTheme('blue');
      expect(themeManager.getCurrentThemeName()).toBe('blue');
      expect(themeManager.getCurrentTheme()).toEqual(blueTheme);
    });

    it('should work with highContrast theme', () => {
      themeManager.setTheme('high-contrast');
      expect(themeManager.getCurrentThemeName()).toBe('high-contrast');
      expect(themeManager.getCurrentTheme()).toEqual(highContrastTheme);
    });
  });

  describe('subscribe', () => {
    it('should call callback immediately with current theme on subscribe', () => {
      const cb = vi.fn();
      themeManager.subscribe(cb);

      expect(cb).toHaveBeenCalledTimes(1);
      expect(cb).toHaveBeenCalledWith(darkTheme);
    });

    it('should call callback when theme changes', () => {
      const cb = vi.fn();
      themeManager.subscribe(cb);
      cb.mockClear();

      themeManager.setTheme('dark');
      expect(cb).toHaveBeenCalledTimes(1);
      expect(cb).toHaveBeenCalledWith(darkTheme);
    });

    it('should stop callback after unsubscribe', () => {
      const cb = vi.fn();
      const unsubscribe = themeManager.subscribe(cb);
      cb.mockClear();

      themeManager.setTheme('dark');
      expect(cb).toHaveBeenCalledTimes(1);

      unsubscribe();
      cb.mockClear();

      themeManager.setTheme('light');
      expect(cb).not.toHaveBeenCalled();
    });

    it('should notify multiple subscribers', () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      themeManager.subscribe(cb1);
      themeManager.subscribe(cb2);

      cb1.mockClear();
      cb2.mockClear();

      themeManager.setTheme('dark');
      expect(cb1).toHaveBeenCalledTimes(1);
      expect(cb2).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAvailableThemeNames', () => {
    it('should return all theme names', () => {
      const themes = themeManager.getAvailableThemeNames();
      expect(themes.length).toBe(11);
      expect(themes).toContain('light');
      expect(themes).toContain('dark');
      expect(themes).toContain('blue');
      expect(themes).toContain('tech-light-blue');
      expect(themes).toContain('tech-dark-blue');
      expect(themes).toContain('high-contrast');
      expect(themes).toContain('blue-light');
      expect(themes).toContain('blue-dark');
      expect(themes).toContain('green-tech');
      expect(themes).toContain('orange-warm');
      expect(themes).toContain('enterprise');
    });
  });

  describe('theme object structure', () => {
    it('should have all required properties', () => {
      const theme = themeManager.getCurrentTheme();

      expect(theme).toHaveProperty('primary');
      expect(theme).toHaveProperty('secondary');
      expect(theme).toHaveProperty('accent');
      expect(theme).toHaveProperty('background');
      expect(theme).toHaveProperty('surface');
      expect(theme).toHaveProperty('headerBackground');
      expect(theme).toHaveProperty('text');
      expect(theme).toHaveProperty('textSecondary');
      expect(theme).toHaveProperty('headerText');
      expect(theme).toHaveProperty('border');
      expect(theme).toHaveProperty('borderLight');

      expect(theme.button).toHaveProperty('background');
      expect(theme.button).toHaveProperty('hover');
      expect(theme.button).toHaveProperty('active');
      expect(theme.button).toHaveProperty('text');

      expect(theme.controlButton).toHaveProperty('background');
      expect(theme.controlButton).toHaveProperty('hover');
      expect(theme.controlButton).toHaveProperty('active');
      expect(theme.controlButton).toHaveProperty('text');
      expect(theme.controlButton).toHaveProperty('border');

      expect(theme.status).toHaveProperty('success');
      expect(theme.status).toHaveProperty('warning');
      expect(theme.status).toHaveProperty('error');
      expect(theme.status).toHaveProperty('info');

      expect(theme.shadow).toHaveProperty('small');
      expect(theme.shadow).toHaveProperty('medium');
      expect(theme.shadow).toHaveProperty('large');

      expect(theme.transition).toHaveProperty('fast');
      expect(theme.transition).toHaveProperty('normal');
      expect(theme.transition).toHaveProperty('slow');
    });
  });

  describe('light theme values', () => {
    it('should have specific light theme color values', () => {
      themeManager.setTheme('light');
      const theme = themeManager.getCurrentTheme();

      expect(theme.primary).toBe('#2196F3');
      expect(theme.secondary).toBe('#4CAF50');
      expect(theme.accent).toBe('#FF9800');
      expect(theme.background).toBe('#F5F5F5');
      expect(theme.surface).toBe('#FFFFFF');
      expect(theme.headerBackground).toBe('#2196F3');
      expect(theme.text).toBe('#333333');
      expect(theme.textSecondary).toBe('#666666');
      expect(theme.headerText).toBe('#FFFFFF');
      expect(theme.border).toBe('#CCCCCC');
      expect(theme.borderLight).toBe('#E0E0E0');
    });
  });

  describe('dark theme values', () => {
    it('should have specific dark theme color values', () => {
      themeManager.setTheme('dark');
      const theme = themeManager.getCurrentTheme();

      expect(theme.primary).toBe('#4A90D9');
      expect(theme.secondary).toBe('#5A6B7C');
      expect(theme.accent).toBe('#F0A030');
      expect(theme.background).toBe('#14181E');
      expect(theme.surface).toBe('#1C2128');
      expect(theme.headerBackground).toBe('#1C2128');
      expect(theme.text).toBe('#E8EDF2');
      expect(theme.textSecondary).toBe('#8B95A5');
      expect(theme.headerText).toBe('#E8EDF2');
      expect(theme.border).toBe('#2E3540');
      expect(theme.borderLight).toBe('#242A33');
    });
  });

  describe('applyThemeToDOM', () => {
    it('should set CSS custom properties on documentElement', () => {
      themeManager.setTheme('light');
      const root = document.documentElement;

      expect(root.style.getPropertyValue('--primary')).toBe('#2196F3');
      expect(root.style.getPropertyValue('--secondary')).toBe('#4CAF50');
      expect(root.style.getPropertyValue('--accent')).toBe('#FF9800');
      expect(root.style.getPropertyValue('--background')).toBe('#F5F5F5');
      expect(root.style.getPropertyValue('--surface')).toBe('#FFFFFF');
      expect(root.style.getPropertyValue('--header-background')).toBe('#2196F3');
      expect(root.style.getPropertyValue('--text')).toBe('#333333');
      expect(root.style.getPropertyValue('--text-secondary')).toBe('#666666');
      expect(root.style.getPropertyValue('--header-text')).toBe('#FFFFFF');
      expect(root.style.getPropertyValue('--border')).toBe('#CCCCCC');
      expect(root.style.getPropertyValue('--border-light')).toBe('#E0E0E0');
    });

    it('should set CSS custom properties for dark theme', () => {
      themeManager.setTheme('dark');
      const root = document.documentElement;

      expect(root.style.getPropertyValue('--primary')).toBe('#4A90D9');
      expect(root.style.getPropertyValue('--background')).toBe('#14181E');
      expect(root.style.getPropertyValue('--text')).toBe('#E8EDF2');
    });

    it('should set data-theme attribute', () => {
      themeManager.setTheme('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

      themeManager.setTheme('blue');
      expect(document.documentElement.getAttribute('data-theme')).toBe('blue');
    });

    it('should set button CSS custom properties', () => {
      themeManager.setTheme('light');
      const root = document.documentElement;

      expect(root.style.getPropertyValue('--button-background')).toBe('#2196F3');
      expect(root.style.getPropertyValue('--button-hover')).toBe('#1976D2');
      expect(root.style.getPropertyValue('--button-active')).toBe('#1565C0');
      expect(root.style.getPropertyValue('--button-text')).toBe('#FFFFFF');
    });

    it('should set control button CSS custom properties', () => {
      themeManager.setTheme('light');
      const root = document.documentElement;

      expect(root.style.getPropertyValue('--control-button-background')).toBe('#FFFFFF');
      expect(root.style.getPropertyValue('--control-button-hover')).toBe('#E3F2FD');
      expect(root.style.getPropertyValue('--control-button-active')).toBe('#2196F3');
      expect(root.style.getPropertyValue('--control-button-text')).toBe('#333333');
      expect(root.style.getPropertyValue('--control-button-border')).toBe('#CCCCCC');
    });

    it('should set status CSS custom properties', () => {
      themeManager.setTheme('light');
      const root = document.documentElement;

      expect(root.style.getPropertyValue('--status-success')).toBe('#4CAF50');
      expect(root.style.getPropertyValue('--status-warning')).toBe('#FFC107');
      expect(root.style.getPropertyValue('--status-error')).toBe('#F44336');
      expect(root.style.getPropertyValue('--status-info')).toBe('#2196F3');
    });
  });

  describe('setTheme persistence', () => {
    it('should update current theme name on setTheme', () => {
      themeManager.setTheme('dark');
      expect(themeManager.getCurrentThemeName()).toBe('dark');

      themeManager.setTheme('blue');
      expect(themeManager.getCurrentThemeName()).toBe('blue');
    });

    it('should use default theme on new instance', () => {
      const newManager = new ThemeManager();
      expect(newManager.getCurrentThemeName()).toBe('dark');
      expect(newManager.getCurrentTheme()).toEqual(darkTheme);
    });

    it('should ignore invalid theme and use default', () => {
      localStorage.setItem(STORAGE_KEY, 'nonexistent');

      const newManager = new ThemeManager();
      expect(newManager.getCurrentThemeName()).toBe('dark');
    });

    it('should handle initialization errors gracefully', () => {
      const newManager = new ThemeManager();
      expect(newManager.getCurrentThemeName()).toBe('dark');
    });
  });
});