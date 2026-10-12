// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import { generateThemeCSS, generateAllThemeCSS } from '../src/utils/css-themes';

describe('generateThemeCSS', () => {
  it('should generate CSS for blue-light theme', () => {
    const css = generateThemeCSS('blue-light');
    expect(css).toContain('[data-theme="blue-light"]');
    expect(css).toContain('--ss-color-primary');
    expect(css).toContain('--ss-bg-canvas');
    expect(css).toContain('--ss-text-primary');
    expect(css).toContain('--ss-pipe-flowing');
    expect(css).toContain('--ss-gauge-normal');
  });

  it('should generate CSS for dark theme', () => {
    const css = generateThemeCSS('dark');
    expect(css).toContain('[data-theme="dark"]');
    expect(css).toContain('--ss-color-primary');
  });

  it('should not contain empty rules', () => {
    const css = generateThemeCSS('blue-light');
    expect(css.length).toBeGreaterThan(100);
  });

  it('should handle all 11 themes', () => {
    const themes = [
      'light', 'dark', 'high-contrast', 'blue',
      'tech-dark-blue', 'tech-light-blue',
      'blue-light', 'blue-dark', 'green-tech', 'orange-warm', 'enterprise',
    ];
    for (const theme of themes) {
      const css = generateThemeCSS(theme);
      expect(css).toContain(`[data-theme="${theme}"]`);
    }
  });
});

describe('generateAllThemeCSS', () => {
  it('should generate CSS for all 11 themes', () => {
    const css = generateAllThemeCSS();
    expect(css).toContain('[data-theme="blue-light"]');
    expect(css).toContain('[data-theme="blue-dark"]');
    expect(css).toContain('[data-theme="green-tech"]');
    expect(css).toContain('[data-theme="orange-warm"]');
    expect(css).toContain('[data-theme="enterprise"]');
  });

  it('should separate themes with newlines', () => {
    const css = generateAllThemeCSS();
    const themeBlocks = css.split('\n\n');
    expect(themeBlocks.length).toBeGreaterThanOrEqual(10);
  });
});