// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import { NavigationButtonPlugin, navigationButtonPropertySchema } from '../../system/navigation-button';

describe('NavigationButtonPlugin — Schema static validation (Layer 1)', () => {
  it('schema.fields should be a non-empty array', () => {
    expect(navigationButtonPropertySchema.fields.length).toBeGreaterThan(0);
  });

  it('each field should have name and type', () => {
    for (const field of navigationButtonPropertySchema.fields) {
      expect(field.name).toBeTruthy();
      expect(field.type).toBeTruthy();
    }
  });

  it('select type should have options or optionsProvider', () => {
    const selectFields = navigationButtonPropertySchema.fields.filter(f => f.type === 'select');
    for (const field of selectFields) {
      const hasStaticOptions = !!field.options && field.options.length > 0;
      const hasDynamicOptions = typeof field.optionsProvider === 'string' && field.optionsProvider.length > 0;
      expect(hasStaticOptions || hasDynamicOptions, `${field.name} should have options or optionsProvider`).toBe(true);
    }
  });

  it('all fields should have defaultValue', () => {
    for (const field of navigationButtonPropertySchema.fields) {
      expect(field.defaultValue, `${field.name} is missing defaultValue`).toBeDefined();
    }
  });

  it('每个 field 应有 labelKey', () => {
    for (const field of navigationButtonPropertySchema.fields) {
      expect(field.labelKey, `${field.name} 缺少 labelKey`).toBeTruthy();
    }
  });

  it('type 字段应有 5 个选项', () => {
    const typeField = navigationButtonPropertySchema.fields.find(f => f.name === 'type');
    expect(typeField?.options).toHaveLength(5);
  });

  it('size 字段应有 3 个选项', () => {
    const sizeField = navigationButtonPropertySchema.fields.find(f => f.name === 'size');
    expect(sizeField?.options).toHaveLength(3);
  });
});

describe('NavigationButtonPlugin — Construction and basic functionality', () => {
  it('should create instance correctly', () => {
    const plugin = new NavigationButtonPlugin();
    expect(plugin.type).toBeTruthy();
    expect(plugin.type).toBe('navigation-button');
  });

  it('应接受位置和大小参数', () => {
    const plugin = new NavigationButtonPlugin(50, 100, 150, 50);
    const size = plugin.getSize();
    expect(size.width).toBe(150);
    expect(size.height).toBe(50);
  });

  it('getSize 应返回正确尺寸', () => {
    const plugin = new NavigationButtonPlugin(0, 0, 150, 50);
    const size = plugin.getSize();
    expect(size.width).toBe(150);
    expect(size.height).toBe(50);
  });

  it('默认文本应为 导航按钮', () => {
    const plugin = new NavigationButtonPlugin();
    expect(plugin.pluginProps.text).toBe('导航按钮');
  });

  it('默认类型应为 primary', () => {
    const plugin = new NavigationButtonPlugin();
    expect(plugin.pluginProps.type).toBe('primary');
  });
});

describe('NavigationButtonPlugin — 属性读写一致性', () => {
  it('setDefaultProps 应写入配置', () => {
    const plugin = new NavigationButtonPlugin();
    plugin.setDefaultProps({ text: '测试', type: 'danger' } as any);
    expect(plugin.pluginProps.text).toBe('测试');
    expect(plugin.pluginProps.type).toBe('danger');
  });

  it('setPluginProps should update properties', () => {
    const plugin = new NavigationButtonPlugin();
    (plugin as any).setPluginProps({ text: '新文本' });
    expect(plugin.pluginProps.text).toBe('新文本');
  });
});

describe('NavigationButtonPlugin — features', () => {
  it('dataBindable 应为 true（编辑态数据绑定支持）', () => {
    const meta = (NavigationButtonPlugin as any).graphicMeta;
    expect(meta).toBeDefined();
    expect(meta.features).toBeDefined();
    expect(meta.features.dataBindable).toBe(true);
  });

  it('应保留其他 feature 标志位', () => {
    const meta = (NavigationButtonPlugin as any).graphicMeta;
    expect(meta.features.resizable).toBe(true);
    expect(meta.features.cloneable).toBe(true);
    expect(meta.features.groupable).toBe(true);
  });
});
