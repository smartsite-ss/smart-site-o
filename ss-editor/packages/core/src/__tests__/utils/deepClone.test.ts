// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import { safeCopyObject } from '../../utils/core/deepClone';

describe('safeCopyObject', () => {
  it('should return primitive values as-is', () => {
    expect(safeCopyObject(null)).toBeNull();
    expect(safeCopyObject(undefined)).toBeUndefined();
    expect(safeCopyObject(42)).toBe(42);
    expect(safeCopyObject('hello')).toBe('hello');
    expect(safeCopyObject(true)).toBe(true);
    expect(safeCopyObject(false)).toBe(false);
    expect(safeCopyObject(0)).toBe(0);
    expect(safeCopyObject('')).toBe('');
  });

  it('should deep copy plain objects', () => {
    const obj = { a: 1, b: 'test', c: true };
    const copy = safeCopyObject(obj);
    expect(copy).toEqual(obj);
    expect(copy).not.toBe(obj);
    copy.a = 999;
    expect(obj.a).toBe(1);
  });

  it('should deep copy nested objects', () => {
    const obj = {
      a: 1,
      b: { c: 2, d: { e: 3 } },
      f: [1, 2, { g: 4 }],
    };
    const copy = safeCopyObject(obj);
    expect(copy).toEqual(obj);
    expect(copy.b).not.toBe(obj.b);
    expect(copy.b.d).not.toBe(obj.b.d);
    expect(copy.f).not.toBe(obj.f);
    expect(copy.f[2]).not.toBe(obj.f[2]);
  });

  it('should handle arrays', () => {
    const arr = [1, 'two', { three: 3 }, [4, 5]];
    const copy = safeCopyObject(arr);
    expect(copy).toEqual(arr);
    expect(Array.isArray(copy)).toBe(true);
    expect(copy).not.toBe(arr);
    expect(copy[2]).not.toBe(arr[2]);
  });

  it('should handle Date objects', () => {
    const date = new Date('2024-01-15T10:30:00Z');
    const copy = safeCopyObject(date);
    expect(copy).toBeInstanceOf(Date);
    expect(copy.getTime()).toBe(date.getTime());
    expect(copy).not.toBe(date);
  });

  it('should handle circular references gracefully', () => {
    const obj: any = { a: 1 };
    obj.self = obj;
    const copy = safeCopyObject(obj);
    expect(copy.a).toBe(1);
    expect(copy.self).toBeUndefined();
  });

  it('should handle empty objects', () => {
    expect(safeCopyObject({})).toEqual({});
  });

  it('should handle empty arrays', () => {
    expect(safeCopyObject([])).toEqual([]);
  });

  it('should not include undefined values in copy', () => {
    const obj = { a: 1, b: undefined, c: 3 };
    const copy = safeCopyObject(obj);
    expect(copy).toEqual({ a: 1, c: 3 });
  });

  it('should not include null values in copy', () => {
    const obj = { a: 1, b: null, c: 3 };
    const copy = safeCopyObject(obj);
    expect(copy).toEqual({ a: 1, c: 3 });
  });

  it('should handle complex mixed structures', () => {
    const obj = {
      name: 'test',
      count: 42,
      tags: ['a', 'b'],
      meta: { created: new Date('2024-01-01'), version: 1 },
    };
    const copy = safeCopyObject(obj);
    expect(copy.name).toBe('test');
    expect(copy.tags).toEqual(['a', 'b']);
    expect(copy.meta.created).toBeInstanceOf(Date);
    expect(copy.meta.created.getTime()).toBe(new Date('2024-01-01').getTime());
  });
});