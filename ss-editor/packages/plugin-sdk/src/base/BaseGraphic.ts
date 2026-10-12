// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { IGraphic } from '../types/IGraphic';
import type { IPageContext } from '../types/IPageContext';
import {
  IGraphicConfig,
  IAnimation,
  IDataSource,
  IGraphicEvent,
  IGraphicStyle,
  IGraphicJSON,
} from '../types/IProperty';
import { GraphicFactory } from './GraphicFactory';
// @ts-expect-error - uuid is a peer dependency
import { v4 as uuidv4 } from 'uuid';
import type { DataInputPayload } from '../types/DataInputPayload';
import { QUALITY_VISUAL_MAP, type QualityCode } from '../types/QualityCode';

export abstract class BaseGraphic implements IGraphic {
  private _propertyVersion = 0;
  private _propertyCache: Map<string, any> = new Map();
  private _cacheVersion = -1;

  /** 质量/告警视觉覆盖前的原始属性备份（Phase 15.3 修复 restore bug） */
  private _savedVisualState: {
    borderColor?: any;
    borderWidth?: any;
    borderStyle?: any;
    opacity?: any;
  } | null = null;

  id: string;
  type: string;
  version?: string;
  config: IGraphicConfig;
  events: IGraphicEvent;
  dataSource: IDataSource;
  animation?: IAnimation;
  children?: IGraphic[];

  protected _pageContext: IPageContext | null = null;

  get pageContext(): IPageContext | null {
    return this._pageContext;
  }

  _setPageContext(ctx: IPageContext | null): void {
    this._pageContext = ctx;
  }

