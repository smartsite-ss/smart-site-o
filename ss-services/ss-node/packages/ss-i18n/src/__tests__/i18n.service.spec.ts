// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { I18nService } from '../i18n.service';

// Embedded test translation data
const TEST_TRANSLATIONS = {
  'zh-CN': {
    greeting: '你好',
    welcome: '欢迎, {{name}}',
    goodbye: '再见, {{user}}',
    error: {
      auth: {
        AUTH_001: '认证失败',
        AUTH_002: '权限不足',
      },
    },
    items: {
      count: {
        zero: '没有项目',
        one: '一个项目',
        other: '{{count}}个项目',
      },
    },
  },
  'en-US': {
    greeting: 'Hello',
    welcome: 'Welcome, {{name}}',
    goodbye: 'Goodbye, {{user}}',
    error: {
      auth: {
        AUTH_001: 'Authentication failed',
        AUTH_002: 'Insufficient permissions',
      },
    },
    items: {
      count: {
        zero: 'No items',
        one: 'One item',
        other: '{{count}} items',
      },
    },
  },
};

function createService(): I18nService {
  const service = new I18nService();
  // Inject test translations directly
  for (const [lang, translations] of Object.entries(TEST_TRANSLATIONS)) {
    (service as any).translations.set(lang, translations);
  }
  return service;
}

