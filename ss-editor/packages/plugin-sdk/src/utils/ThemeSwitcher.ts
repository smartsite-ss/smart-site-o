// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ThemeProvider } from './ThemeProvider';

export interface ThemeSwitcherOptions {
  container?: HTMLElement;
  onThemeChange?: (theme: string) => void;
}

export class ThemeSwitcher {
  private _element: HTMLSelectElement | null = null;
  private _options: ThemeSwitcherOptions;
  private _unsubscribe: (() => void) | null = null;

  constructor(options: ThemeSwitcherOptions = {}) {
    this._options = options;
  }

  mount(container?: HTMLElement): HTMLSelectElement {
    const target = container ?? this._options.container ?? document.body;

    const select = document.createElement('select');
    select.className = 'ss-theme-switcher';
    select.setAttribute('aria-label', 'Theme Switcher');

    const names = ThemeProvider.availableThemes;
    for (const name of names) {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      if (name === ThemeProvider.currentTheme) {
        option.selected = true;
      }
      select.appendChild(option);
    }

    select.addEventListener('change', () => {
      const newTheme = select.value;
      ThemeProvider.setTheme(newTheme);
      this._options.onThemeChange?.(newTheme);
    });

    this._unsubscribe = ThemeProvider.onThemeChanged((theme) => {
      select.value = theme;
    });

    target.appendChild(select);
    this._element = select;

    const style = document.createElement('style');
    style.textContent = `
      .ss-theme-switcher {
        padding: 4px 8px;
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        background: var(--surface);
        color: var(--text);
        font-size: 13px;
        cursor: pointer;
        outline: none;
      }
      .ss-theme-switcher:focus {
        border-color: var(--primary);
        box-shadow: 0 0 0 2px rgba(74, 144, 164, 0.2);
      }
    `;
    document.head.appendChild(style);

    return select;
  }

  unmount(): void {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
    if (this._element) {
      this._element.remove();
      this._element = null;
    }
  }

  getElement(): HTMLSelectElement | null {
    return this._element;
  }

  static createThemeSwitcherElement(): HTMLSelectElement {
    const switcher = new ThemeSwitcher();
    return switcher.mount();
  }
}