  constructor(
    type: string,
    x: number = 0,
    y: number = 0,
    width: number = 100,
    height: number = 100
  ) {
    this.id = uuidv4();
    this.type = type;
    // 版本由 GraphicFactory.createGraphic() 注入 graphic.version = info.version
    // 不通过 factory 直接 new 的图元，version 保持 undefined，toJSON() 已使用兜底 '1.0'

    this.config = {
      id: this.id,
      type: type,
      name: type.charAt(0).toUpperCase() + type.slice(1),
      geometry: { x, y, width, height, rotation: 0, scale: 1 },
      style: {},
      isGroup: false,
      groupId: null,
      groupMembers: [],
      customProps: {},
      locked: false,
      visible: true,
      disabled: false,
      zIndex: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.events = {
      eventHandlers: {}, type: '', payload: {}, timestamp: Date.now(),
    };

    this.dataSource = {
      type: '', target: this.config, payload: {}, timestamp: Date.now(),
      validation: { required: false, min: null, max: null, pattern: '', script: '', message: '' },
      enabled: false, dataSource: '', dataField: '', displayField: '', dataMapping: [],
    };

    this.animation = { enabled: false, type: 'fade-in', duration: 0.5, delay: 0, easing: 'ease', properties: {} };
    this.children = undefined;
  }

  abstract draw(context: CanvasRenderingContext2D): void;

  onMounted(): void {
    this.pageContext?.animationEngine?.play(this);
  }
  onUnmounted(): void {
    this.pageContext?.animationEngine?.stop(this.id);
  }
  onPropertyChanged(_changes: any): void {}
  onDataChanged(_data: any): void {}

  onDataInput(payload: DataInputPayload): void {
    for (const action of payload.actions) {
      switch (action.type) {
        case 'setProperty':
          this.setProperty(`config.customProps.${action.target}`, action.value);
          break;
        case 'setStyle':
          this.setProperty(`config.style.${action.target}`, action.value);
          break;
        case 'setAnimation':
          if (this.animation) {
            this.setProperty(`animation.${action.target}`, action.value);
          }
          break;
        case 'triggerAction':
          this.onDataChanged({ type: 'triggerAction', target: action.target, value: action.value });
          break;
      }
    }

    if (payload.alarm) {
      this.setAlarmVisual(payload.alarm.severity);
    }

    if (payload.quality) {
      if (payload.quality === 'good') {
        this.clearQualityVisual();
      } else {
        this.setQualityVisual(payload.quality);
      }
    }

    this.onPropertyChanged({
      customProps: payload.actions
        .filter((a) => a.type === 'setProperty')
        .reduce((acc, a) => ({ ...acc, [a.target]: a.value }), {}),
    });
  }

  setAlarmVisual(severity: string): void {
    const alarmColors: Record<string, string> = {
      info: '#2196F3',
      warning: '#FF9800',
      critical: '#F44336',
    };
    const color = alarmColors[severity] || '#F44336';
    this._saveVisualState();
    // 同时写入 config.style（Canvas 插件读取）和 config.customProps（Vue 插件读取）
    this.setProperty('config.style.borderColor', color);
    this.setProperty('config.style.borderWidth', 2);
    this.setProperty('config.style.borderStyle', 'solid');
    this.setProperty('config.customProps.borderColor', color);
    this.setProperty('config.customProps.borderWidth', 2);
    this.setProperty('config.customProps.borderStyle', 'solid');
  }

  clearAlarmVisual(): void {
    this._restoreVisualState();
  }

  setQualityVisual(code: QualityCode): void {
    const indicator = QUALITY_VISUAL_MAP[code];
    if (!indicator) return;
    this._saveVisualState();
    // 同时写入 config.style（Canvas 插件读取）和 config.customProps（Vue 插件读取）
    this.setProperty('config.style.borderColor', indicator.color);
    this.setProperty('config.style.borderStyle', indicator.borderStyle);
    this.setProperty('config.style.opacity', indicator.opacity);
    this.setProperty('config.customProps.borderColor', indicator.color);
    this.setProperty('config.customProps.borderStyle', indicator.borderStyle);
  }

  clearQualityVisual(): void {
    this._restoreVisualState();
  }

  /**
   * 保存当前视觉状态（在质量/告警覆盖前调用）
   * 仅在未保存时才保存，避免多次覆盖导致原始值丢失
   */
  private _saveVisualState(): void {
    if (this._savedVisualState) return;
    const customProps = this.config.customProps || {};
    const style = this.config.style || {};
    this._savedVisualState = {
      borderColor: customProps.borderColor ?? style.borderColor,
      borderWidth: customProps.borderWidth ?? style.borderWidth,
      borderStyle: customProps.borderStyle ?? style.borderStyle,
      opacity: style.opacity ?? 1,
    };
  }

  /**
   * 恢复原始视觉状态（清除质量/告警覆盖时调用）
   */
  private _restoreVisualState(): void {
    if (!this._savedVisualState) return;
    const saved = this._savedVisualState;
    this.setProperty('config.style.borderColor', saved.borderColor);
    this.setProperty('config.style.borderWidth', saved.borderWidth);
    this.setProperty('config.style.borderStyle', saved.borderStyle);
    this.setProperty('config.style.opacity', saved.opacity);
    this.setProperty('config.customProps.borderColor', saved.borderColor);
    this.setProperty('config.customProps.borderWidth', saved.borderWidth);
    this.setProperty('config.customProps.borderStyle', saved.borderStyle);
    this._savedVisualState = null;
  }
  onThemeChanged(_themeName: string): void {}
  onResize(_width: number, _height: number): void {}
  onVisibilityChanged(_visible: boolean): void {}

  update(properties: Partial<Record<string, any>>): void {
    try {
      this.validateProperties(properties);
      if (properties.config) { Object.assign(this.config, properties.config); }
      if (properties.geometry) this._updateGeometry(properties.geometry);
      if (properties.style) Object.assign(this.config.style, properties.style);
      if (properties.visible !== undefined) this.config.visible = properties.visible;
      if (properties.locked !== undefined) this.config.locked = properties.locked;
      if (properties.zIndex !== undefined) this.config.zIndex = properties.zIndex;
      if (properties.properties) Object.assign(this.config.customProps, properties.properties);
      if (properties.events) {
        if (Array.isArray(properties.events)) {
          // 数组格式 → eventHandlers Record 格式
          const handlers: Record<string, any> = {};
          for (const evt of properties.events) {
            handlers[evt.id] = evt;
          }
          Object.assign(this.events, { eventHandlers: handlers });
        } else {
          Object.assign(this.events, properties.events);
        }
      }
      if (properties.dataSource) Object.assign(this.dataSource, properties.dataSource);
      if (properties.animation) Object.assign(this.animation || {}, properties.animation);
      if (properties.children) this.children = properties.children;
      this.bumpVersion();
      this.clearCache();
    } catch (_error) { /* empty */ }
  }

  private _updateGeometry(g: any): void {
    this.config.geometry = {
      ...this.config.geometry, ...g,
      x: Math.round(g.x ?? this.config.geometry.x ?? 0),
      y: Math.round(g.y ?? this.config.geometry.y ?? 0),
      width: Math.round(g.width ?? this.config.geometry.width ?? 0),
      height: Math.round(g.height ?? this.config.geometry.height ?? 0),
    };
  }

  private isCacheValid(): boolean { return this._cacheVersion === this._propertyVersion; }
  private clearCache(): void { this._propertyCache.clear(); this._cacheVersion = this._propertyVersion; }
  private bumpVersion(): void { this._propertyVersion++; }

  validateProperties(properties: Partial<Record<string, any>>): void {
    if (properties.geometry) {
      const g = properties.geometry;
      if (!g) return;
      if (g.x !== undefined && typeof g.x !== 'number') throw new Error('Invalid position coordinates: x');
      if (g.y !== undefined && typeof g.y !== 'number') throw new Error('Invalid position coordinates: y');
      if (g.width !== undefined && typeof g.width !== 'number') throw new Error('Invalid size dimensions: width');
      if (g.height !== undefined && typeof g.height !== 'number') throw new Error('Invalid size dimensions: height');
      if (g.width !== undefined && g.width < 0) throw new Error('Size dimensions must be non-negative: width');
      if (g.height !== undefined && g.height < 0) throw new Error('Size dimensions must be non-negative: height');
      if (g.rotation !== undefined && typeof g.rotation !== 'number') throw new Error('Invalid rotation value');
      if (g.scale !== undefined && (typeof g.scale !== 'number' || g.scale <= 0)) throw new Error('Invalid scale value');
    }
    if (properties.zIndex !== undefined && typeof properties.zIndex !== 'number') {
      throw new Error('Invalid zIndex value');
    }
  }

  getProperty<T>(path: string, defaultValue: T): T {
    try {
      if (this.isCacheValid() && this._propertyCache.has(path)) {
        return this._propertyCache.get(path);
      }

      let result: any;
      const parts = path.split('.');
      if (parts[0] === 'events' || parts[0] === 'dataSource' || parts[0] === 'animation' || parts[0] === 'children') {
        result = this;
      } else if (parts[0] === 'config') {
        result = this.config;
        parts.shift();
      } else {
        result = this;
      }

      for (const part of parts) {
        if (result === undefined || result === null) {
          if (this.isCacheValid()) this._propertyCache.set(path, defaultValue);
          return defaultValue;
        }
        result = result[part];
      }

      const returnValue = result !== undefined ? result : defaultValue;
      if (this.isCacheValid()) this._propertyCache.set(path, returnValue);
      return returnValue;
    } catch (_error) {
      return defaultValue;
    }
  }

  setProperty(path: string, value: any): void {
    try {
      const parts = path.split('.');
      let obj: any;

      if (parts[0] === 'events' || parts[0] === 'dataSource' || parts[0] === 'animation' || parts[0] === 'children') {
        obj = this;
      } else if (parts[0] === 'config') {
        obj = this.config;
        parts.shift();
      } else {
        obj = this;
      }

      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (obj[part] === undefined) obj[part] = {};
        obj = obj[part];
      }

      obj[parts[parts.length - 1]] = value;
      this.bumpVersion();
      this.clearCache();
    } catch (_error) {
      /* empty */
    }
  }

