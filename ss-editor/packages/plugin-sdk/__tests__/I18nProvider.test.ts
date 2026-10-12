// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach } from 'vitest';
import { I18nProvider } from '../src/utils/I18nProvider';

describe('I18nProvider', () => {
  beforeEach(async () => {
    await I18nProvider.setLocale('zh-CN');
  });

  describe('locale', () => {
    it('should default to zh-CN', () => {
      expect(I18nProvider.locale).toBe('zh-CN');
    });
  });

  describe('tCommon', () => {
    it('should return Chinese translation by default', () => {
      expect(I18nProvider.tCommon('ok')).toBe('确定');
      expect(I18nProvider.tCommon('cancel')).toBe('取消');
      expect(I18nProvider.tCommon('save')).toBe('保存');
    });

    it('should return English after locale switch', async () => {
      await I18nProvider.setLocale('en-US');
      expect(I18nProvider.tCommon('ok')).toBe('OK');
      expect(I18nProvider.tCommon('cancel')).toBe('Cancel');
      expect(I18nProvider.tCommon('save')).toBe('Save');
    });

    it('should return fallback for unknown key', () => {
      expect(I18nProvider.tCommon('nonexistent', 'fallback')).toBe('fallback');
    });

    it('should return path as fallback when no fallback provided', () => {
      expect(I18nProvider.tCommon('nonexistent')).toBe('common.nonexistent');
    });
  });

  describe('tCategory', () => {
    it('should translate category names', () => {
      expect(I18nProvider.tCategory('basic')).toBe('基础组件');
      expect(I18nProvider.tCategory('svg')).toBe('SVG 组件');
      expect(I18nProvider.tCategory('3d')).toBe('3D 组件');
    });

    it('should return fallback for unknown category', () => {
      expect(I18nProvider.tCategory('unknown_cat', 'Unknown')).toBe('Unknown');
    });
  });

  describe('t', () => {
    it('should resolve nested paths', () => {
      expect(I18nProvider.t('__system__', 'common.ok')).toBe('确定');
    });

    it('should fallback to system when plugin not registered', () => {
      expect(I18nProvider.t('unknown_plugin', 'common.ok')).toBe('确定');
    });

    it('should return fallback for missing path', () => {
      expect(I18nProvider.t('__system__', 'nonexistent.path', 'fallback')).toBe('fallback');
    });
  });

  describe('setLocale', () => {
    it('should change locale', async () => {
      await I18nProvider.setLocale('en-US');
      expect(I18nProvider.locale).toBe('en-US');
      expect(I18nProvider.tCommon('edit')).toBe('Edit');
    });

    it('should notify listeners on locale change', async () => {
      let notified = false;
      const unsubscribe = I18nProvider.onLocaleChanged(() => {
        notified = true;
      });

      await I18nProvider.setLocale('en-US');
      expect(notified).toBe(true);

      unsubscribe();
    });
  });

  describe('onLocaleChanged', () => {
    it('should not call listener after unsubscribe', async () => {
      let count = 0;
      const unsubscribe = I18nProvider.onLocaleChanged(() => {
        count++;
      });

      unsubscribe();
      await I18nProvider.setLocale('en-US');
      expect(count).toBe(0);

      await I18nProvider.setLocale('zh-CN');
    });
  });

  describe('registerPluginLocale', () => {
    it('should register and use plugin locale', async () => {
      I18nProvider.registerPluginLocale('my-plugin', async () => ({
        default: {
          label: 'My Label',
          description: 'My Description',
        },
      }));

      await I18nProvider.setLocale('en-US');
      expect(I18nProvider.t('my-plugin', 'label')).toBe('My Label');
      expect(I18nProvider.t('my-plugin', 'description')).toBe('My Description');
    });

    it('should overwrite existing loader', async () => {
      I18nProvider.registerPluginLocale('test-plugin', async () => ({
        default: { label: 'v1' },
      }));
      I18nProvider.registerPluginLocale('test-plugin', async () => ({
        default: { label: 'v2' },
      }));

      await I18nProvider.setLocale('en-US');
      expect(I18nProvider.t('test-plugin', 'label')).toBe('v2');
    });

    it('should silently skip loader errors', async () => {
      I18nProvider.registerPluginLocale('bad-plugin', async () => {
        throw new Error('Not found');
      });

      await I18nProvider.setLocale('en-US');
      expect(I18nProvider.t('bad-plugin', 'label', 'fallback')).toBe('fallback');
    });
  });
});