// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 标签值显示格式化工具。
 *
 * 与后端 FormatStep.applyFormat() 保持一致的语义，支持：
 * - 整数格式：%d / %i / %.0f
 * - 浮点格式：%.Nf（保留 N 位小数）
 * - 十六进制格式：%X / %x / %04X / %08x 等
 *
 * 当未提供 displayFormat 或值无法解析为数字时，回退为直接转字符串。
 */

/**
 * 根据标签的 displayFormat 格式化显示值。
 *
 * @param value          原始值（可能为 number / string / null / undefined）
 * @param displayFormat  显示格式串（如 "%.2f"、"%d"、"%04X"）
 * @returns 格式化后的字符串；值为空时返回 '—'
 */
export function formatTagValue(value: unknown, displayFormat?: string): string {
  if (value === null || value === undefined || value === '') return '—';

  // 无格式配置时，直接返回原值
  if (!displayFormat) return String(value);

  const num = Number(value);
  if (Number.isNaN(num)) return String(value);

  // 整数格式
  if (displayFormat === '%d' || displayFormat === '%i' || displayFormat === '%.0f') {
    return Math.round(num).toString();
  }

  // 浮点格式：%.Nf
  const floatMatch = displayFormat.match(/^%\.(\d+)f$/);
  if (floatMatch) {
    const decimals = parseInt(floatMatch[1], 10);
    return num.toFixed(decimals);
  }

  // 十六进制格式：%X / %x / %04X / %08x 等
  const hexMatch = displayFormat.match(/^%(\d*)([Xx])$/);
  if (hexMatch) {
    const width = parseInt(hexMatch[1], 10) || 0;
    const upper = hexMatch[2] === 'X';
    const intVal = Math.round(num);
    if (intVal < 0) return String(value);
    const hex = intVal.toString(16);
    const padded = hex.padStart(width, '0');
    return upper ? padded.toUpperCase() : padded;
  }

  // 不支持的格式，直接转字符串
  return String(value);
}

/**
 * 从 displayFormat 中推断小数位数（用于坐标轴刻度等场景）。
 * 返回 null 表示无明确小数位（调用方应自行选择默认精度）。
 */
export function getDecimalsFromFormat(displayFormat?: string): number | null {
  if (!displayFormat) return null;
  const floatMatch = displayFormat.match(/^%\.(\d+)f$/);
  if (floatMatch) return parseInt(floatMatch[1], 10);
  if (displayFormat === '%d' || displayFormat === '%i' || displayFormat === '%.0f') return 0;
  return null;
}
