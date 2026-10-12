// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { TransformConfig } from './types';

/**
 * 值变换工具 — 提供线性变换（scale/offset/precision）
 *
 * 从 Modbus / S7 插件中提取的公共逻辑
 */
export class ValueTransformUtil {
  /**
   * 应用线性变换: transformed = rawValue * scale + offset
   * @param rawValue 原始值
   * @param config 变换配置（scale/offset/precision）
   * @returns 变换后的值，若 rawValue 为 null/undefined 则返回 null
   */
  static apply(rawValue: number | null | undefined, config?: TransformConfig): number | null {
    if (rawValue === null || rawValue === undefined) return null;
    if (!config) return rawValue;

    const { scale = 1, offset = 0, precision = 2 } = config;
    let transformed = rawValue * scale + offset;

    if (precision !== undefined && precision >= 0) {
      transformed = parseFloat(transformed.toFixed(precision));
    }

    return transformed;
  }

  /**
   * 从 tagConfig 中提取变换配置并应用
   * @param rawValue 原始值
   * @param tagConfig 标签配置（包含 transform 字段）
   * @returns 变换后的值
   */
  static applyFromConfig(
    rawValue: number | null | undefined,
    tagConfig: Record<string, any>,
  ): number | null {
    if (!tagConfig.transform) return rawValue;
    return ValueTransformUtil.apply(rawValue, tagConfig.transform as TransformConfig);
  }
}
