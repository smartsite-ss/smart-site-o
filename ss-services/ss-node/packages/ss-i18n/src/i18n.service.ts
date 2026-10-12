// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

const I18N_BASE_PATH = path.join(__dirname, '..', '..', 'packages', 'ss-sdk', 'src', 'i18n');

export interface I18nContext {
  lang?: string;
}

@Injectable()
export class I18nService {
  private translations: Map<string, Record<string, any>> = new Map();
  private fallbackLanguage = 'zh-CN';
  private currentLanguage: string;
  private loaderPath: string;
  private missingKeys: Set<string> = new Set();

  constructor() {
    this.loaderPath = process.env.I18N_LOADER_PATH || I18N_BASE_PATH;
    this.fallbackLanguage = process.env.I18N_FALLBACK_LANGUAGE || 'zh-CN';
    this.currentLanguage = this.fallbackLanguage;
    this.loadAllLanguages();
  }

  private getLangDir(lang: string): string {
    const langMap: Record<string, string> = {
      'zh-CN': 'zh',
      'en-US': 'en',
      en: 'en',
      zh: 'zh',
    };
    return langMap[lang] || lang;
  }

  private loadAllLanguages(): void {
    const langs = ['zh-CN', 'en-US'];
    for (const lang of langs) {
      this.loadLanguage(lang);
    }
  }

