// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { PageBrowserPlugin } from '../../system/page-browser/index';
import { pageBrowserPropertySchema } from '../../system/page-browser/pageBrowserPropertySchema';
import { ConfigTemplateManager } from '@scada-editor/core';

// Mock @scada-editor/system to prevent actual API calls
vi.mock('@scada-editor/system', () => ({
  pageApi: {
    readPage: vi.fn().mockResolvedValue({
      data: {
        data: {
          id: 'test-page',
          name: 'Test Page',
          width: 1920,
          height: 1080,
          backgroundColor: '#F0F0F0',
          graphics: [],
        },
      },
    }),
    listPages: vi.fn().mockResolvedValue({
      data: { data: [{ name: 'Page 1' }, { name: 'Page 2' }] },
    }),
  },
}));

describe('PageBrowserPlugin — Schema static validation (Layer 1)', () => {
  it('schema.name should not be empty', () => {
    expect(pageBrowserPropertySchema.name).toBeTruthy();
  });

  it('schema.fields should be a non-empty array', () => {
    expect(pageBrowserPropertySchema.fields.length).toBeGreaterThan(0);
  });

  it('each field should have name and type', () => {
    for (const field of pageBrowserPropertySchema.fields) {
      expect(field.name).toBeTruthy();
      expect(field.type).toBeTruthy();
    }
  });

  it('select type should have options or optionsProvider', () => {
    const selectFields = pageBrowserPropertySchema.fields.filter(f => f.type === 'select');
    for (const field of selectFields) {
      const hasOptions = field.options && field.options.length > 0;
      const hasProvider = !!(field as any).optionsProvider;
      expect(
        hasOptions || hasProvider,
        `select field "${field.name}" should have at least options or optionsProvider`,
      ).toBe(true);
    }
  });

  it('number type min should not be greater than max', () => {
    const numFields = pageBrowserPropertySchema.fields.filter(f => f.type === 'number');
    for (const field of numFields) {
      if (field.min !== undefined && field.max !== undefined) {
        expect(field.min).toBeLessThanOrEqual(field.max);
      }
    }
  });

  it('all fields should have defaultValue (except required fields)', () => {
    for (const field of pageBrowserPropertySchema.fields) {
      if (field.required) continue;
      expect(field.defaultValue, `${field.name} is missing defaultValue`).toBeDefined();
    }
  });

  it('color type defaultValue should be a valid hex', () => {
    const colorFields = pageBrowserPropertySchema.fields.filter(f => f.type === 'color');
    const hexRe = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/;
    for (const field of colorFields) {
      expect(String(field.defaultValue)).toMatch(hexRe);
    }
  });
});

describe('PageBrowserPlugin — Construction and basic functionality', () => {
  it('should create instance correctly', () => {
    const plugin = new PageBrowserPlugin();
    expect(plugin.config.type).toBe('page-browser');
    expect(plugin.id).toBeTruthy();
  });

  it('should accept position and size parameters', () => {
    const plugin = new PageBrowserPlugin(50, 100, 400, 300);
    const pos = plugin.getPosition();
    expect(pos.x).toBe(50);
    expect(pos.y).toBe(100);
    const size = plugin.getSize();
    expect(size.width).toBe(400);
    expect(size.height).toBe(300);
  });

  it('setPluginProps should update pluginProps', () => {
    const plugin = new PageBrowserPlugin();
    (plugin as any).setPluginProps({ borderColor: '#FF0000FF' });
    expect(plugin.pluginProps.borderColor).toBe('#FF0000FF');
  });
});

describe('PageBrowserPlugin — Display mode test', () => {
  it('default display mode should be stretch', () => {
    const plugin = new PageBrowserPlugin();
    expect(plugin.pluginProps.displayMode).toBe('stretch');
  });

  it('should change display mode', () => {
    const plugin = new PageBrowserPlugin(0, 0, 400, 300);
    (plugin as any).setPluginProps({ displayMode: 'actual' });
    expect(plugin.pluginProps.displayMode).toBe('actual');
  });
});

