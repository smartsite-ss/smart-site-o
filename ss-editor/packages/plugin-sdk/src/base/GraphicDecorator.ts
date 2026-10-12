// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { GraphicFactory } from './GraphicFactory';

export interface GraphicFeatureFlags {
  resizable?: boolean;
  rotatable?: boolean;
  cloneable?: boolean;
  groupable?: boolean;
  dataBindable?: boolean;
  animatable?: boolean;
}

export interface GraphicThemeColors {
  [key: string]: { light: string; dark: string };
}

export interface GraphicOptions {
  type: string;
  name: string;
  category: string;
  primaryCategory?: string;
  icon?: string;
  description?: string;
  version?: string;
  tags?: string[];
  defaultProps?: Record<string, any>;
  defaultWidth?: number;
  defaultHeight?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  aspectRatio?: number;
  features?: GraphicFeatureFlags;
  themeColors?: GraphicThemeColors;
  schema?: any;
}

export function Graphic(type: string, name: string, category: string): ClassDecorator;
export function Graphic(options: GraphicOptions): ClassDecorator;
export function Graphic(
  typeOrOptions: string | GraphicOptions,
  name?: string,
  category?: string,
): ClassDecorator {
  return function (constructor: any) {
    let type: string;
    let displayName: string;
    let cat: string;
    let metaOptions: GraphicOptions;

    if (typeof typeOrOptions === 'string') {
      type = typeOrOptions;
      displayName = name!;
      cat = category!;
      metaOptions = { type, name: displayName, category: cat };
    } else {
      metaOptions = typeOrOptions;
      type = metaOptions.type;
      displayName = metaOptions.name;
      cat = metaOptions.category;
    }

    GraphicFactory.registerGraphic(type, constructor, displayName, cat, metaOptions.version, metaOptions.primaryCategory);

    constructor.type = type;
    constructor.displayName = displayName;
    constructor.category = cat;
    constructor.primaryCategory = metaOptions.primaryCategory || '';
    constructor.graphicMeta = metaOptions;
    if (metaOptions.defaultWidth !== undefined) {
      constructor.defaultWidth = metaOptions.defaultWidth;
    }
    if (metaOptions.defaultHeight !== undefined) {
      constructor.defaultHeight = metaOptions.defaultHeight;
    }
    if (metaOptions.defaultProps) {
      constructor.defaultProps = metaOptions.defaultProps;
    }
  };
}