  getProps<T>(key: string, defaultValue?: T): T {
    return this.getProperty(`config.customProps.${key}`, defaultValue as T);
  }

  setProps(key: string, value: any): void {
    this.setProperty(`config.customProps.${key}`, value);
  }

  getStyle(): IGraphicStyle {
    return this.getProperty('config.style', {} as IGraphicStyle);
  }

  setStyle(style: IGraphicStyle): void {
    const currentStyle = this.getStyle();
    this.setProperty('config.style', { ...currentStyle, ...style });
  }

  containsPoint(x: number, y: number): boolean {
    const g = this.config.geometry;
    if (!g) return false;
    return x >= g.x && x <= g.x + g.width && y >= g.y && y <= g.y + g.height;
  }

  intersectsRegion(x: number, y: number, width: number, height: number): boolean {
    const g = this.config.geometry;
    if (!g) return false;
    return g.x < x + width && g.x + g.width > x && g.y < y + height && g.y + g.height > y;
  }

  toJSON(): IGraphicJSON {
    const result: any = {
      id: this.id, type: this.type, version: this.version || '1.0',
      config: {
        id: this.config.id,
        type: this.config.type,
        name: this.config.name,
        geometry: this.config.geometry ? { ...this.config.geometry } : undefined,
        style: this.config.style ? { ...this.config.style } : undefined,
        isGroup: this.config.isGroup,
        groupId: this.config.groupId,
        groupMembers: this.config.groupMembers ? [...this.config.groupMembers] : [],
        customProps: this.config.customProps ? { ...this.config.customProps } : undefined,
        locked: this.config.locked,
        visible: this.config.visible,
        disabled: this.config.disabled,
        zIndex: this.config.zIndex,
        createdAt: this.config.createdAt,
        updatedAt: this.config.updatedAt,
      },
    };

    if (this.events) result.config.events = this.deepClone(this.events);
    if (this.dataSource) result.config.dataSource = this.deepClone(this.dataSource);
    if (this.animation) result.config.animation = this.deepClone(this.animation);
    if (this.children) result.config.children = this.children.map(child => child.toJSON());

    Object.keys(result.config).forEach(key => { if (result.config[key] === undefined) delete result.config[key]; });
    return result;
  }