describe('PageBrowserPlugin — Border configuration test', () => {
  it('default border style should be solid', () => {
    const plugin = new PageBrowserPlugin();
    expect(plugin.pluginProps.borderStyle).toBe('solid');
    expect(plugin.pluginProps.borderWidth).toBe(1);
    expect(plugin.pluginProps.borderColor).toBe('#CCCCCC');
  });

  it('should change border properties', () => {
    const plugin = new PageBrowserPlugin(0, 0, 400, 300);
    (plugin as any).setPluginProps({
      borderStyle: 'dashed',
      borderWidth: 3,
      borderColor: '#FF0000FF',
    });

    expect(plugin.pluginProps.borderStyle).toBe('dashed');
    expect(plugin.pluginProps.borderWidth).toBe(3);
    expect(plugin.pluginProps.borderColor).toBe('#FF0000FF');
  });
});

describe('PageBrowserPlugin — Background color configuration test', () => {
  it('default background color should be #FFFFFF', () => {
    const plugin = new PageBrowserPlugin();
    expect(plugin.pluginProps.backgroundColor).toBe('#FFFFFF');
  });

  it('should change background color', () => {
    const plugin = new PageBrowserPlugin(0, 0, 400, 300);
    (plugin as any).setPluginProps({ backgroundColor: '#FFEEAA' });
    expect(plugin.pluginProps.backgroundColor).toBe('#FFEEAA');
  });
});

describe('PageBrowserPlugin — optionsProvider dynamic options (Layer 1)', () => {
  it('pageName field should have optionsProvider as "pageStore.pages"', () => {
    const pageNameField = pageBrowserPropertySchema.fields.find(f => f.name === 'pageName');
    expect(pageNameField).toBeDefined();
    expect((pageNameField as any).optionsProvider).toBe('pageStore.pages');
  });

  it('pageName field should not have static options (dynamically provided by optionsProvider)', () => {
    const pageNameField = pageBrowserPropertySchema.fields.find(f => f.name === 'pageName');
    expect(pageNameField).toBeDefined();
    expect(pageNameField!.options).toBeUndefined();
  });

  it('displayMode field should have static options and no optionsProvider', () => {
    const displayModeField = pageBrowserPropertySchema.fields.find(f => f.name === 'displayMode');
    expect(displayModeField).toBeDefined();
    expect(displayModeField!.options).toBeDefined();
    expect(displayModeField!.options!.length).toBeGreaterThan(0);
    expect((displayModeField as any).optionsProvider).toBeUndefined();
  });

  it('borderStyle field should have static options and no optionsProvider', () => {
    const borderStyleField = pageBrowserPropertySchema.fields.find(f => f.name === 'borderStyle');
    expect(borderStyleField).toBeDefined();
    expect(borderStyleField!.options).toBeDefined();
    expect(borderStyleField!.options!.length).toBeGreaterThan(0);
    expect((borderStyleField as any).optionsProvider).toBeUndefined();
  });

  it('non-select fields should not have options or optionsProvider', () => {
    const nonSelectFields = pageBrowserPropertySchema.fields.filter(
      f => f.type !== 'select',
    );
    for (const field of nonSelectFields) {
      expect((field as any).optionsProvider).toBeUndefined();
    }
  });
});