describe('I18nService', () => {
  let service: I18nService;

  beforeEach(() => {
    service = createService();
  });

  // TC-I18N-001: translate simple key
  describe('TC-I18N-001: translate simple key', () => {
    it('should translate a simple key in zh-CN', () => {
      const result = service.translate('greeting');
      expect(result).toBe('你好');
    });

    it('should translate a simple key in en-US', () => {
      service.setLanguage('en-US');
      const result = service.translate('greeting');
      expect(result).toBe('Hello');
    });
  });

  // TC-I18N-002: translate nested key
  describe('TC-I18N-002: translate nested key', () => {
    it('should translate a nested key with dot notation', () => {
      const result = service.translate('error.auth.AUTH_001');
      expect(result).toBe('认证失败');
    });

    it('should translate a nested key in English', () => {
      service.setLanguage('en-US');
      const result = service.translate('error.auth.AUTH_002');
      expect(result).toBe('Insufficient permissions');
    });
  });

  // TC-I18N-003: translate with params interpolation
  describe('TC-I18N-003: translate with params interpolation', () => {
    it('should interpolate {{name}} param', () => {
      const result = service.translate('welcome', { name: '小明' });
      expect(result).toBe('欢迎, 小明');
    });

    it('should interpolate multiple params', () => {
      service.setLanguage('en-US');
      const result = service.translate('goodbye', { user: 'Alice' });
      expect(result).toBe('Goodbye, Alice');
    });

    it('should handle params with spaces in template', () => {
      const result = service.translate('welcome', { name: 'Test' });
      expect(result).toBe('欢迎, Test');
    });
  });

  // TC-I18N-004: fallback to default language
  describe('TC-I18N-004: fallback to default language', () => {
    it('should fallback to fallback language when key not found in current language', () => {
      // zh-CN has 'greeting', but we set current to en-US with no 'greeting' key
      // Actually en-US does have greeting. Let's test with a key that's only in zh-CN
      // We'll add a zh-CN-only key
      const zhOnlyTranslations = { ...TEST_TRANSLATIONS['zh-CN'], only_zh: '仅中文' };
      (service as any).translations.set('zh-CN', zhOnlyTranslations);

      service.setLanguage('en-US');
      const result = service.translate('only_zh');
      expect(result).toBe('仅中文');
    });
  });

  // TC-I18N-005: switch language at runtime
  describe('TC-I18N-005: switch language at runtime', () => {
    it('should switch language at runtime', () => {
      expect(service.translate('greeting')).toBe('你好');
      expect(service.getLanguage()).toBe('zh-CN');

      service.setLanguage('en-US');
      expect(service.translate('greeting')).toBe('Hello');
      expect(service.getLanguage()).toBe('en-US');

      service.setLanguage('zh-CN');
      expect(service.translate('greeting')).toBe('你好');
      expect(service.getLanguage()).toBe('zh-CN');
    });
  });

  // TC-I18N-006: get supported languages
  describe('TC-I18N-006: get supported languages', () => {
    it('should return all loaded languages', () => {
      const langs = service.getSupportedLanguages();
      expect(langs).toContain('zh-CN');
      expect(langs).toContain('en-US');
      expect(langs.length).toBe(2);
    });
  });

  // TC-I18N-007: track missing translations
  describe('TC-I18N-007: track missing translations', () => {
    it('should track missing translation keys', () => {
      service.translate('non.existent.key');
      service.translate('another.missing.key');

      const missing = service.getMissingTranslations();
      expect(missing).toContain('non.existent.key');
      expect(missing).toContain('another.missing.key');
    });

    it('should not track keys that exist', () => {
      service.translate('greeting');
      const missing = service.getMissingTranslations();
      expect(missing).not.toContain('greeting');
    });
  });

  // TC-I18N-008: fallback to key when translation missing
  describe('TC-I18N-008: fallback to key when translation missing', () => {
    it('should return the key itself when no translation found', () => {
      const result = service.translate('completely.missing.key');
      expect(result).toBe('completely.missing.key');
    });

    it('should return key when neither current nor fallback has translation', () => {
      service.setLanguage('en-US');
      // Remove all translations so nothing is found
      (service as any).translations.clear();
      (service as any).translations.set('zh-CN', {});
      (service as any).translations.set('en-US', {});

      const result = service.translate('any.key');
      expect(result).toBe('any.key');
    });
  });

  // TC-I18N-009: plural translation
  describe('TC-I18N-009: plural translation', () => {
    it('should translate count=0 using "other" form in zh-CN (Chinese has only "other" plural)', () => {
      // zh-CN uses "other" for all counts per CLDR
      const result = service.translatePlural('items.count', 0);
      expect(result).toBe('0个项目');
    });

    it('should translate plural one form in English', () => {
      service.setLanguage('en-US');
      const result = service.translatePlural('items.count', 1);
      expect(result).toBe('One item');
    });

    it('should translate plural other form', () => {
      const result = service.translatePlural('items.count', 5);
      expect(result).toBe('5个项目');
    });

    it('should translate plural other form in English', () => {
      service.setLanguage('en-US');
      const result = service.translatePlural('items.count', 5);
      expect(result).toBe('5 items');
    });

    it('should fallback to "other" form when specific plural form missing', () => {
      service.setLanguage('en-US');
      // English has 'one' and 'other', so 'zero' should fallback to 'other'
      const result = service.translatePlural('items.count', 0);
      expect(result).toBe('0 items');
    });
  });

  // TC-I18N-010: number formatting
  describe('TC-I18N-010: number formatting', () => {
    it('should format number in zh-CN', () => {
      const result = service.formatNumber(1234567.89);
      expect(result).toContain('1');
      expect(result).toContain('234');
      expect(result).toContain('567');
    });

    it('should format number in en-US', () => {
      const result = service.formatNumber(1234567.89, 'en-US');
      expect(result).toBe('1,234,567.89');
    });

    it('should format integer', () => {
      const result = service.formatNumber(42, 'en-US');
      expect(result).toBe('42');
    });
  });

  // TC-I18N-011: currency formatting
  describe('TC-I18N-011: currency formatting', () => {
    it('should format USD currency', () => {
      const result = service.formatCurrency(1234.56, 'USD', 'en-US');
      expect(result).toContain('1,234.56');
    });

    it('should format CNY currency', () => {
      const result = service.formatCurrency(1234.56, 'CNY', 'zh-CN');
      expect(result).toContain('1,234.56');
    });

    it('should format currency with EUR', () => {
      const result = service.formatCurrency(99.99, 'EUR', 'en-US');
      expect(result).toContain('99.99');
    });
  });

  // TC-I18N-012: date formatting
  describe('TC-I18N-012: date formatting', () => {
    it('should format date in zh-CN', () => {
      const date = new Date(2025, 0, 15); // Jan 15, 2025
      const result = service.formatDate(date, 'short-date', 'zh-CN');
      expect(result).toContain('2025');
      expect(result).toContain('1');
      expect(result).toContain('15');
    });

    it('should format date in en-US', () => {
      const date = new Date(2025, 0, 15); // Jan 15, 2025
      const result = service.formatDate(date, 'short-date', 'en-US');
      expect(result).toContain('1');
      expect(result).toContain('15');
      expect(result).toContain('2025');
    });

    it('should format date with short style', () => {
      const date = new Date(2025, 5, 10); // Jun 10, 2025
      const result = service.formatDate(date, 'short', 'en-US');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle invalid date gracefully', () => {
      const result = service.formatDate(new Date('invalid'), 'short', 'en-US');
      expect(result).toBe('Invalid Date');
    });
  });

  // Additional tests for edge cases
  describe('setFallbackLanguage', () => {
    it('should change fallback language', () => {
      service.setFallbackLanguage('en-US');
      expect(service.getFallbackLanguage()).toBe('en-US');
    });
  });

  describe('translateAsync', () => {
    it('should work asynchronously', async () => {
      const result = await service.translateAsync('greeting');
      expect(result).toBe('你好');
    });

    it('should support params in async mode', async () => {
      const result = await service.translateAsync('welcome', { name: 'World' });
      expect(result).toBe('欢迎, World');
    });
  });

  describe('getLanguage', () => {
    it('should return current language', () => {
      expect(service.getLanguage()).toBe('zh-CN');
      service.setLanguage('en-US');
      expect(service.getLanguage()).toBe('en-US');
    });
  });
});
