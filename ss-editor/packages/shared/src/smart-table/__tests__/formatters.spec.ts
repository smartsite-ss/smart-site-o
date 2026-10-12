// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import { applyFormatter, getNestedValue } from '../utils/formatters';

describe('getNestedValue', () => {
  it('TC-FMT-001: returns top-level value', () => {
    expect(getNestedValue({ a: 1 }, 'a')).toBe(1);
  });

  it('TC-FMT-002: returns nested value', () => {
    const obj = { user: { name: 'Alice', age: 30 } };
    expect(getNestedValue(obj, 'user.name')).toBe('Alice');
    expect(getNestedValue(obj, 'user.age')).toBe(30);
  });

  it('TC-FMT-003: returns undefined for missing path', () => {
    expect(getNestedValue({}, 'x.y')).toBeUndefined();
  });

  it('TC-FMT-004: returns undefined for null/undefined obj', () => {
    expect(getNestedValue(null, 'a')).toBeUndefined();
    expect(getNestedValue(undefined, 'a')).toBeUndefined();
  });
});

describe('applyFormatter', () => {
  it('TC-FMT-005: formats time', () => {
    const d = new Date('2026-07-09T14:30:00');
    const result = applyFormatter(d.toISOString(), 'time');
    expect(result).toContain('07-09');
    expect(result).toContain('14:30');
  });

  it('TC-FMT-006: time returns - for null', () => {
    expect(applyFormatter(null, 'time')).toBe('-');
  });

  it('TC-FMT-007: formats period (ms)', () => {
    expect(applyFormatter(500, 'period')).toBe('500ms');
    expect(applyFormatter(1000, 'period')).toBe('1.0s');
    expect(applyFormatter(30000, 'period')).toBe('30.0s');
    expect(applyFormatter(120000, 'period')).toBe('2.0min');
  });

  it('TC-FMT-008: period returns - for 0 or null', () => {
    expect(applyFormatter(0, 'period')).toBe('-');
    expect(applyFormatter(null, 'period')).toBe('-');
  });

  it('TC-FMT-009: formats bool', () => {
    expect(applyFormatter(true, 'bool')).toBe('是');
    expect(applyFormatter(false, 'bool')).toBe('否');
  });

  it('TC-FMT-010: formats number (locale)', () => {
    const result = applyFormatter(1234567, 'number');
    expect(result).toContain('1,234,567');
  });

  it('TC-FMT-011: formats percent', () => {
    expect(applyFormatter(0.85, 'percent')).toBe('85.0%');
    expect(applyFormatter(1, 'percent')).toBe('100.0%');
  });

  it('TC-FMT-012: returns - for null/empty with no formatter', () => {
    expect(applyFormatter(null)).toBe('-');
    expect(applyFormatter('')).toBe('-');
    expect(applyFormatter(undefined)).toBe('-');
  });

  it('TC-FMT-013: returns string value as-is', () => {
    expect(applyFormatter('hello')).toBe('hello');
  });

  it('TC-FMT-014: JSON stringifies objects', () => {
    expect(applyFormatter({ a: 1 })).toBe('{"a":1}');
  });

  it('TC-FMT-015: uses custom render function', () => {
    const render = (val: any, row: any, idx: number) => `[${idx}] ${val}`;
    expect(applyFormatter('test', undefined, render, {}, 3)).toBe('[3] test');
  });
});