  fromJSON(data: any): void {
    // 读取存储的版本
    if (data.version) this.version = data.version;

    // 未来：版本比较 + 迁移
    // const registeredVersion = GraphicFactory.getGraphicVersion(this.type);
    // if (registeredVersion && this.version && this.version !== registeredVersion) {
    //   this.migrate(this.version, registeredVersion);
    // }

    if (data.config) {
      this.config = this.deepClone(data.config);
      // 保留 JSON 中的原始图元 ID（顶层 id 或 config.id），
      // 避免每次加载重新生成 UUID 导致数据源绑定（graphicBindings.graphicId）失配
      this.id = data.id || this.config.id || this.id;
      this.config.id = this.id;
    }

    const ev = data.events || data.config?.events;
    if (ev) { const e = this.deepClone(ev); delete e.target; this.events = e; }
    const ds = data.dataSource || data.config?.dataSource;
    if (ds) { const d = this.deepClone(ds); delete d.target; d.target = this.config; this.dataSource = d; }
    const anim = data.animation || data.config?.animation;
    if (anim) this.animation = this.deepClone(anim);

    if (data.children) {
      this.children = data.children
        .map((childData: any) => {
          try {
            return GraphicFactory.createGraphicFromJSON(childData);
          } catch (e) {
            console.warn(`[BaseGraphic.fromJSON] Failed to create child graphic type "${childData?.type || 'unknown'}":`, e);
            return null;
          }
        })
        .filter((c: any) => c !== null);
    }

    if (this.dataSource) this.dataSource.target = this.config;
    this.id = this.config.id;
    this.type = this.config.type;
  }

