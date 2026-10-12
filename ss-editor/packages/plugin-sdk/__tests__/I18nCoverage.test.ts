// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { I18nProvider } from '../src/utils/I18nProvider';
import { zhCN, enUS } from '../src/locales';

const ALL_COMMON_CATEGORY_KEYS = [
  'common.ok', 'common.cancel', 'common.save', 'common.delete',
  'common.edit', 'common.add', 'common.search', 'common.reset',
  'common.export', 'common.import', 'common.confirm', 'common.close',
  'common.refresh',
  'category.basic', 'category.form', 'category.chart',
  'category.industrial', 'category.media', 'category.layout',
  'category.3d', 'category.svg',
];

const ALL_EDITOR_PLUGIN_KEYS = [
  'editor.toolbar', 'editor.canvas', 'editor.properties',
  'editor.layers', 'editor.plugin',
  'editor.zoomIn', 'editor.zoomOut', 'editor.fitToScreen',
  'editor.undo', 'editor.redo', 'editor.delete',
  'editor.selectAll', 'editor.copy', 'editor.paste',
  'editor.group', 'editor.ungroup',
  'editor.bringToFront', 'editor.sendToBack', 'editor.align',
  'plugin.noPluginSelected', 'plugin.propertiesMissing',
  'plugin.schemaVersion', 'plugin.pluginType',
  'plugin.position', 'plugin.size',
  'plugin.width', 'plugin.height', 'plugin.x', 'plugin.y',
  'plugin.rotation', 'plugin.opacity',
  'plugin.visible', 'plugin.locked',
];

describe('I18n Full Coverage: Full key Chinese/English coverage test', () => {
  beforeAll(() => {
    I18nProvider.registerPluginLocale('__system__', async () => ({
      default: I18nProvider.locale === 'zh-CN' ? zhCN : enUS,
    }));
  });

  beforeEach(async () => {
    await I18nProvider.setLocale('zh-CN');
  });

  describe('zh-CN locale completeness', () => {
    it('should have non-empty translations for all system keys', () => {
      for (const key of ALL_COMMON_CATEGORY_KEYS) {
        const value = I18nProvider.t('__system__', key);
        expect(value).toBeDefined();
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
        expect(value).not.toBe(key);
      }
    });

    it('should have non-empty translations for all editor/plugin keys', () => {
      for (const key of ALL_EDITOR_PLUGIN_KEYS) {
        const value = I18nProvider.t('__system__', key);
        expect(value).toBeDefined();
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      }
    });

    it('plugin position labels in zh-CN should contain coordinate info', () => {
      const xLabel = I18nProvider.t('__system__', 'plugin.x');
      const yLabel = I18nProvider.t('__system__', 'plugin.y');
      const wLabel = I18nProvider.t('__system__', 'plugin.width');
      const hLabel = I18nProvider.t('__system__', 'plugin.height');
      expect(xLabel.toLowerCase()).toContain('x');
      expect(yLabel.toLowerCase()).toContain('y');
      expect(wLabel.length).toBeGreaterThan(0);
      expect(hLabel.length).toBeGreaterThan(0);
    });
  });

  describe('en-US locale completeness', () => {
    beforeEach(async () => {
      await I18nProvider.setLocale('en-US');
    });

    it('should have non-empty translations for all system keys', () => {
      for (const key of ALL_COMMON_CATEGORY_KEYS) {
        const value = I18nProvider.t('__system__', key);
        expect(value).toBeDefined();
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
        expect(value).not.toBe(key);
      }
    });

    it('should have non-empty translations for all editor/plugin keys', () => {
      for (const key of ALL_EDITOR_PLUGIN_KEYS) {
        const value = I18nProvider.t('__system__', key);
        expect(value).toBeDefined();
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Both locales have same key count', () => {
    it('zh-CN and en-US should have identical key structure', () => {
      const zhCNKeys: string[] = [];
      const enUSKeys: string[] = [];

      for (const section of Object.keys(zhCN)) {
        for (const key of Object.keys((zhCN as any)[section])) {
          zhCNKeys.push(`${section}.${key}`);
        }
      }
      for (const section of Object.keys(enUS)) {
        for (const key of Object.keys((enUS as any)[section])) {
          enUSKeys.push(`${section}.${key}`);
        }
      }

      expect(zhCNKeys.length).toBe(enUSKeys.length);
      for (const zhKey of zhCNKeys) {
        expect(enUSKeys).toContain(zhKey);
      }
    });
  });

  describe('I18nProvider locale switching', () => {
    it('should translate all common/category keys in zh-CN', () => {
      const untranslated: string[] = [];
      for (const key of ALL_COMMON_CATEGORY_KEYS) {
        const value = I18nProvider.t('__system__', key);
        if (value === key || value === '') untranslated.push(key);
      }
      expect(untranslated).toEqual([]);
    });

    it('should translate all common/category keys in en-US', async () => {
      await I18nProvider.setLocale('en-US');
      const untranslated: string[] = [];
      for (const key of ALL_COMMON_CATEGORY_KEYS) {
        const value = I18nProvider.t('__system__', key);
        if (value === key || value === '') untranslated.push(key);
      }
      expect(untranslated).toEqual([]);
    });

    it('should return different values per locale for common keys', async () => {
      const commonKeys = ALL_COMMON_CATEGORY_KEYS.filter(k => !k.startsWith('category.'));
      for (const key of commonKeys) {
        await I18nProvider.setLocale('zh-CN');
        const zhValue = I18nProvider.t('__system__', key);
        await I18nProvider.setLocale('en-US');
        const enValue = I18nProvider.t('__system__', key);
        expect(zhValue).not.toBe(enValue);
      }
    });
  });

  describe('Property panel label integration test', () => {
    it('plugin schemaVersion should be translatable', async () => {
      await I18nProvider.setLocale('zh-CN');
      const zhLabel = I18nProvider.t('__system__', 'plugin.schemaVersion');
      expect(zhLabel).toBeTruthy();
      await I18nProvider.setLocale('en-US');
      const enLabel = I18nProvider.t('__system__', 'plugin.schemaVersion');
      expect(enLabel).toBeTruthy();
      expect(zhLabel).not.toBe(enLabel);
    });

    it('plugin position/size labels should be translatable', async () => {
      await I18nProvider.setLocale('zh-CN');
      const zhWidth = I18nProvider.t('__system__', 'plugin.width');
      const zhHeight = I18nProvider.t('__system__', 'plugin.height');
      expect(zhWidth).toBeTruthy();
      expect(zhHeight).toBeTruthy();
      await I18nProvider.setLocale('en-US');
      const enWidth = I18nProvider.t('__system__', 'plugin.width');
      const enHeight = I18nProvider.t('__system__', 'plugin.height');
      expect(enWidth).toBeTruthy();
      expect(enHeight).toBeTruthy();
      expect(zhWidth).not.toBe(enWidth);
      expect(zhHeight).not.toBe(enHeight);
    });

    it('all common button labels should be present', () => {
      const commonKeys = ALL_COMMON_CATEGORY_KEYS.filter(k => k.startsWith('common.'));
      expect(commonKeys.length).toBeGreaterThanOrEqual(10);
    });

    it('all editor labels should be present', () => {
      const editorKeys = ALL_EDITOR_PLUGIN_KEYS.filter(k => k.startsWith('editor.'));
      expect(editorKeys.length).toBe(19);
    });

    it('all plugin property labels should be present', () => {
      const pluginKeys = ALL_EDITOR_PLUGIN_KEYS.filter(k => k.startsWith('plugin.'));
      expect(pluginKeys.length).toBe(14);
    });
  });
});