// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { ThemeProvider } from '../src/utils/ThemeProvider';

describe('ThemeProvider', () => {
  describe('currentTheme', () => {
    it('should default to dark', () => {
      expect(ThemeProvider.currentTheme).toBe('dark');
    });
  });

  describe('setTheme', () => {
    it('should change current theme', () => {
      ThemeProvider.setTheme('blue-dark');
      expect(ThemeProvider.currentTheme).toBe('blue-dark');

      ThemeProvider.setTheme('dark');
      expect(ThemeProvider.currentTheme).toBe('dark');
    });

    it('should set data-theme attribute on document', () => {
      ThemeProvider.setTheme('green-tech');
      expect(document.documentElement.getAttribute('data-theme')).toBe('green-tech');

      ThemeProvider.setTheme('dark');
    });
  });

  describe('onThemeChanged', () => {
    it('should notify listeners when theme changes', () => {
      const calls: string[] = [];
      // Reset to dark first (onThemeChanged is called on subscribe with current theme)
      ThemeProvider.setTheme('dark');
      const unsubscribe = ThemeProvider.onThemeChanged((theme) => {
        calls.push(theme);
      });

      ThemeProvider.setTheme('orange-warm');
      expect(calls).toContain('orange-warm');

      ThemeProvider.setTheme('enterprise');
      expect(calls).toContain('enterprise');

      unsubscribe();
      ThemeProvider.setTheme('dark');
      // After unsubscribe, calls should not increase
      const callCountAfterUnsub = calls.length;
      ThemeProvider.setTheme('blue-light');
      expect(calls).toHaveLength(callCountAfterUnsub);

      ThemeProvider.setTheme('dark');
    });

    it('should not call listener after unsubscribe', () => {
      let called = false;
      ThemeProvider.setTheme('dark');
      const unsubscribe = ThemeProvider.onThemeChanged(() => {
        called = true;
      });

      unsubscribe();
      called = false;
      ThemeProvider.setTheme('blue-dark');
      expect(called).toBe(false);

      ThemeProvider.setTheme('dark');
    });
  });

  describe('getToken', () => {
    it('should read CSS custom properties', () => {
      document.documentElement.style.setProperty('--test-color', '#FF0000');
      const value = ThemeProvider.getToken('--test-color');
      expect(value).toBe('#FF0000');
      document.documentElement.style.removeProperty('--test-color');
    });

    it('should return empty string for missing token', () => {
      const value = ThemeProvider.getToken('--non-existent');
      expect(value).toBe('');
    });
  });

  describe('getTokens', () => {
    it('should read multiple CSS custom properties', () => {
      document.documentElement.style.setProperty('--a', '1');
      document.documentElement.style.setProperty('--b', '2');
      const tokens = ThemeProvider.getTokens(['--a', '--b', '--c']);
      expect(tokens['--a']).toBe('1');
      expect(tokens['--b']).toBe('2');
      expect(tokens['--c']).toBe('');
      document.documentElement.style.removeProperty('--a');
      document.documentElement.style.removeProperty('--b');
    });
  });

  describe('setTokens', () => {
    it('should set CSS custom properties', () => {
      ThemeProvider.setTokens({ '--set-a': 'valA' });
      expect(document.documentElement.style.getPropertyValue('--set-a')).toBe('valA');
      document.documentElement.style.removeProperty('--set-a');
    });
  });
});