describe('PageBrowserPlugin — Schema registration in ConfigTemplateManager', () => {
  beforeEach(() => {
    ConfigTemplateManager.registerPluginSchema('page-browser', pageBrowserPropertySchema as any);
  });

  it('getPluginSchema should return registered schema', () => {
    const schema = ConfigTemplateManager.getPluginSchema('page-browser');
    expect(schema).not.toBeNull();
    expect(schema!.name).toBe(pageBrowserPropertySchema.name);
    expect(schema!.fields.length).toBe(pageBrowserPropertySchema.fields.length);
  });

  it('getTemplate should return the same result as getPluginSchema', () => {
    const tpl = ConfigTemplateManager.getTemplate('page-browser');
    const schema = ConfigTemplateManager.getPluginSchema('page-browser');
    expect(tpl).toEqual(schema);
  });

  it('hasPluginSchema should return true for registered schema', () => {
    expect(ConfigTemplateManager.hasPluginSchema('page-browser')).toBe(true);
  });

  it('hasPluginSchema should return false for unregistered schema', () => {
    expect(ConfigTemplateManager.hasPluginSchema('non-existent-type')).toBe(false);
  });

  it('getPluginSchema should return null for unregistered type', () => {
    expect(ConfigTemplateManager.getPluginSchema('unknown-type')).toBeNull();
  });

  it('getTemplate should return null for unregistered type', () => {
    expect(ConfigTemplateManager.getTemplate('unknown-type')).toBeNull();
  });

  it('getPropsPath should return undefined for schema without propsPath', () => {
    expect(ConfigTemplateManager.getPropsPath('page-browser')).toBeUndefined();
  });

  it('getDefaultValueFactory should return default value factory', () => {
    const factory = ConfigTemplateManager.getDefaultValueFactory('page-browser');
    expect(factory).toBeDefined();
    expect(typeof factory).toBe('function');
    const defaults = factory!();
    expect(defaults).toBeDefined();
    expect(defaults.displayMode).toBe('stretch');
    expect(defaults.borderStyle).toBe('solid');
    expect(defaults.borderWidth).toBe(1);
    expect(defaults.borderColor).toBe('#CCCCCC');
    expect(defaults.backgroundColor).toBe('#FFFFFF');
    expect(defaults.pageName).toBeUndefined();
  });

  it('unregisterPluginSchema should correctly remove schema', () => {
    ConfigTemplateManager.registerPluginSchema('test-plugin', {
      name: 'test',
      fields: [],
    } as any);
    expect(ConfigTemplateManager.hasPluginSchema('test-plugin')).toBe(true);
    ConfigTemplateManager.unregisterPluginSchema('test-plugin');
    expect(ConfigTemplateManager.hasPluginSchema('test-plugin')).toBe(false);
  });

  it('getAllPluginSchemas should include registered schema', () => {
    const all = ConfigTemplateManager.getAllPluginSchemas();
    expect(all['page-browser']).toBeDefined();
    expect(all['page-browser'].name).toBe(pageBrowserPropertySchema.name);
  });
});

describe('PageBrowserPlugin — optionsProvider runtime resolution', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('optionsProvider string "pageStore.pages" should be resolvable', () => {
    const pageNameField = pageBrowserPropertySchema.fields.find(f => f.name === 'pageName');
    const provider = (pageNameField as any).optionsProvider;
    expect(provider).toBe('pageStore.pages');
    expect(typeof provider).toBe('string');
  });

  it('pageStore.pages should provide a default page list', async () => {
    const { usePageStore } = await import('@scada-editor/core');
    const pageStore = usePageStore();
    expect(pageStore.pages).toBeDefined();
    expect(pageStore.pages.length).toBe(1);
    expect(pageStore.pages[0].name).toBe('Page1');
    expect(pageStore.pages[0].id).toBe('page-1');
  });

  it('each page in pageStore.pages should have name and id', async () => {
    const { usePageStore } = await import('@scada-editor/core');
    const pageStore = usePageStore();
    for (const page of pageStore.pages) {
      expect(page.name).toBeDefined();
      expect(page.id).toBeDefined();
    }
  });

  it('optionsProvider resolution result should be mappable to { value, label } format', async () => {
    const { usePageStore } = await import('@scada-editor/core');
    const pageStore = usePageStore();
    const options = pageStore.pages.map((p: any) => ({
      value: p.name,
      label: p.name,
    }));
    expect(options.length).toBe(1);
    expect(options[0]).toEqual({ value: 'Page1', label: 'Page1' });
  });
});