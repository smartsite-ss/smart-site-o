// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 数据类型判定工具 — 统一点表（DataTag）与采集管道的类型字符串差异。
 *
 * 背景：点表布尔类型的规范字符串为 'boolean'（TagDataType.BOOLEAN），
 * 而采集管道历史代码按 'bool' 判定，导致布尔点落入数值分支
 * （仿真器生成 0-100 随机数、Transform 转成数字、误注入限值报警）。
 * 所有 dataType 布尔/字符串判定必须经由本工具函数，禁止散落字面量比较。
 */

/** 点表侧布尔数据类型的所有合法写法 */
const BOOLEAN_DATA_TYPES = ['boolean', 'bool'];

/** 点表侧字符串数据类型的所有合法写法 */
const STRING_DATA_TYPES = ['string'];

/** 判定 dataType 是否为布尔类型（兼容 'boolean' / 'bool'） */
export function isBooleanDataType(dataType: string | undefined): boolean {
  return BOOLEAN_DATA_TYPES.includes((dataType ?? '').toLowerCase());
}

/** 判定 dataType 是否为字符串类型 */
export function isStringDataType(dataType: string | undefined): boolean {
  return STRING_DATA_TYPES.includes((dataType ?? '').toLowerCase());
}