  private deepClone(obj: any, visited = new WeakMap()): any {
    if (obj === null || typeof obj !== 'object') return obj;
    if (visited.has(obj)) return undefined;
    visited.set(obj, true);
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map((item) => this.deepClone(item, visited));
    if (typeof obj === 'object') {
      const cloned: any = {};
      for (const key in obj) {
        if (key === 'target' || !Object.prototype.hasOwnProperty.call(obj, key)) continue;
        const val = this.deepClone(obj[key], visited);
        if (val !== undefined) cloned[key] = val;
      }
      return cloned;
    }
  }

  getPosition(): { x: number; y: number } {
    return { x: this.getProperty('config.geometry.x', 0), y: this.getProperty('config.geometry.y', 0) };
  }

  setPosition(x: number, y: number): void {
    this.setProperty('config.geometry.x', Math.round(x));
    this.setProperty('config.geometry.y', Math.round(y));
  }

  getSize(): { width: number; height: number } {
    return { width: this.getProperty('config.geometry.width', 0), height: this.getProperty('config.geometry.height', 0) };
  }

  setSize(width: number, height: number): void {
    this.setProperty('config.geometry.width', Math.round(width));
    this.setProperty('config.geometry.height', Math.round(height));
  }

  getZIndex(): number { return this.getProperty('config.zIndex', 0); }
  setZIndex(z: number): void { this.setProperty('config.zIndex', z); }

  getVisible(): boolean { return this.getProperty('config.visible', true); }
  setVisible(v: boolean): void { this.setProperty('config.visible', v); }

  getLocked(): boolean { return this.getProperty('config.locked', false); }
  setLocked(v: boolean): void { this.setProperty('config.locked', v); }

  getDisabled(): boolean { return this.getProperty('config.disabled', false); }
  setDisabled(v: boolean): void { this.setProperty('config.disabled', v); }

  getRotation(): number { return this.getProperty('config.geometry.rotation', 0); }
  setRotation(r: number): void { this.setProperty('config.geometry.rotation', r); }

  rotate(degrees: number): void {
    let r = (this.getRotation() + degrees) % 360;
    if (r < 0) r += 360;
    this.setRotation(r);
  }

  setRotationAbsolute(degrees: number): void {
    let r = degrees % 360;
    if (r < 0) r += 360;
    this.setRotation(r);
  }

  getFontStyle(): {
    fontSize?: number; fontFamily?: string; fontStyle?: string;
    fontWeight?: string; textAlign?: 'left' | 'center' | 'right';
    letterSpacing?: number; lineHeight?: number;
  } {
    const s = this.config.style || {};
    return {
      fontSize: s.fontSize,
      fontFamily: s.fontFamily,
      fontStyle: s.fontStyle,
      fontWeight: s.fontWeight,
      textAlign: s.textAlign as 'left' | 'center' | 'right' | undefined,
      letterSpacing: s.letterSpacing,
      lineHeight: s.lineHeight,
    };
  }

  setFontStyle(style: Record<string, any>): void {
    if (!this.config.style) this.config.style = {};
    Object.assign(this.config.style, style);
  }

  getBorderStyle(): {
    borderColor?: string; borderWidth?: number;
    borderRadius?: number; borderStyle?: string;
  } {
    const s = this.config.style || {};
    return {
      borderColor: s.borderColor,
      borderWidth: s.borderWidth,
      borderRadius: s.borderRadius,
      borderStyle: s.borderStyle,
    };
  }

  setBorderStyle(style: Record<string, any>): void {
    if (!this.config.style) this.config.style = {};
    Object.assign(this.config.style, style);
  }
}