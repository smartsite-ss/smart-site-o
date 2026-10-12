// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { isBooleanDataType, isStringDataType } from '../data-type.util';

describe('data-type.util', () => {
  describe('isBooleanDataType', () => {
    it("应识别点表规范字符串 'boolean'", () => {
      expect(isBooleanDataType('boolean')).toBe(true);
    });

    it("应兼容采集管道历史字符串 'bool'", () => {
      expect(isBooleanDataType('bool')).toBe(true);
    });

    it('应大小写不敏感', () => {
      expect(isBooleanDataType('BOOLEAN')).toBe(true);
      expect(isBooleanDataType('Bool')).toBe(true);
    });

    it('数值类型应返回 false', () => {
      expect(isBooleanDataType('float32')).toBe(false);
      expect(isBooleanDataType('int16')).toBe(false);
      expect(isBooleanDataType('uint16')).toBe(false);
    });

    it('undefined / 空串应返回 false', () => {
      expect(isBooleanDataType(undefined)).toBe(false);
      expect(isBooleanDataType('')).toBe(false);
    });
  });

  describe('isStringDataType', () => {
    it("应识别 'string'", () => {
      expect(isStringDataType('string')).toBe(true);
      expect(isStringDataType('STRING')).toBe(true);
    });

    it('其他类型应返回 false', () => {
      expect(isStringDataType('boolean')).toBe(false);
      expect(isStringDataType('float32')).toBe(false);
      expect(isStringDataType(undefined)).toBe(false);
    });
  });
});
