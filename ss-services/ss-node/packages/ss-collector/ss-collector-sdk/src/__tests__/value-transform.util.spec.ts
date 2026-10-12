// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ValueTransformUtil } from '../value-transform.util';
import { TransformConfig } from '../types';

describe('ValueTransformUtil', () => {
  // -------------------------------------------------------------
  // apply()
  // -------------------------------------------------------------
  describe('apply', () => {
    it('rawValue 为 null 时应返回 null', () => {
      // eslint-disable-next-line prefer-spread
      expect(ValueTransformUtil.apply(null, { scale: 2 })).toBeNull();
    });

    it('rawValue 为 undefined 时应返回 null', () => {
      // eslint-disable-next-line prefer-spread
      expect(ValueTransformUtil.apply(undefined, { scale: 2 })).toBeNull();
    });

    it('未提供 config 时应原样返回 rawValue', () => {
      expect(ValueTransformUtil.apply(42)).toBe(42);
    });

    it('未提供 config 时 rawValue 为 null 应返回 null', () => {
      expect(ValueTransformUtil.apply(null)).toBeNull();
    });

    it('应正确应用 scale 缩放', () => {
      const config: TransformConfig = { scale: 2 };
      // 10 * 2 + 0 = 20
      expect(ValueTransformUtil.apply(10, config)).toBe(20);
    });

    it('应正确应用 offset 偏移', () => {
      const config: TransformConfig = { offset: 5 };
      // 10 * 1 + 5 = 15
      expect(ValueTransformUtil.apply(10, config)).toBe(15);
    });

    it('应同时应用 scale 和 offset', () => {
      const config: TransformConfig = { scale: 3, offset: 100 };
      // 10 * 3 + 100 = 130
      expect(ValueTransformUtil.apply(10, config)).toBe(130);
    });

    it('应按 precision 进行小数精度处理', () => {
      const config: TransformConfig = { scale: 0.1, precision: 2 };
      // 100 * 0.1 + 0 = 10 (理论上) — 但浮点可能有误差，精度确保结果为 10
      const result = ValueTransformUtil.apply(100, config);
      expect(result).toBe(10);
    });

    it('precision=0 应返回整数', () => {
      const config: TransformConfig = { scale: 0.333, precision: 0 };
      // 10 * 0.333 = 3.33 → toFixed(0) = '3' → 3
      expect(ValueTransformUtil.apply(10, config)).toBe(3);
    });

    it('precision=4 应保留 4 位小数', () => {
      const config: TransformConfig = { scale: 1 / 3, precision: 4 };
      // 10 * (1/3) = 3.33333... → toFixed(4) = '3.3333' → 3.3333
      expect(ValueTransformUtil.apply(10, config)).toBe(3.3333);
    });

    it('应使用默认值 scale=1, offset=0, precision=2', () => {
      const config: TransformConfig = {};
      // 3.14159 * 1 + 0 = 3.14159 → toFixed(2) = '3.14' → 3.14
      expect(ValueTransformUtil.apply(3.14159, config)).toBe(3.14);
    });

    it('scale 为负数应正确计算', () => {
      const config: TransformConfig = { scale: -2, offset: 100 };
      // 10 * -2 + 100 = 80
      expect(ValueTransformUtil.apply(10, config)).toBe(80);
    });

    it('rawValue 为 0 时应正确计算', () => {
      const config: TransformConfig = { scale: 2, offset: 5 };
      // 0 * 2 + 5 = 5
      expect(ValueTransformUtil.apply(0, config)).toBe(5);
    });

    it('负的 rawValue 应正确计算', () => {
      const config: TransformConfig = { scale: 2, offset: 10 };
      // -5 * 2 + 10 = 0
      expect(ValueTransformUtil.apply(-5, config)).toBe(0);
    });

    it('浮点 rawValue 应正确计算', () => {
      const config: TransformConfig = { scale: 2, precision: 2 };
      // 1.5 * 2 + 0 = 3
      expect(ValueTransformUtil.apply(1.5, config)).toBe(3);
    });
  });

  // -------------------------------------------------------------
  // applyFromConfig()
  // -------------------------------------------------------------
  describe('applyFromConfig', () => {
    it('tagConfig 无 transform 字段时应原样返回 rawValue', () => {
      const tagConfig = { id: 'tag-1', address: '40001' };
      expect(ValueTransformUtil.applyFromConfig(42, tagConfig)).toBe(42);
    });

    it('tagConfig.transform 为 undefined 时应原样返回 rawValue', () => {
      const tagConfig = { id: 'tag-1', transform: undefined };
      expect(ValueTransformUtil.applyFromConfig(42, tagConfig)).toBe(42);
    });

    it('应从 tagConfig.transform 提取配置并应用', () => {
      const tagConfig = {
        id: 'tag-1',
        transform: { scale: 2, offset: 10, precision: 2 },
      };
      // 10 * 2 + 10 = 30
      expect(ValueTransformUtil.applyFromConfig(10, tagConfig)).toBe(30);
    });

    it('rawValue 为 null 时应返回 null 即使有 transform', () => {
      const tagConfig = { transform: { scale: 2 } };
      expect(ValueTransformUtil.applyFromConfig(null, tagConfig)).toBeNull();
    });

    it('rawValue 为 undefined 时应返回 null 即使有 transform', () => {
      const tagConfig = { transform: { scale: 2 } };
      expect(ValueTransformUtil.applyFromConfig(undefined, tagConfig)).toBeNull();
    });

    it('应支持仅 scale 配置', () => {
      const tagConfig = { transform: { scale: 0.5 } };
      // 10 * 0.5 + 0 = 5 → toFixed(2) = '5.00' → 5
      expect(ValueTransformUtil.applyFromConfig(10, tagConfig)).toBe(5);
    });

    it('应支持仅 offset 配置', () => {
      const tagConfig = { transform: { offset: -10 } };
      // 10 * 1 + (-10) = 0 → toFixed(2) = '0.00' → 0
      expect(ValueTransformUtil.applyFromConfig(10, tagConfig)).toBe(0);
    });

    it('应支持仅 precision 配置', () => {
      const tagConfig = { transform: { precision: 0 } };
      // 3.7 * 1 + 0 = 3.7 → toFixed(0) = '4' → 4
      expect(ValueTransformUtil.applyFromConfig(3.7, tagConfig)).toBe(4);
    });

    it('空 transform 对象应使用默认值', () => {
      const tagConfig = { transform: {} };
      // 3.14159 * 1 + 0 = 3.14159 → toFixed(2) = '3.14' → 3.14
      expect(ValueTransformUtil.applyFromConfig(3.14159, tagConfig)).toBe(3.14);
    });
  });
});
