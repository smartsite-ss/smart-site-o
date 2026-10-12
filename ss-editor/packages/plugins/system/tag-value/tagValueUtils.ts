// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/** 标签值组件形态 */
export type TagValueShape = 'rectangle' | 'circle';

/** 装饰图片位置 */
export type DecorationImagePosition = 'left' | 'right' | 'background' | 'center';

/**
 * 解析显示名：别名（非空）> 标签名称 > 标签 ID。
 * alias 为组件级字段（DataTag 无 alias），故在此做三级回退。
 */
export function resolveDisplayName(alias: string, tagName: string, tagId: string): string {
  return (alias ?? '').trim() || tagName || tagId || '';
}

/**
 * 按小数位格式化实时值；布尔与非数值（字符串）原样返回，空值返回占位符。
 */
export function formatTagValue(raw: unknown, decimalPlaces: number): string {
  if (raw === null || raw === undefined || raw === '') return '--';
  if (typeof raw === 'boolean') return String(raw);
  const num = Number(raw);
  if (!Number.isNaN(num) && Number.isFinite(num)) {
    return num.toFixed(decimalPlaces ?? 2);
  }
  return String(raw);
}

/**
 * 背景图片填充样式 → CSS background-size。
 * fill 映射为 100% 100%（拉伸铺满）；scale-down 无 background-size 原生值，近似用 contain。
 */
export function resolveBackgroundSize(fit: string): string {
  switch (fit) {
    case 'contain':
      return 'contain';
    case 'cover':
      return 'cover';
    case 'fill':
      return '100% 100%';
    case 'none':
      return 'auto';
    case 'scale-down':
      return 'contain';
    default:
      return '100% 100%';
  }
}
