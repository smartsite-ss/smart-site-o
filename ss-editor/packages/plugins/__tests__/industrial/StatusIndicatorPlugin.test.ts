// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import { StatusIndicatorPlugin, statusIndicatorPropertySchema } from '../../industrial/status-indicator';

describe('StatusIndicatorPlugin — Schema static validation (Layer 1)', () => {
  it('schema.fields should be a non-empty array', () => {
    expect(statusIndicatorPropertySchema.fields.length).toBeGreaterThan(0);
  });

  it('each field should have name and type', () => {
    for (const field of statusIndicatorPropertySchema.fields) {
      expect(field.name).toBeTruthy();
      expect(field.type).toBeTruthy();
    }
  });

  it('select type should have options', () => {
    const selectFields = statusIndicatorPropertySchema.fields.filter(f => f.type === 'select');
    for (const field of selectFields) {
      expect(field.options).toBeDefined();
      expect(field.options!.length).toBeGreaterThan(0);
    }
  });

  it('number type min should not be greater than max', () => {
    const numFields = statusIndicatorPropertySchema.fields.filter(f => f.type === 'number');
    for (const field of numFields) {
      if (field.min !== undefined && field.max !== undefined) {
        expect(field.min).toBeLessThanOrEqual(field.max);
      }
    }
  });

  it('all fields should have defaultValue', () => {
    for (const field of statusIndicatorPropertySchema.fields) {
      expect(field.defaultValue, '${field.name} is missing defaultValue').toBeDefined();
    }
  });

  it('color type defaultValue should be a valid hex', () => {
    const colorFields = statusIndicatorPropertySchema.fields.filter(f => f.type === 'color');
    const hexRe = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/;
    for (const field of colorFields) {
      expect(String(field.defaultValue)).toMatch(hexRe);
    }
  });

  it('each field should have labelKey', () => {
    for (const field of statusIndicatorPropertySchema.fields) {
      expect(field.labelKey, '${field.name} 缺少 labelKey').toBeTruthy();
    }
  });

  it('status 字段应有 4 个选项', () => {
    const statusField = statusIndicatorPropertySchema.fields.find(f => f.name === 'status');
    expect(statusField?.options).toHaveLength(4);
  });
});

describe('StatusIndicatorPlugin — Construction and basic functionality', () => {
  it('should create instance correctly', () => {
    const plugin = new StatusIndicatorPlugin();
    expect(plugin.type).toBeTruthy();
    expect(plugin.type).toBe('status-indicator');
  });

  it('应接受位置和大小参数', () => {
    const plugin = new StatusIndicatorPlugin(50, 100, 60, 60);
    const size = plugin.getSize();
    expect(size.width).toBe(60);
    expect(size.height).toBe(60);
  });

  it('getSize should return correct dimensions', () => {
    const plugin = new StatusIndicatorPlugin(0, 0, 60, 60);
    const size = plugin.getSize();
    expect(size.width).toBe(60);
    expect(size.height).toBe(60);
  });

  it('默认状态应为 normal', () => {
    const plugin = new StatusIndicatorPlugin();
    expect(plugin.pluginProps.status).toBe('normal');
  });

  it('getHtmlTemplate 应返回包含 HTML 的字符串', () => {
    const plugin = new StatusIndicatorPlugin();
    const html = (plugin as any).getHtmlTemplate(plugin.pluginProps);
    expect(typeof html).toBe('string');
    expect(html).toContain('status-indicator');
  });
});

describe('StatusIndicatorPlugin — Property read/write consistency', () => {
  it('setDefaultProps 应写入配置', () => {
    const plugin = new StatusIndicatorPlugin();
    plugin.setDefaultProps({ status: 'warning', size: 30 } as any);
    expect(plugin.pluginProps.status).toBe('warning');
    expect(plugin.pluginProps.size).toBe(30);
  });

  it('setPluginProps should update properties', () => {
    const plugin = new StatusIndicatorPlugin();
    (plugin as any).setPluginProps({ status: 'error' });
    expect(plugin.pluginProps.status).toBe('error');
  });
});

describe('StatusIndicatorPlugin — render method', () => {
  it('getHtmlTemplate should return valid HTML for different statuses', () => {
    const plugin = new StatusIndicatorPlugin();
    (plugin as any).setPluginProps({ status: 'warning' });
    const html = (plugin as any).getHtmlTemplate(plugin.pluginProps);
    expect(typeof html).toBe('string');
    expect(html).toContain('status-indicator');
  });
});