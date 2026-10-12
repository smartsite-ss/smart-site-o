// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 状态变量组件 - 状态匹配纯函数。
 * 仅依赖输入参数，无副作用，便于单元测试。
 */

/** 比较运算符（全语义命名，禁止缩写） */
export type StateOperator =
  | 'equal'
  | 'notEqual'
  | 'greaterThan'
  | 'greaterOrEqual'
  | 'lessThan'
  | 'lessOrEqual'
  | 'between'
  | 'contains'
  | 'startsWith'
  | 'endsWith';

/** 一条状态规则：比较运算符 + 比较值 + 命中图片 */
export interface StateRule {
  /** 规则唯一 ID（用于 Vue key / 删除 / 排序） */
  id: string;
  /** 状态名称（展示用，如「运行」「故障」） */
  label: string;
  /** 比较运算符 */
  operator: StateOperator;
  /** 比较值（字符串存储，匹配时按 dataType 转换） */
  value: string;
  /** 比较值 2（仅 between 区间使用，可为空） */
  value2?: string;
  /** 命中时显示的图片 URL / base64 / 图库地址 */
  image: string;
}

/** 数值数据类型集合（含 SCADA 系统实际的 DataTag 类型） */
const NUMERIC_TYPES = new Set([
  'float',
  'double',
  'decimal',
  'int',
  'integer',
  'long',
  'short',
  'number',
  'real',
  'int8',
  'uint8',
  'int16',
  'uint16',
  'int32',
  'uint32',
  'int64',
  'uint64',
  'float32',
  'float64',
]);

/** 布尔数据类型集合 */
const BOOLEAN_TYPES = new Set(['bool', 'boolean']);

/** 仅数值类型生效的运算符 */
const NUMERIC_ONLY_OPERATORS = new Set<StateOperator>([
  'greaterThan',
  'greaterOrEqual',
  'lessThan',
  'lessOrEqual',
  'between',
]);

/** 将 tag 原始值归一化为可比较值 */
function normalizeValue(value: unknown, dataType: string): unknown {
  if (value === null || value === undefined) return null;

  if (BOOLEAN_TYPES.has(dataType)) {
    if (typeof value === 'boolean') return value;
    const text = String(value).toLowerCase();
    if (text === 'true' || text === '1') return true;
    if (text === 'false' || text === '0') return false;
  }

  if (NUMERIC_TYPES.has(dataType)) {
    const number = Number(value);
    return Number.isFinite(number) ? number : String(value);
  }

  return String(value);
}

/** 单条规则是否命中当前值 */
export function matchState(value: unknown, rule: StateRule, dataType: string): boolean {
  const current = normalizeValue(value, dataType);
  if (current === null) return false;

  const isNumeric = typeof current === 'number';

  // 大小/区间比较仅数值类型生效，类型不符直接不匹配
  if (NUMERIC_ONLY_OPERATORS.has(rule.operator) && !isNumeric) return false;

  switch (rule.operator) {
    case 'equal':
      if (typeof current === 'boolean') {
        return current === normalizeValue(rule.value, dataType);
      }
      return isNumeric ? current === Number(rule.value) : String(current) === String(rule.value);
    case 'notEqual':
      if (typeof current === 'boolean') {
        return current !== normalizeValue(rule.value, dataType);
      }
      return isNumeric ? current !== Number(rule.value) : String(current) !== String(rule.value);
    case 'greaterThan':
      return (current as number) > Number(rule.value);
    case 'greaterOrEqual':
      return (current as number) >= Number(rule.value);
    case 'lessThan':
      return (current as number) < Number(rule.value);
    case 'lessOrEqual':
      return (current as number) <= Number(rule.value);
    case 'between': {
      const lowerBound = Number(rule.value);
      const upperBound = Number(rule.value2);
      if (Number.isNaN(lowerBound) || Number.isNaN(upperBound)) return false;
      return (current as number) >= lowerBound && (current as number) <= upperBound;
    }
    case 'contains':
      return String(current).includes(rule.value);
    case 'startsWith':
      return String(current).startsWith(rule.value);
    case 'endsWith':
      return String(current).endsWith(rule.value);
    default:
      return false;
  }
}

/**
 * 遍历状态规则，返回第一条命中规则的图片。
 * 未命中任何规则时返回 defaultImage（可为空字符串）。
 */
export function resolveStateImage(
  value: unknown,
  states: StateRule[],
  dataType: string,
  defaultImage: string,
): string {
  for (const rule of states) {
    if (rule.image && matchState(value, rule, dataType)) {
      return rule.image;
    }
  }
  return defaultImage || '';
}

/** 生成规则唯一 ID（避免直接依赖 crypto 环境，兼容测试与旧浏览器） */
export function generateRuleId(): string {
  return `rule-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 根据数据类型返回可用的比较运算符（配置面板据此动态裁剪选项） */
export function getAvailableOperators(dataType: string): StateOperator[] {
  if (BOOLEAN_TYPES.has(dataType)) {
    return ['equal', 'notEqual'];
  }
  if (NUMERIC_TYPES.has(dataType)) {
    return [
      'equal',
      'notEqual',
      'greaterThan',
      'greaterOrEqual',
      'lessThan',
      'lessOrEqual',
      'between',
    ];
  }
  return ['equal', 'notEqual', 'contains', 'startsWith', 'endsWith'];
}
