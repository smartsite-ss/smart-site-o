// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { I18nProvider } from './I18nProvider';
import type { SupportedLocale } from './I18nProvider';

export interface LanguageSwitcherOptions {
  container?: HTMLElement;
  supportedLocales?: SupportedLocale[];
  onLocaleChange?: (locale: SupportedLocale) => void;
}

export class LanguageSwitcher {
  private _element: HTMLSelectElement | null = null;
  private _options: LanguageSwitcherOptions;
  private _unsubscribe: (() => void) | null = null;

  private static _localeKeyMap: Record<SupportedLocale, string> = {
    'zh-CN': 'zhCN',
    'en-US': 'enUS',
  };

  constructor(options: LanguageSwitcherOptions = {}) {
    this._options = options;
  }

  async mount(container?: HTMLElement): Promise<HTMLSelectElement> {
    const target = container ?? this._options.container ?? document.body;
    const locales = this._options.supportedLocales ?? (['zh-CN', 'en-US'] as SupportedLocale[]);

    const select = document.createElement('select');
    select.className = 'ss-language-switcher';
    select.setAttribute('aria-label', 'Language Switcher');

    for (const locale of locales) {
      const option = document.createElement('option');
      option.value = locale;
      option.textContent = I18nProvider.t('__system__', `language.${LanguageSwitcher._localeKeyMap[locale]}`);
      if (locale === I18nProvider.locale) {
        option.selected = true;
      }
      select.appendChild(option);
    }

    select.addEventListener('change', async () => {
      const newLocale = select.value as SupportedLocale;
      await I18nProvider.setLocale(newLocale);
      this._options.onLocaleChange?.(newLocale);
    });

    this._unsubscribe = I18nProvider.onLocaleChanged(() => {
      select.value = I18nProvider.locale;
    });

    target.appendChild(select);
    this._element = select;

    const style = document.createElement('style');
    style.textContent = `
      .ss-language-switcher {
        padding: 4px 8px;
        border: 1px solid var(--ss-border-color, #d9d9d9);
        border-radius: 4px;
        background: var(--ss-bg-color, #fff);
        color: var(--ss-text-color, #333);
        font-size: 13px;
        cursor: pointer;
        outline: none;
      }
      .ss-language-switcher:focus {
        border-color: var(--ss-primary-color, #4A90A4);
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
}