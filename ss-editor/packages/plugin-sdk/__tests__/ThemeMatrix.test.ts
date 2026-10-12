// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import { generateThemeCSS, generateAllThemeCSS } from '../src/utils/css-themes';

const ALL_THEMES = [
  'light', 'dark', 'high-contrast', 'blue',
  'tech-dark-blue', 'tech-light-blue',
  'blue-light', 'blue-dark', 'green-tech', 'orange-warm', 'enterprise',
] as const;

const EXPECTED_CSS_VARS = [
  '--ss-color-primary',
  '--ss-color-success',
  '--ss-color-warning',
  '--ss-color-danger',
  '--ss-color-info',
  '--ss-bg-canvas',
  '--ss-bg-surface',
  '--ss-border-default',
  '--ss-text-primary',
  '--ss-text-secondary',
  '--ss-pipe-flowing',
  '--ss-pipe-stopped',
  '--ss-pipe-blocked',
  '--ss-tank-normal',
  '--ss-tank-high',
  '--ss-gauge-normal',
  '--ss-gauge-warn',
];

describe('Theme Matrix Test: 11 themes matrix', () => {
  describe('generateThemeCSS', () => {
    for (const theme of ALL_THEMES) {
      describe('theme: ${theme}', () => {
        it('should generate valid CSS selector', () => {
          const css = generateThemeCSS(theme);
          expect(css).toContain(`[data-theme="${theme}"]`);
        });

        it('should define all expected CSS custom properties', () => {
          const css = generateThemeCSS(theme);
          for (const varName of EXPECTED_CSS_VARS) {
            expect(css).toContain(varName);
          }
        });

        it('should produce syntactically valid CSS block', () => {
          const css = generateThemeCSS(theme);
          expect(css.startsWith(`[data-theme="${theme}"] {`)).toBe(true);
          expect(css.endsWith('}')).toBe(true);
          expect((css.match(/{/g) || []).length).toBe((css.match(/}/g) || []).length);
        });

        it('should have non-empty color values', () => {
          const css = generateThemeCSS(theme);
          const lines = css.split('\n').filter(l => l.includes(':'));
          for (const line of lines) {
            const value = line.split(':')[1]?.trim().replace(';', '');
            expect(value).toBeTruthy();
            expect(value!.length).toBeGreaterThan(1);
          }
        });

        it('should have valid hex, rgb, hsl or var color values', () => {
          const css = generateThemeCSS(theme);
          const lines = css.split('\n').filter(l => l.includes(':'));
          for (const line of lines) {
            const value = line.split(':')[1]?.trim().replace(';', '');
            const isValid =
              /^#[0-9a-fA-F]{3,8}$/.test(value!) ||
              /^rgba?\(/.test(value!) ||
              /^hsla?\(/.test(value!) ||
              /^hsl\(/.test(value!) ||
              /^var\(/.test(value!) ||
              ['0', 'none', 'inherit', 'initial', 'unset', 'transparent', 'currentColor'].includes(value!);
            expect(isValid).toBe(true);
          }
        });

        it('should be unique compared to other themes', () => {
          const css = generateThemeCSS(theme);
          for (const other of ALL_THEMES) {
            if (other === theme) continue;
            const otherCSS = generateThemeCSS(other);
            expect(css).not.toBe(otherCSS);
          }
        });
      });
    }
  });

  describe('generateAllThemeCSS', () => {
    it('should contain blocks for all 11 themes', () => {
      const css = generateAllThemeCSS();
      for (const theme of ALL_THEMES) {
        expect(css).toContain(`[data-theme="${theme}"]`);
      }
    });

    it('should have 11 top-level CSS blocks', () => {
      const css = generateAllThemeCSS();
      const blocks = css.match(/\[data-theme="/g);
      expect(blocks).toHaveLength(11);
    });

    it('should separate themes with newlines', () => {
      const css = generateAllThemeCSS();
      const themeBlocks = css.split('\n}\n\n');
      expect(themeBlocks.length).toBeGreaterThanOrEqual(10);
    });
  });
});