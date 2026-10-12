// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { IGraphic } from '../types/IGraphic';

export interface GraphicInfo {
  type: string;
  name: string;
  category: string;
  version: string;
  primaryCategory?: string;
  constructor: new (
    x: number,
    y: number,
    width: number,
    height: number
  ) => IGraphic;
}

export class GraphicFactory {
  private static graphics: Map<string, GraphicInfo> = new Map();

  static registerGraphic(
    type: string,
    constructor: new (
      x: number,
      y: number,
      width: number,
      height: number
    ) => IGraphic,
    name: string,
    category: string,
    version?: string,
    primaryCategory?: string
  ) {
    this.graphics.set(type, {
      type,
      name,
      category,
      version: version || '0.0.0',
      primaryCategory: primaryCategory || '',
      constructor,
    });
  }

  static createGraphic(
    type: string,
    x: number = 0,
    y: number = 0,
    width: number = 0,
    height: number = 0
  ): IGraphic {
    const info = this.graphics.get(type);
    if (info) {
      const constructor = info.constructor;
      const defaultWidth = (constructor as any).defaultWidth || 100;
      const defaultHeight = (constructor as any).defaultHeight || 100;

      const finalWidth = width || defaultWidth;
      const finalHeight = height || defaultHeight;

      const graphic = new constructor(x, y, finalWidth, finalHeight);

      // 注入插件版本到图元实例
      graphic.version = info.version;

      if (info.category && (graphic as any).componentName) {
        (graphic as any).componentName = `${info.category}-${(graphic as any).componentName}`;
      }
      return graphic;
    } else if (type === 'naive-button') {
      const button = this.createGraphic('button', x, y, width, height);
      button.type = 'naive-button';
      (button as any).componentName = 'NaiveButton';
      button.config.customProps = {
        ...(button.config.customProps || {}),
        text: 'Naive Button',
        type: 'primary',
        size: 'medium',
        round: false,
        circle: false,
        disabled: false,
        loading: false,
      };
      return button;
    } else {
      throw new Error(`Unknown graphic type: ${type}`);
    }
  }

  static createGraphicFromJSON(data: any): IGraphic {
    let x = 0, y = 0, width = 0, height = 0;
    
    if (data.config?.config?.geometry) {
      const geometry = data.config.geometry;
      x = geometry.x || 0;
      y = geometry.y || 0;
      width = geometry.width || 0;
      height = geometry.height || 0;
    } else if (data.geometry) {
      const geometry = data.geometry;
      x = geometry.x || 0;
      y = geometry.y || 0;
      width = geometry.width || 0;
      height = geometry.height || 0;
    } else {
      x = data.x || 0;
      y = data.y || 0;
      width = data.width || 0;
      height = data.height || 0;
    }
    
    const info = this.graphics.get(data.type);

    // 版本迁移：如果存储的版本与当前注册的版本不一致，预留迁移入口
    if (info && data.version && info.version !== '0.0.0' && data.version !== info.version) {
      const pluginDef = (info.constructor as any).pluginDefinition;
      if (pluginDef?.migrations) {
        data = applyMigrations(data, pluginDef.migrations, info.version);
      }
    }
    
    const graphic = this.createGraphic(
      data.type,
      x,
      y,
      width,
      height
    );
    if (data.type === 'naive-button') {
      graphic.type = 'naive-button';
      graphic.config.customProps.componentName = 'NaiveButton';
    }
    graphic.fromJSON(data);
    return graphic;
  }

  static getGraphicTypes(): GraphicInfo[] {
    return Array.from(this.graphics.values());
  }

  static unregisterGraphic(type: string) {
    this.graphics.delete(type);
  }

  static getGraphicInfo(type: string): GraphicInfo | undefined {
    return this.graphics.get(type);
  }

  static hasGraphic(type: string): boolean {
    return this.graphics.has(type);
  }

  /** 根据 type 查询注册的插件版本 */
  static getGraphicVersion(type: string): string | undefined {
    return this.graphics.get(type)?.version;
  }
}

/**
 * 版本迁移辅助函数
 * 按版本顺序执行迁移链，将旧数据逐步升级到目标版本
 */
function applyMigrations(
  data: any,
  migrations: Record<string, (data: any) => any>,
  targetVersion: string
): any {
  const sortedVersions = Object.keys(migrations).sort();
  let result = data;
  for (const version of sortedVersions) {
    if (version <= targetVersion && version > (data.version || '0.0.0')) {
      result = migrations[version](result);
      result.version = version;
    }
  }
  return result;
}