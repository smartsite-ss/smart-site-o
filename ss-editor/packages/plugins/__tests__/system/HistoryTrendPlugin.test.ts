// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import {
  createDefaultSeriesStyle,
  DEFAULT_TREND_COLORS,
} from '../../system/history-trend/historyTrendUtils';
import { historyTrendPropertySchema } from '../../system/history-trend/historyTrendPropertySchema';

describe('historyTrendUtils - DEFAULT_TREND_COLORS', () => {
  it('提供 8 个调色板颜色且均为 hex', () => {
    expect(DEFAULT_TREND_COLORS).toHaveLength(8);
    for (const color of DEFAULT_TREND_COLORS) {
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});

describe('historyTrendUtils - createDefaultSeriesStyle', () => {
  it('主色回填到线条与区域渐变', () => {
    const style = createDefaultSeriesStyle('#4dabf7');
    expect(style.lineStyle.color).toBe('#4dabf7');
    expect(style.lineStyle.type).toBe('solid');
    expect(style.lineStyle.width).toBe(3);
    expect(style.areaStyle.show).toBe(true);
    expect(style.areaStyle.colorStops[0].color).toBe('#4dabf7');
    expect(style.areaStyle.colorStops[2].color).toBe('#4dabf7');
  });

  it('标签默认隐藏且实心点默认 5', () => {
    const style = createDefaultSeriesStyle('#51cf66');
    expect(style.label.show).toBe(false);
    expect(style.symbolSize).toBe(5);
  });
});

describe('historyTrendPropertySchema 静态校验', () => {
  it('字段均有 name/type/defaultValue', () => {
    for (const field of historyTrendPropertySchema.fields) {
      expect(field.name, '字段缺少 name').toBeTruthy();
      expect(field.type, `字段 ${field.name} 缺少 type`).toBeTruthy();
      expect(field.defaultValue, `字段 ${field.name} 缺少 defaultValue`).toBeDefined();
    }
  });

  it('select 字段均有 options', () => {
    for (const field of historyTrendPropertySchema.fields.filter((f) => f.type === 'select')) {
      expect(field.options?.length, `字段 ${field.name} 缺少 options`).toBeGreaterThan(0);
    }
  });

  it('包含默认查询方式/时间范围/showDataZoom 等关键字段', () => {
    const names = historyTrendPropertySchema.fields.map((f) => f.name);
    expect(names).toContain('defaultInterpolation');
    expect(names).toContain('defaultInterval');
    expect(names).toContain('defaultPresetRange');
    expect(names).toContain('defaultCustomStart');
    expect(names).toContain('defaultCustomEnd');
    expect(names).toContain('maxPoints');
    expect(names).toContain('showDataZoom');
  });

  it('字段名不重复', () => {
    const names = historyTrendPropertySchema.fields.map((f) => f.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
