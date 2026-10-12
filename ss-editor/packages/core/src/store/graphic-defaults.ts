// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IGraphic } from '../types';

/**
 * 图形查找缓存 — 按 zIndex 排序的结果缓存
 * 避免 sortedGraphics getter 中重复 sort
 */
export class GraphicLookupCache {
  private _cache: IGraphic[] | null = null;
  private _length = -1;

  getSorted(graphics: IGraphic[]): IGraphic[] {
    if (this._cache && this._length === graphics.length) return this._cache;
    this._cache = [...graphics].sort(
      (a, b) => (a.config.zIndex ?? 0) - (b.config.zIndex ?? 0)
    );
    this._length = graphics.length;
    return this._cache;
  }

  invalidate(): void {
    this._cache = null;
    this._length = -1;
  }
}

// 全局单例缓存
export const graphicCache = new GraphicLookupCache();

/** 图元类型 → 数据绑定目标属性名 */
export const DATA_BINDING_TARGETS: Record<string, string> = {
  'button': 'text',
  'input': 'value',
  'label': 'text',
  'checkbox': 'checked',
  'naive-button': 'text',
};

/** 图元类型 → 默认样式 */
export const GRAPHIC_DEFAULT_STYLES: Record<string, Record<string, any>> = {
  'button': {
    text: '按钮', backgroundColor: '#2196f3', textColor: '#ffffff',
    borderColor: '#1976d2', borderWidth: 1, borderStyle: 'solid',
    borderRadius: 4, fontSize: 14, fontWeight: 'normal', textAlign: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.2)', shadowOffsetX: 0, shadowOffsetY: 2, shadowBlur: 4,
  },
  'input': {
    value: '', placeholder: '请输入...', backgroundColor: '#ffffff',
    borderColor: '#ced4da', borderWidth: 1, borderStyle: 'solid',
    borderRadius: 4, textColor: '#333333', fontSize: 14, fontWeight: 'normal',
    textAlign: 'left', shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffsetX: 0, shadowOffsetY: 1, shadowBlur: 2,
  },
  'shape': {
    shapeType: 'rectangle', fillColor: '#e3f2fd', fillOpacity: 1,
    borderColor: '#2196f3', borderWidth: 2, borderStyle: 'solid', borderRadius: 0,
    shadowColor: 'rgba(0, 0, 0, 0.2)', shadowOffsetX: 0, shadowOffsetY: 2, shadowBlur: 4,
  },
  'label': {
    text: '标签', textColor: '#333333', fontSize: 14, fontWeight: 'normal',
    fontStyle: 'normal', textDecoration: 'none', textAlign: 'left',
    verticalAlignment: 'middle', lineHeight: 1.5, letterSpacing: 0,
    wordWrap: true, maxLines: 0, backgroundColor: 'transparent',
    borderColor: 'transparent', borderWidth: 0, borderRadius: 0,
    textShadowColor: 'rgba(0, 0, 0, 0.2)', textShadowOffsetX: 0,
    textShadowOffsetY: 1, textShadowBlur: 2,
  },
  'image': {
    src: '', alt: '图片', opacity: 1, borderColor: 'transparent',
    borderWidth: 0, borderStyle: 'solid', borderRadius: 0,
    shadowColor: 'rgba(0, 0, 0, 0.2)', shadowOffsetX: 0, shadowOffsetY: 2,
    shadowBlur: 4, imageScale: 1, imageRotation: 0, imageFilter: 'none', imageFit: 'contain',
  },
  'chart': {
    title: '图表', titleColor: '#333333', titleFontSize: 16, titleFontWeight: 'bold',
    backgroundColor: '#ffffff', borderColor: '#e0e0e0', borderWidth: 1, borderStyle: 'solid',
    borderRadius: 4, gridColor: '#e0e0e0', axisColor: '#9e9e9e',
    shadowColor: 'rgba(0, 0, 0, 0.2)', shadowOffsetX: 0, shadowOffsetY: 2, shadowBlur: 4,
  },
  'checkbox': {
    checked: false, label: 'Checkbox', disabled: false, indeterminate: false,
    color: '#2196f3', labelPosition: 'right', size: 'medium',
  },
  'naive-button': {
    text: 'Naive Button', type: 'primary', size: 'medium',
    round: false, circle: false, disabled: false, loading: false,
  },
};

/**
 * 按路径从嵌套对象中读取值
 */
export function resolveDataPath(data: Record<string, any>, path: string): any {
  const parts = path.split('.');
  let current = data;
  for (const key of parts) {
    if (current && current[key] !== undefined) {
      current = current[key];
    } else {
      return undefined;
    }
  }
  return current;
}