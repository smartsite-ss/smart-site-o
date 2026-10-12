// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export interface BaseBorderProps {
  borderColor: string;
  borderWidth: number;
  borderStyle: string;
  borderRadius: number;
}

export interface BaseShadowProps {
  shadowColor: string;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowBlur: number;
}

export interface BaseFillProps {
  fillColor: string;
}

export interface BaseLabelProps {
  showLabel: boolean;
  labelText: string;
}

export interface BaseFontProps {
  fontSize: number;
  fontWeight: string;
}

export const BORDER_STYLE = {
  COLOR: '#CCCCCCFF',
  WIDTH: 1,
  STYLE: 'solid',
  RADIUS: 0,
} as const;

export const SHADOW_STYLE = {
  COLOR: '#00000033',
  OFFSET_X: 0,
  OFFSET_Y: 2,
  BLUR: 4,
} as const;

export const FONT_STYLE = {
  FAMILY: 'sans-serif',
  SIZE: 14,
  WEIGHT: 'normal',
} as const;