  private loadLanguage(lang: string): void {
    const langDir = this.getLangDir(lang);
    const dirPath = path.join(this.loaderPath, langDir);

    if (!fs.existsSync(dirPath)) {
      console.warn(`[I18nService] Language directory not found: ${dirPath}`);
      return;
    }

    const allTranslations: Record<string, any> = {};

    try {
      const files = fs.readdirSync(dirPath).filter((f) => f.endsWith('.json'));

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(content);
        this.mergeDeep(allTranslations, parsed);
      }

      this.translations.set(lang, allTranslations);
    } catch (e) {
      console.warn(`[I18nService] Failed to load translations for ${lang}: ${e}`);
    }
  }

  private mergeDeep(target: Record<string, any>, source: Record<string, any>): void {
    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key]) {
          target[key] = {};
        }
        this.mergeDeep(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }

  private getNestedValue(obj: Record<string, any>, keyPath: string): any {
    const keys = keyPath.split('.');
    let current: any = obj;

    for (const key of keys) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }
      current = current[key];
    }

    return current;
  }

  private doTranslate(key: string, lang: string): string | undefined {
    if (!this.translations.has(lang)) {
      this.loadLanguage(lang);
    }

    const translation = this.translations.get(lang);
    if (!translation) {
      return undefined;
    }

    const value = this.getNestedValue(translation, key);
    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'object') {
      return undefined;
    }

    return undefined;
  }

  // ==================== Phase 1: Core Translation ====================

  /**
   * Synchronous translation with parameter interpolation.
   * Supports nested key access: translate('error.auth.AUTH_001')
   * Supports {{param}} template interpolation.
   * Fallback chain: requested language → fallback language → key itself.
   */
  translate(key: string, params?: Record<string, string | number>): string {
    const lang = this.currentLanguage;

    let result = this.doTranslate(key, lang);

    if (result === undefined && lang !== this.fallbackLanguage) {
      result = this.doTranslate(key, this.fallbackLanguage);
    }

    if (result === undefined) {
      this.missingKeys.add(key);
      result = key;
    }

    if (params && result) {
      result = this.replaceArgs(result, params);
    }

    return result;
  }

  /**
   * Async version of translate.
   */
  async translateAsync(key: string, params?: Record<string, string | number>): Promise<string> {
    return this.translate(key, params);
  }

  /**
   * Set the current language at runtime.
   */
  setLanguage(lang: string): void {
    if (!this.translations.has(lang)) {
      this.loadLanguage(lang);
    }
    this.currentLanguage = lang;
  }

  /**
   * Get the current language.
   */
  getLanguage(): string {
    return this.currentLanguage;
  }

  /**
   * Set a configurable fallback language.
   */
  setFallbackLanguage(lang: string): void {
    if (!this.translations.has(lang)) {
      this.loadLanguage(lang);
    }
    this.fallbackLanguage = lang;
  }

  /**
   * Get the fallback language.
   */
  getFallbackLanguage(): string {
    return this.fallbackLanguage;
  }

  /**
   * List all currently loaded languages.
   */
  getSupportedLanguages(): string[] {
    return Array.from(this.translations.keys());
  }

  /**
   * Track and return all missing translation keys.
   */
  getMissingTranslations(): string[] {
    return Array.from(this.missingKeys);
  }

  // ==================== Phase 2: Template Translation ====================

  /**
   * Plural translation support.
   * Uses CLDR plural categories: zero, one, two, few, many, other.
   * The translation key should have nested plural forms, e.g.:
   *   items.count: { zero: "No items", one: "One item", other: "{{count}} items" }
   */
  translatePlural(key: string, count: number, params?: Record<string, string | number>): string {
    const pluralForm = this.getPluralForm(count, this.currentLanguage);
    const pluralKey = `${key}.${pluralForm}`;

    const mergedParams = { ...params, count };

    let result = this.doTranslate(pluralKey, this.currentLanguage);

    if (result === undefined) {
      const otherKey = `${key}.other`;
      result = this.doTranslate(otherKey, this.currentLanguage);
    }

    if (result === undefined && this.currentLanguage !== this.fallbackLanguage) {
      result = this.doTranslate(pluralKey, this.fallbackLanguage);
      if (result === undefined) {
        const otherKey = `${key}.other`;
        result = this.doTranslate(otherKey, this.fallbackLanguage);
      }
    }

    if (result === undefined) {
      this.missingKeys.add(key);
      result = key;
    }

    if (mergedParams) {
      result = this.replaceArgs(result, mergedParams);
    }

    return result;
  }

  /**
   * Determine the CLDR plural form for a given count and locale.
   */
  private getPluralForm(count: number, locale: string): string {
    const lang = locale.split('-')[0];

    // Chinese, Japanese, Korean, etc. - only "other" form
    if (['zh', 'ja', 'ko', 'th', 'vi', 'id'].includes(lang)) {
      return 'other';
    }

    // English-like: one vs other
    if (lang === 'en') {
      return count === 1 ? 'one' : 'other';
    }

    // French-like: one vs other (zero at 0)
    if (lang === 'fr') {
      if (count === 0) return 'one';
      if (count === 1) return 'one';
      return 'other';
    }

    // Russian-like: complex plural rules
    if (['ru', 'uk', 'be', 'sr', 'hr'].includes(lang)) {
      const mod10 = count % 10;
      const mod100 = count % 100;
      if (mod10 === 1 && mod100 !== 11) return 'one';
      if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'few';
      return 'many';
    }

    // Arabic: complex plural rules
    if (lang === 'ar') {
      if (count === 0) return 'zero';
      if (count === 1) return 'one';
      if (count === 2) return 'two';
      const mod100 = count % 100;
      if (mod100 >= 3 && mod100 <= 10) return 'few';
      if (mod100 >= 11 && mod100 <= 99) return 'many';
      return 'other';
    }

    // Default: one vs other
    return count === 1 ? 'one' : 'other';
  }

  /**
   * Format a number according to the given locale.
   */
  formatNumber(value: number, locale?: string): string {
    const loc = locale || this.currentLanguage;
    try {
      return new Intl.NumberFormat(loc).format(value);
    } catch {
      return String(value);
    }
  }

  /**
   * Format a currency value according to the given locale.
   */
  formatCurrency(value: number, currency: string, locale?: string): string {
    const loc = locale || this.currentLanguage;
    try {
      return new Intl.NumberFormat(loc, { style: 'currency', currency }).format(value);
    } catch {
      return `${currency} ${value}`;
    }
  }

  /**
   * Format a date according to the given locale and optional format.
   * Format can be: 'short', 'medium', 'long', 'full', or a custom format.
   */
  formatDate(date: Date, format?: string, locale?: string): string {
    const loc = locale || this.currentLanguage;
    const dateObj = date instanceof Date ? date : new Date(date);

    if (isNaN(dateObj.getTime())) {
      return String(date);
    }

    try {
      if (format) {
        const options = this.getDateFormatOptions(format);
        return new Intl.DateTimeFormat(loc, options).format(dateObj);
      }
      return new Intl.DateTimeFormat(loc).format(dateObj);
    } catch {
      return dateObj.toISOString();
    }
  }

  private getDateFormatOptions(format: string): Intl.DateTimeFormatOptions {
    switch (format) {
      case 'short':
        return { dateStyle: 'short' };
      case 'medium':
        return { dateStyle: 'medium' };
      case 'long':
        return { dateStyle: 'long' };
      case 'full':
        return { dateStyle: 'full' };
      case 'short-date':
        return { year: 'numeric', month: 'numeric', day: 'numeric' };
      case 'short-time':
        return { hour: 'numeric', minute: 'numeric' };
      case 'short-datetime':
        return {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
        };
      default:
        return { dateStyle: 'medium' };
    }
  }

  // ==================== Legacy compatibility methods ====================

  translateSync(key: string, options?: I18nContext): string {
    const lang = options?.lang || this.currentLanguage;
    const result = this.doTranslate(key, lang);
    if (result === undefined) {
      if (lang !== this.fallbackLanguage) {
        const fallback = this.doTranslate(key, this.fallbackLanguage);
        if (fallback !== undefined) return fallback;
      }
      this.missingKeys.add(key);
      return key;
    }
    return result;
  }

  async t(key: string, args?: Record<string, any>, lang?: string): Promise<string> {
    const language = lang || this.currentLanguage;
    let translation = this.doTranslate(key, language);

    if (translation === undefined) {
      if (language !== this.fallbackLanguage) {
        translation = this.doTranslate(key, this.fallbackLanguage);
      }
    }

    if (translation === undefined) {
      this.missingKeys.add(key);
      return key;
    }

    if (args) {
      return this.replaceArgs(translation, args);
    }

    return translation;
  }

  tSync(key: string, args?: Record<string, any>, lang?: string): string {
    const language = lang || this.currentLanguage;
    let translation = this.doTranslate(key, language);

    if (translation === undefined) {
      if (language !== this.fallbackLanguage) {
        translation = this.doTranslate(key, this.fallbackLanguage);
      }
    }

    if (translation === undefined) {
      this.missingKeys.add(key);
      return key;
    }

    if (args) {
      return this.replaceArgs(translation, args);
    }

    return translation;
  }

  // ==================== Private helpers ====================

  private replaceArgs(text: string, args: Record<string, any>): string {
    let result = text;
    for (const [key, value] of Object.entries(args)) {
      result = result.replace(
        new RegExp(`\\{\\{\\s*${this.escapeRegExp(key)}\\s*\\}\\}`, 'g'),
        String(value),
      );
    }
    return result;
  }

  private escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
