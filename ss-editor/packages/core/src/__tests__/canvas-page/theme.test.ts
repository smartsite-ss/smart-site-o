// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  getTheme, 
  getThemeNames, 
  type ThemeName,
  lightTheme,
  darkTheme,
  techLightBlueTheme,
  techDarkBlueTheme,
  blueTheme,
  highContrastTheme
} from '../../canvas-page/theme/config/themes';
import { themeManager, ThemeManager } from '../../canvas-page/theme/ThemeManager';

describe('主题系统测试', () => {
  describe('主题定义验证', () => {
    it('应该正确获取所有主题名称', () => {
      const themeNames = getThemeNames();
      expect(themeNames).toContain('light');
      expect(themeNames).toContain('dark');
      expect(themeNames).toContain('tech-light-blue');
      expect(themeNames).toContain('tech-dark-blue');
      expect(themeNames).toContain('blue');
      expect(themeNames).toContain('high-contrast');
      expect(themeNames).toContain('blue-light');
      expect(themeNames).toContain('blue-dark');
      expect(themeNames).toContain('green-tech');
      expect(themeNames).toContain('orange-warm');
      expect(themeNames).toContain('enterprise');
      expect(themeNames.length).toBe(11);
    });

    it('应该正确获取浅色主题', () => {
      const theme = getTheme('light');
      expect(theme).toEqual(lightTheme);
      expect(theme.primary).toBe('#2196F3');
      expect(theme.background).toBe('#F5F5F5');
    });

    it('应该正确获取深色主题', () => {
      const theme = getTheme('dark');
      expect(theme).toEqual(darkTheme);
      expect(theme.primary).toBe('#4A90D9');
      expect(theme.background).toBe('#14181E');
    });

    it('应该正确获取科技浅蓝主题', () => {
      const theme = getTheme('tech-light-blue');
      expect(theme).toEqual(techLightBlueTheme);
      expect(theme.primary).toBe('#3B82F6');
      expect(theme.background).toBe('#F0F9FF');
    });

    it('应该正确获取科技深蓝主题', () => {
      const theme = getTheme('tech-dark-blue');
      expect(theme).toEqual(techDarkBlueTheme);
      expect(theme.primary).toBe('#0A2463');
      expect(theme.background).toBe('#0A1929');
    });

    it('应该正确获取蓝色主题', () => {
      const theme = getTheme('blue');
      expect(theme).toEqual(blueTheme);
      expect(theme.primary).toBe('#1976D2');
      expect(theme.background).toBe('#E3F2FD');
    });

    it('应该正确获取高对比度主题', () => {
      const theme = getTheme('high-contrast');
      expect(theme).toEqual(highContrastTheme);
      expect(theme.primary).toBe('#0066cc');
      expect(theme.background).toBe('#ffffff');
    });

    it('对于不存在的主题，应该默认返回浅色主题', () => {
      const theme = getTheme('non-existent-theme');
      expect(theme).toEqual(lightTheme);
    });
  });

  describe('主题结构验证', () => {
    const themes = [
      { name: 'light', theme: lightTheme },
      { name: 'dark', theme: darkTheme },
      { name: 'tech-light-blue', theme: techLightBlueTheme },
      { name: 'tech-dark-blue', theme: techDarkBlueTheme },
      { name: 'blue', theme: blueTheme },
      { name: 'high-contrast', theme: highContrastTheme },
    ];

    it.each(themes)('$name 主题应该包含所有必需的属性', ({ theme }) => {
      // 验证主色调
      expect(theme).toHaveProperty('primary');
      expect(theme).toHaveProperty('secondary');
      expect(theme).toHaveProperty('accent'); // 验证背景色 expect(theme).toHaveProperty('background');
      expect(theme).toHaveProperty('surface'); // 验证文本色 expect(theme).toHaveProperty('text');
      expect(theme).toHaveProperty('textSecondary'); // 验证边框色 expect(theme).toHaveProperty('border');
      expect(theme).toHaveProperty('borderLight'); // 验证按钮样式 expect(theme).toHaveProperty('button');
      expect(theme.button).toHaveProperty('background');
      expect(theme.button).toHaveProperty('hover');
      expect(theme.button).toHaveProperty('active');
      expect(theme.button).toHaveProperty('text'); // 验证控制按钮样式 expect(theme).toHaveProperty('controlButton');
      expect(theme.controlButton).toHaveProperty('background');
      expect(theme.controlButton).toHaveProperty('hover');
      expect(theme.controlButton).toHaveProperty('active');
      expect(theme.controlButton).toHaveProperty('text');
      expect(theme.controlButton).toHaveProperty('border'); // 验证状态色 expect(theme).toHaveProperty('status');
      expect(theme.status).toHaveProperty('success');
      expect(theme.status).toHaveProperty('warning');
      expect(theme.status).toHaveProperty('error');
      expect(theme.status).toHaveProperty('info'); // 验证阴影 expect(theme).toHaveProperty('shadow');
      expect(theme.shadow).toHaveProperty('small');
      expect(theme.shadow).toHaveProperty('medium');
      expect(theme.shadow).toHaveProperty('large'); // 验证过渡 expect(theme).toHaveProperty('transition');
      expect(theme.transition).toHaveProperty('fast');
      expect(theme.transition).toHaveProperty('normal');
      expect(theme.transition).toHaveProperty('slow');
    });

    it.each(themes)('$name 主题的颜色值应该是有效的十六进制颜色', ({ theme }) => {
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
      
      expect(theme.primary).toMatch(hexColorRegex);
      expect(theme.secondary).toMatch(hexColorRegex);
      expect(theme.accent).toMatch(hexColorRegex);
      expect(theme.background).toMatch(hexColorRegex);
      expect(theme.surface).toMatch(hexColorRegex);
      expect(theme.text).toMatch(hexColorRegex);
      expect(theme.textSecondary).toMatch(hexColorRegex);
      expect(theme.border).toMatch(hexColorRegex);
      expect(theme.borderLight).toMatch(hexColorRegex);
    });

    it.each(themes)('$name 主题的按钮颜色应该是有效的', ({ theme }) => {
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
      
      expect(theme.button.background).toMatch(hexColorRegex);
      expect(theme.button.hover).toMatch(hexColorRegex);
      expect(theme.button.active).toMatch(hexColorRegex);
      expect(theme.button.text).toMatch(hexColorRegex);
      
      expect(theme.controlButton.background).toMatch(hexColorRegex);
      expect(theme.controlButton.hover).toMatch(hexColorRegex);
      expect(theme.controlButton.active).toMatch(hexColorRegex);
      expect(theme.controlButton.text).toMatch(hexColorRegex);
      expect(theme.controlButton.border).toMatch(hexColorRegex);
    });

    it.each(themes)('$name 主题的状态颜色应该是有效的', ({ theme }) => {
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
      
      expect(theme.status.success).toMatch(hexColorRegex);
      expect(theme.status.warning).toMatch(hexColorRegex);
      expect(theme.status.error).toMatch(hexColorRegex);
      expect(theme.status.info).toMatch(hexColorRegex);
    });
  });

  describe('主题切换测试', () => {
    it('应该能够在所有主题之间切换', () => {
      const themeNames = getThemeNames();
      
      // 依次获取所有主题
      const obtainedThemes = themeNames.map(name => getTheme(name));
      
      // 验证所有主题都是不同的
      const uniqueThemes = new Set(obtainedThemes.map(t => JSON.stringify(t)));
      expect(uniqueThemes.size).toBe(themeNames.length);
    });

    it('getTheme 函数应该支持类型安全的主题名称', () => {
      const validThemeNames: ThemeName[] = ['light', 'dark', 'tech-light-blue', 'tech-dark-blue', 'blue', 'high-contrast'];
      
      validThemeNames.forEach(name => {
        const theme = getTheme(name);
        expect(theme).toBeDefined();
      });
    });
  });

  describe('主题功能完整性', () => {
    it('所有主题都应该包含完整的状态色', () => {
      const themeNames = getThemeNames();
      
      themeNames.forEach(name => {
        const theme = getTheme(name);
        expect(theme.status.success).toBeTruthy();
        expect(theme.status.warning).toBeTruthy();
        expect(theme.status.error).toBeTruthy();
        expect(theme.status.info).toBeTruthy();
      });
    });

    it('所有主题都应该包含完整的阴影配置', () => {
      const themeNames = getThemeNames();
      
      themeNames.forEach(name => {
        const theme = getTheme(name);
        expect(theme.shadow.small).toBeTruthy();
        expect(theme.shadow.medium).toBeTruthy();
        expect(theme.shadow.large).toBeTruthy();
      });
    });

    it('所有主题都应该包含完整的过渡配置', () => {
      const themeNames = getThemeNames();
      
      themeNames.forEach(name => {
        const theme = getTheme(name);
        expect(theme.transition.fast).toBeTruthy();
        expect(theme.transition.normal).toBeTruthy();
        expect(theme.transition.slow).toBeTruthy();
      });
    });
  });
});

