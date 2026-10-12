// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { Theme, ThemeName } from './theme-config';
import { lightTheme, defaultThemeName } from './theme-config';
import { themeRegistry } from './ThemeRegistry';

type ThemeCallback = (theme: Theme) => void;

const STORAGE_KEY = 'scada-editor-theme';

export class ThemeManager {
  private currentThemeName: string = defaultThemeName;
  private callbacks: Set<ThemeCallback> = new Set();
  private isDOMReady: boolean = typeof document !== 'undefined';

  constructor() {
    this.loadThemeFromStorage();
    if (this.isDOMReady) {
      this.applyThemeToDOM();
    }
  }

  private loadThemeFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && themeRegistry.get(stored)) {
        this.currentThemeName = stored;
      }
    } catch {
      console.warn('Failed to load theme from localStorage');
    }
  }

  private saveThemeToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, this.currentThemeName);
    } catch {
      console.warn('Failed to save theme to localStorage');
    }
  }

  getCurrentThemeName(): string {
    return this.currentThemeName;
  }

  getCurrentTheme(): Theme {
    return themeRegistry.get(this.currentThemeName) || lightTheme;
  }

  setTheme(name: string): void {
    if (!themeRegistry.get(name)) {
      console.warn(`Theme "${name}" not found, falling back to "${defaultThemeName}"`);
      name = defaultThemeName;
    }

    this.currentThemeName = name;
    this.saveThemeToStorage();
    this.applyThemeToDOM();
    this.notifyCallbacks();
  }

  applyThemeToDOM(): void {
    const theme = this.getCurrentTheme();
    const root = document.documentElement;

    root.setAttribute('data-theme', this.currentThemeName);

    root.style.setProperty('--primary', theme.primary);
    root.style.setProperty('--secondary', theme.secondary);
    root.style.setProperty('--accent', theme.accent);

    root.style.setProperty('--background', theme.background);
    root.style.setProperty('--surface', theme.surface);
    root.style.setProperty('--header-background', theme.headerBackground);
    root.style.setProperty('--elevated', theme.elevated);
    root.style.setProperty('--backdrop', theme.backDrop);

    root.style.setProperty('--text', theme.text);
    root.style.setProperty('--text-secondary', theme.textSecondary);
    root.style.setProperty('--text-tertiary', theme.textTertiary);
    root.style.setProperty('--text-disabled', theme.textDisabled);
    root.style.setProperty('--header-text', theme.headerText);

    root.style.setProperty('--border', theme.border);
    root.style.setProperty('--border-light', theme.borderLight);
    root.style.setProperty('--border-focus', theme.borderFocus);

    root.style.setProperty('--button-background', theme.button.background);
    root.style.setProperty('--button-hover', theme.button.hover);
    root.style.setProperty('--button-active', theme.button.active);
    root.style.setProperty('--button-text', theme.button.text);

    root.style.setProperty('--control-button-background', theme.controlButton.background);
    root.style.setProperty('--control-button-hover', theme.controlButton.hover);
    root.style.setProperty('--control-button-active', theme.controlButton.active);
    root.style.setProperty('--control-button-text', theme.controlButton.text);
    root.style.setProperty('--control-button-border', theme.controlButton.border);

    root.style.setProperty('--status-success', theme.status.success);
    root.style.setProperty('--status-warning', theme.status.warning);
    root.style.setProperty('--status-error', theme.status.error);
    root.style.setProperty('--status-info', theme.status.info);

    root.style.setProperty('--radius-sm', theme.radius.sm);
    root.style.setProperty('--radius-md', theme.radius.md);
    root.style.setProperty('--radius-lg', theme.radius.lg);
    root.style.setProperty('--radius-xl', theme.radius.xl);

    root.style.setProperty('--shadow-small', theme.shadow.small);
    root.style.setProperty('--shadow-medium', theme.shadow.medium);
    root.style.setProperty('--shadow-large', theme.shadow.large);
    root.style.setProperty('--shadow-card', theme.shadow.card);
    root.style.setProperty('--shadow-modal', theme.shadow.modal);
    root.style.setProperty('--shadow-dropdown', theme.shadow.dropdown);

    root.style.setProperty('--transition-fast', theme.transition.fast);
    root.style.setProperty('--transition-normal', theme.transition.normal);
    root.style.setProperty('--transition-slow', theme.transition.slow);
    root.style.setProperty('--transition-theme', theme.transition.theme);

    if (theme.industrial) {
      const ind = theme.industrial;
      root.style.setProperty('--industrial-pipe-flowing', ind.pipeFlowing);
      root.style.setProperty('--industrial-pipe-stopped', ind.pipeStopped);
      root.style.setProperty('--industrial-pipe-blocked', ind.pipeBlocked);
      root.style.setProperty('--industrial-tank-normal', ind.tankNormal);
      root.style.setProperty('--industrial-tank-high', ind.tankHigh);
      root.style.setProperty('--industrial-tank-low', ind.tankLow);
      root.style.setProperty('--industrial-gauge-normal', ind.gaugeNormal);
      root.style.setProperty('--industrial-gauge-warn', ind.gaugeWarn);
      root.style.setProperty('--industrial-gauge-alarm', ind.gaugeAlarm);
      root.style.setProperty('--industrial-valve-open', ind.valveOpen);
      root.style.setProperty('--industrial-valve-closed', ind.valveClosed);
      root.style.setProperty('--industrial-alarm-critical', ind.alarmCritical);
      root.style.setProperty('--industrial-alarm-major', ind.alarmMajor);
      root.style.setProperty('--industrial-alarm-minor', ind.alarmMinor);
    }
  }

  subscribe(callback: ThemeCallback): () => void {
    this.callbacks.add(callback);
    callback(this.getCurrentTheme());
    return () => this.callbacks.delete(callback);
  }

  private notifyCallbacks(): void {
    const theme = this.getCurrentTheme();
    this.callbacks.forEach(callback => callback(theme));
  }

  getAvailableThemeNames(): string[] {
    return themeRegistry.getNames();
  }
}

export const themeManager = new ThemeManager();
export type { Theme, ThemeName };