// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { themeManager } from './ThemeManager';

type ThemeChangeCallback = (theme: string) => void;

/** @deprecated Use ThemeManager directly. Kept for backward compatibility. */
export interface IThemeEngine {
  setTheme(theme: string): void;
  getCurrentTheme(): string;
  getToken(name: string): string;
  getTokens(names: string[]): Record<string, string>;
  setTokens(tokens: Record<string, string>): void;
  onThemeChanged(cb: (theme: string) => void): () => void;
}

export const ThemeProvider = {
  /** @deprecated No longer needed — ThemeProvider uses ThemeManager directly. */
  useEngine(_engine: IThemeEngine): void {
    // no-op: ThemeProvider is now directly backed by ThemeManager
  },

  setTheme(theme: string): void {
    themeManager.setTheme(theme);
  },

  get currentTheme(): string {
    return themeManager.getCurrentThemeName();
  },

  get availableThemes(): string[] {
    return themeManager.getAvailableThemeNames();
  },

  getToken(name: string): string {
    if (typeof document === 'undefined') return '';
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || '';
  },

  getTokens(names: string[]): Record<string, string> {
    const result: Record<string, string> = {};
    for (const name of names) {
      result[name] = this.getToken(name);
    }
    return result;
  },

  setTokens(tokens: Record<string, string>): void {
    const root = document.documentElement;
    for (const [name, value] of Object.entries(tokens)) {
      root.style.setProperty(name, value);
    }
  },

  getTokenAsThreeColor(name: string): string {
    return this.getToken(name);
  },

  onThemeChanged(cb: ThemeChangeCallback): () => void {
    return themeManager.subscribe(() => {
      cb(themeManager.getCurrentThemeName());
    });
  },
};