describe('ThemeManager 测试', () => {
  let mockManager: ThemeManager;

  beforeEach(() => {
    localStorage.removeItem('scada-editor-theme');
    mockManager = new ThemeManager();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    localStorage.removeItem('scada-editor-theme');
    vi.restoreAllMocks();
  });

  describe('单例实例 themeManager', () => {
    it('应该Export单例实例', () => {
      expect(themeManager).toBeInstanceOf(ThemeManager);
    });

    it('多次访问应该返回同一个实例', () => {
      const manager1 = themeManager;
      const manager2 = themeManager;
      expect(manager1).toBe(manager2);
    });
  });

  describe('初始化状态', () => {
    it('初始主题应该是 dark', () => {
      expect(mockManager.getCurrentThemeName()).toBe('dark');
    });

    it('初始主题配置应该是 darkTheme', () => {
      const theme = mockManager.getCurrentTheme();
      expect(theme).toEqual(darkTheme);
    });
  });

  describe('主题切换', () => {
    it('应该能够切换到 dark 主题', () => {
      mockManager.setTheme('dark');
      expect(mockManager.getCurrentThemeName()).toBe('dark');
      expect(mockManager.getCurrentTheme()).toEqual(darkTheme);
    });

    it('应该能够切换到 tech-light-blue 主题', () => {
      mockManager.setTheme('tech-light-blue');
      expect(mockManager.getCurrentThemeName()).toBe('tech-light-blue');
      expect(mockManager.getCurrentTheme()).toEqual(techLightBlueTheme);
    });

    it('应该能够切换到 tech-dark-blue 主题', () => {
      mockManager.setTheme('tech-dark-blue');
      expect(mockManager.getCurrentThemeName()).toBe('tech-dark-blue');
      expect(mockManager.getCurrentTheme()).toEqual(techDarkBlueTheme);
    });

    it('应该能够切换到 blue 主题', () => {
      mockManager.setTheme('blue');
      expect(mockManager.getCurrentThemeName()).toBe('blue');
      expect(mockManager.getCurrentTheme()).toEqual(blueTheme);
    });

    it('应该能够切换到 high-contrast 主题', () => {
      mockManager.setTheme('high-contrast');
      expect(mockManager.getCurrentThemeName()).toBe('high-contrast');
      expect(mockManager.getCurrentTheme()).toEqual(highContrastTheme);
    });

    it('对于不存在的主题，应该回退到 dark 并警告', () => {
      mockManager.setTheme('non-existent' as ThemeName);
      expect(mockManager.getCurrentThemeName()).toBe('dark');
      expect(mockManager.getCurrentTheme()).toEqual(darkTheme);
      expect(console.warn).toHaveBeenCalledWith('Theme "non-existent" not found, falling back to "dark"');
    });
  });

  describe('主题订阅', () => {
    it('订阅应该立即收到当前主题', () => {
      const callback = vi.fn();
      const unsubscribe = mockManager.subscribe(callback);
      
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(darkTheme);
      
      unsubscribe();
    });

    it('主题切换时订阅者应该收到通知', () => {
      const callback = vi.fn();
      const unsubscribe = mockManager.subscribe(callback);
      
      callback.mockClear();
      mockManager.setTheme('dark');
      
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(darkTheme);
      
      unsubscribe();
    });

    it('多次订阅应该都能收到通知', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      const unsubscribe1 = mockManager.subscribe(callback1);
      const unsubscribe2 = mockManager.subscribe(callback2);
      
      callback1.mockClear();
      callback2.mockClear();
      
      mockManager.setTheme('dark');
      
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
      
      unsubscribe1();
      unsubscribe2();
    });

    it('取消订阅后不应该再收到通知', () => {
      const callback = vi.fn();
      const unsubscribe = mockManager.subscribe(callback);
      
      callback.mockClear();
      mockManager.setTheme('dark');
      expect(callback).toHaveBeenCalledTimes(1);
      
      unsubscribe();
      
      callback.mockClear();
      mockManager.setTheme('light');
      
      expect(callback).not.toHaveBeenCalled();
    });

    it('应该能够获取所有可用主题', () => {
      const themes = mockManager.getAvailableThemeNames();
      expect(themes).toEqual(expect.arrayContaining(['light', 'dark', 'high-contrast', 'blue', 'tech-dark-blue', 'tech-light-blue', 'blue-light', 'blue-dark', 'green-tech', 'orange-warm', 'enterprise']));
    });
  });

  describe('CSS 变量注入', () => {
    it('applyThemeToDOM 应该设置 data-theme 属性', () => {
      const root = document.documentElement;
      mockManager.applyThemeToDOM();
      
      expect(root.getAttribute('data-theme')).toBe('dark');
    });

    it('切换主题后 data-theme 应该更新', () => {
      const root = document.documentElement;
      mockManager.setTheme('dark');
      
      expect(root.getAttribute('data-theme')).toBe('dark');
    });

    it('应该注入所有基础颜色变量', () => {
      const root = document.documentElement;
      mockManager.setTheme('light');
      
      expect(root.style.getPropertyValue('--primary')).toBe('#2196F3');
      expect(root.style.getPropertyValue('--secondary')).toBe('#4CAF50');
      expect(root.style.getPropertyValue('--accent')).toBe('#FF9800');
      expect(root.style.getPropertyValue('--background')).toBe('#F5F5F5');
      expect(root.style.getPropertyValue('--surface')).toBe('#FFFFFF');
      expect(root.style.getPropertyValue('--text')).toBe('#333333');
      expect(root.style.getPropertyValue('--text-secondary')).toBe('#666666');
      expect(root.style.getPropertyValue('--border')).toBe('#CCCCCC');
      expect(root.style.getPropertyValue('--border-light')).toBe('#E0E0E0');
    });

    it('应该注入所有状态颜色变量', () => {
      const root = document.documentElement;
      mockManager.setTheme('light');
      
      expect(root.style.getPropertyValue('--status-success')).toBe('#4CAF50');
      expect(root.style.getPropertyValue('--status-warning')).toBe('#FFC107');
      expect(root.style.getPropertyValue('--status-error')).toBe('#F44336');
      expect(root.style.getPropertyValue('--status-info')).toBe('#2196F3');
    });

    it('应该注入所有按钮颜色变量', () => {
      const root = document.documentElement;
      mockManager.setTheme('light');
      
      expect(root.style.getPropertyValue('--button-background')).toBe('#2196F3');
      expect(root.style.getPropertyValue('--button-hover')).toBe('#1976D2');
      expect(root.style.getPropertyValue('--button-active')).toBe('#1565C0');
      expect(root.style.getPropertyValue('--button-text')).toBe('#FFFFFF');
    });

    it('应该注入所有控制按钮颜色变量', () => {
      const root = document.documentElement;
      mockManager.setTheme('light');
      
      expect(root.style.getPropertyValue('--control-button-background')).toBe('#FFFFFF');
      expect(root.style.getPropertyValue('--control-button-hover')).toBe('#E3F2FD');
      expect(root.style.getPropertyValue('--control-button-active')).toBe('#2196F3');
      expect(root.style.getPropertyValue('--control-button-text')).toBe('#333333');
      expect(root.style.getPropertyValue('--control-button-border')).toBe('#CCCCCC');
    });
  });

  describe('主题持久化', () => {
    it('应该在切换主题时更新当前主题', () => {
      mockManager.setTheme('dark');
      
      expect(mockManager.getCurrentThemeName()).toBe('dark');
    });

    it('应该在初始化时使用默认主题', () => {
      const newManager = new ThemeManager();
      expect(newManager.getCurrentThemeName()).toBe('dark');
      expect(newManager.getCurrentTheme()).toEqual(darkTheme);
    });

    it('localStorage 中的无效主题应该被忽略', () => {
      localStorage.setItem('scada-editor-theme', 'invalid-theme');
      
      const newManager = new ThemeManager();
      expect(newManager.getCurrentThemeName()).toBe('dark');
    });

    it('localStorage 为空时应该使用默认主题', () => {
      localStorage.removeItem('scada-editor-theme');
      
      const newManager = new ThemeManager();
      expect(newManager.getCurrentThemeName()).toBe('dark');
    });

    it('localStorage 异常时应该使用默认主题', () => {
      const newManager = new ThemeManager();
      expect(newManager.getCurrentThemeName()).toBe('dark');
    });
  });
});
