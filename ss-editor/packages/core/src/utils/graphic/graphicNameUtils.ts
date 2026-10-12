// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { IGraphic } from '@scada-editor/plugin-sdk';

/**
 * 为同类图元生成递增名称
 *
 * 规则:
 *   - 从 type 推导基础名（首字母大写），如 'pump' → 'Pump'
 *   - 扫描页面上所有同名系列的图元，提取最大数字后缀
 *   - 返回 `${baseName}_${maxSuffix + 1}`
 *
 * @example
 *   // 页面上有 Pump_1, Pump_3, Valve_1
 *   getNextGraphicName('pump', graphics) // → 'Pump_4'
 *   getNextGraphicName('valve', graphics) // → 'Valve_2'
 *   getNextGraphicName('text', graphics)  // → 'Text_1'  （页面无同名系列）
 */
export function getNextGraphicName(
  type: string,
  existingGraphics: IGraphic[],
): string {
  // 推导基础名：首字母大写
  const baseName = type.charAt(0).toUpperCase() + type.slice(1);

  // 收集页面上同系列名称的数字后缀
  // 匹配 pattern: baseName_数字 或 baseName (视为 baseName_0)
  const pattern = new RegExp(`^${escapeRegExp(baseName)}(?:_(\\d+))?$`);
  let maxNum = 0;

  for (const g of existingGraphics) {
    const name = g.config?.name;
    if (!name) continue;
    const match = name.match(pattern);
    if (match) {
      // match[1] 为 _数字 部分，没有时为 undefined（即纯 baseName，视为编号 0）
      const num = match[1] !== undefined ? parseInt(match[1], 10) : 0;
      if (num >= maxNum) {
        maxNum = num + 1;
      }
    }
  }

  return `${baseName}_${maxNum}`;
}

/**
 * 从页面图元列表中提取指定类型的图元列表
 */
export function getGraphicsByType(
  graphics: IGraphic[],
  type: string,
): IGraphic[] {
  return graphics.filter((g) => g.type === type);
}

/** 转义正则特殊字符 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}