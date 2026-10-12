// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import {
  resolveDisplayName,
  formatTagValue,
  resolveBackgroundSize,
} from '../../system/tag-value/tagValueUtils';
import { tagValuePropertySchema } from '../../system/tag-value/tagValuePropertySchema';

describe('tagValueUtils - resolveDisplayName', () => {
  it('别名非空时优先', () => {
    expect(resolveDisplayName('温度', 'T1', 'tag-1')).toBe('温度');
  });

  it('别名空白时回退 tagName', () => {
    expect(resolveDisplayName('  ', 'T1', 'tag-1')).toBe('T1');
  });

  it('别名与 tagName 均空时回退 tagId', () => {
    expect(resolveDisplayName('', '', 'tag-1')).toBe('tag-1');
  });

  it('全部为空返回空字符串', () => {
    expect(resolveDisplayName('', '', '')).toBe('');
  });
});

describe('tagValueUtils - formatTagValue', () => {
  it('数值按小数位格式化', () => {
    expect(formatTagValue(23.5, 2)).toBe('23.50');
    expect(formatTagValue(1, 0)).toBe('1');
  });

  it('字符串数值仍按小数位格式化', () => {
    expect(formatTagValue('23.5', 2)).toBe('23.50');
  });

  it('非数值字符串原样返回', () => {
    expect(formatTagValue('running', 2)).toBe('running');
  });

  it('布尔值原样返回字符串', () => {
    expect(formatTagValue(true, 2)).toBe('true');
    expect(formatTagValue(false, 2)).toBe('false');
  });

  it('空值返回占位符', () => {
    expect(formatTagValue(null, 2)).toBe('--');
    expect(formatTagValue(undefined, 2)).toBe('--');
    expect(formatTagValue('', 2)).toBe('--');
  });
});

describe('tagValueUtils - resolveBackgroundSize', () => {
  it('fill 拉伸铺满', () => {
    expect(resolveBackgroundSize('fill')).toBe('100% 100%');
  });

  it('contain/cover 原样映射', () => {
    expect(resolveBackgroundSize('contain')).toBe('contain');
    expect(resolveBackgroundSize('cover')).toBe('cover');
  });

  it('none 映射为 auto', () => {
    expect(resolveBackgroundSize('none')).toBe('auto');
  });

  it('scale-down 近似映射为 contain', () => {
    expect(resolveBackgroundSize('scale-down')).toBe('contain');
  });

  it('未知值回退 100% 100%', () => {
    expect(resolveBackgroundSize('unknown')).toBe('100% 100%');
  });
});

describe('tagValuePropertySchema 静态校验', () => {
  it('字段均有 name/type/defaultValue', () => {
    for (const field of tagValuePropertySchema.fields) {
      expect(field.name, '字段缺少 name').toBeTruthy();
      expect(field.type, `字段 ${field.name} 缺少 type`).toBeTruthy();
      expect(field.defaultValue, `字段 ${field.name} 缺少 defaultValue`).toBeDefined();
    }
  });

  it('select 字段均有 options', () => {
    for (const field of tagValuePropertySchema.fields.filter((f) => f.type === 'select')) {
      expect(field.options?.length, `字段 ${field.name} 缺少 options`).toBeGreaterThan(0);
    }
  });

  it('包含 shape/alias/showName/decorationImagePosition 关键字段', () => {
    const names = tagValuePropertySchema.fields.map((f) => f.name);
    expect(names).toContain('shape');
    expect(names).toContain('alias');
    expect(names).toContain('showName');
    expect(names).toContain('decorationImagePosition');
    expect(names).toContain('borderStyle');
    expect(names).toContain('backgroundRepeat');
    expect(names).toContain('backgroundImageFit');
  });

  it('字段名不重复', () => {
    const names = tagValuePropertySchema.fields.map((f) => f.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
