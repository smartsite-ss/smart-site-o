// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { ChartContainerStyleInput } from './types';

/** 透明色占位值（编辑态默认背景/边框/阴影使用，运行时视为透明） */
const TRANSPARENT = '#00000000';

/**
 * 构建图表容器基础样式（背景/边框/圆角/阴影），供 tag-trend / history-trend / 新图表统一复用。
 * 历史趋势等需要纵向布局的组件可在 extra 中追加 display/flexDirection 等样式。
 */
export function buildContainerStyle(
  props: ChartContainerStyleInput,
  extra: Record<string, string> = {},
): Record<string, string> {
  const background = props.backgroundColor === TRANSPARENT ? 'transparent' : props.backgroundColor;
  const borderColor = props.borderColor === TRANSPARENT ? 'transparent' : props.borderColor;
  const hasShadow = props.shadowColor && props.shadowColor !== TRANSPARENT;

  return {
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    background,
    border: `${props.borderWidth}px ${props.borderStyle} ${borderColor}`,
    borderRadius: `${props.borderRadius}px`,
    boxShadow: hasShadow
      ? `${props.shadowOffsetX}px ${props.shadowOffsetY}px ${props.shadowBlur}px ${props.shadowColor}`
      : 'none',
    overflow: 'hidden',
    ...extra,
  };
}
