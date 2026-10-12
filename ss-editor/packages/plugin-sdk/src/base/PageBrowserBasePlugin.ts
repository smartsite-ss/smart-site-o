// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { Component, App } from 'vue';
// @ts-expect-error - uuid is a peer dependency
import { v4 as uuidv4 } from 'uuid';

/**
 * PageBrowserBasePlugin - 页面浏览器图元基类
 *
 * 借鉴 VueComponentPlugin 的 mount() 模式，通过创建 Vue App 挂载 PageBrowser 控件。
 * 插件只负责传入 geometry（位置/宽高）和配置（pageName、displayMode 等），
 * 控件内部自行处理页面数据加载和多后端渲染。
 *
 * 架构分层：
 *   plugin-sdk（基类） → editor（PageBrowser.vue 控件） → plugins（具体实现）
 */
export abstract class PageBrowserBasePlugin<TProps extends Record<string, any> = Record<string, any>> {
  readonly type: string;
  id: string;
  version?: string;

  /** 组件名称（供 VueComponentsContainer 识别和 GraphicFactory 前缀拼接） */
  readonly componentName = 'page-browser';

  /** 默认宽高（供 GraphicFactory 使用） */
  static defaultWidth = 400;
  static defaultHeight = 300;

  /** 图元配置（兼容 BaseGraphic 的 JSON 序列化结构） */
  config: {
    id: string;
    type: string;
    name: string;
    geometry: { x: number; y: number; width: number; height: number; rotation: number; scale: number };
    style: Record<string, any>;
    isGroup: boolean;
    groupId: string | null;
    groupMembers: string[];
    customProps: Record<string, any>;
    locked: boolean;
    visible: boolean;
    disabled: boolean;
    zIndex: number;
    createdAt: number;
    updatedAt: number;
  };

  private _props!: TProps;
  private _app: App | null = null;
  private _mountPoint: HTMLDivElement | null = null;

  protected _x: number;
  protected _y: number;
  protected _width: number;
  protected _height: number;

  constructor(type: string, x = 0, y = 0, width = 400, height = 300) {
    this.type = type;
    this.id = uuidv4();
    this.version = '1.0';
    this._x = x;
    this._y = y;
    this._width = width;
    this._height = height;

    this.config = {
      id: this.id,
      type,
      name: type,
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
  }

  get pluginProps(): Readonly<TProps> {
    return this._props;
  }

  setDefaultProps(props: TProps): void {
    this._props = { ...props };
    // 同步到 config.customProps，确保持久化
    this.config.customProps = { ...props };
  }

  protected setPluginProps(partial: Partial<TProps>): void {
    const keys = Object.keys(partial) as Array<keyof TProps>;
    for (const k of keys) {
      (this._props as Record<string, any>)[k as string] = partial[k];
      // 同步到 config.customProps，确保属性面板修改能持久化
      this.config.customProps[k as string] = partial[k];
    }
    if (this._mountPoint) {
      (this._mountPoint as any).__pluginProps = { ...this._props };
    }
  }

  getSize(): { width: number; height: number } {
    return { width: this._width, height: this._height };
  }

  /** 获取图元位置（兼容 BaseGraphic 交互接口） */
  getPosition(): { x: number; y: number } {
    return { x: this._x, y: this._y };
  }

  /** 设置图元位置（兼容 BaseGraphic 交互接口） */
  setPosition(x: number, y: number): void {
    this._x = x;
    this._y = y;
    this.config.geometry.x = x;
    this.config.geometry.y = y;
    this.config.updatedAt = Date.now();
  }

  /** 设置图元尺寸（兼容 BaseGraphic 交互接口） */
  setSize(width: number, height: number): void {
    this._width = width;
    this._height = height;
    this.config.geometry.width = width;
    this.config.geometry.height = height;
    this.config.updatedAt = Date.now();
  }

  /** 判断点是否在图元内（兼容 BaseGraphic 交互接口） */
  containsPoint(x: number, y: number): boolean {
    const g = this.config.geometry;
    if (!g) return false;
    return x >= g.x && x <= g.x + g.width && y >= g.y && y <= g.y + g.height;
  }

  /** 判断区域是否与图元相交（兼容 BaseGraphic 框选接口） */
  intersectsRegion(x: number, y: number, width: number, height: number): boolean {
    const g = this.config.geometry;
    if (!g) return false;
    return g.x < x + width && g.x + g.width > x && g.y < y + height && g.y + g.height > y;
  }

  /** 获取锁定状态（兼容 BaseGraphic 交互接口） */
  getLocked(): boolean {
    return this.config.locked;
  }

  /** 获取可见性（兼容 BaseGraphic 交互接口） */
  getVisible(): boolean {
    return this.config.visible;
  }

  /** 获取旋转角度（兼容 BaseGraphic 交互接口） */
  getRotation(): number {
    return this.config.geometry.rotation;
  }

  /** 获取层级（兼容 BaseGraphic 交互接口） */
  getZIndex(): number {
    return this.config.zIndex;
  }

  /** 设置锁定状态（兼容 BaseGraphic 交互接口） */
  setLocked(v: boolean): void {
    this.config.locked = v;
  }

  /** 设置可见性（兼容 BaseGraphic 交互接口） */
  setVisible(v: boolean): void {
    this.config.visible = v;
  }

  /** 注入页面上下文（兼容 BaseGraphic 接口） */
  _setPageContext(_ctx: any): void {
    // PageBrowser 不需要页面上下文，空实现
  }

  updateGeometry(x: number, y: number, w: number, h: number): void {
    this._x = x;
    this._y = y;
    this._width = w;
    this._height = h;
    if (this._mountPoint) {
      this._mountPoint.style.left = `${x}px`;
      this._mountPoint.style.top = `${y}px`;
      this._mountPoint.style.width = `${w}px`;
      this._mountPoint.style.height = `${h}px`;
      (this._mountPoint as any).__pluginWidth = w;
      (this._mountPoint as any).__pluginHeight = h;
    }
  }

  async mount(container: HTMLElement): Promise<void> {
    const { createApp, h, reactive } = await import('vue');

    this._mountPoint = document.createElement('div');
    this._mountPoint.className = 'ss-plugin-page-browser';
    this._mountPoint.style.position = 'absolute';
    this._mountPoint.style.left = `${this._x}px`;
    this._mountPoint.style.top = `${this._y}px`;
    this._mountPoint.style.width = `${this._width}px`;
    this._mountPoint.style.height = `${this._height}px`;
    this._mountPoint.style.overflow = 'hidden';
    (this._mountPoint as any).__pluginProps = { ...this._props };
    (this._mountPoint as any).__pluginWidth = this._width;
    (this._mountPoint as any).__pluginHeight = this._height;

    const component = this.getComponent();

    // 响应式尺寸：页面数据加载后自动调整，使选择框与实际内容匹配
    const dynamicSize = reactive({ width: this._width, height: this._height });

    this._app = createApp({
      render() {
        const el = this.$el?.parentElement as any;
        const props = el?.__pluginProps || {};
        return h(component, {
          pageName: props.pageName,
          displayMode: props.displayMode || 'stretch',
          borderStyle: props.borderStyle || 'solid',
          borderWidth: props.borderWidth ?? 1,
          borderColor: props.borderColor || '#CCCCCC',
          backgroundColor: props.backgroundColor || '#FFFFFF',
          width: dynamicSize.width,
          height: dynamicSize.height,
          onPageLoaded: (pageWidth: number, pageHeight: number) => {
            // 自动将 PageBrowser 尺寸调整为目标页面尺寸
            dynamicSize.width = pageWidth;
            dynamicSize.height = pageHeight;
            this.updateGeometry(this._x, this._y, pageWidth, pageHeight);
          },
        });
      },
    });

    container.appendChild(this._mountPoint);
    this._app.mount(this._mountPoint);
  }

  unmount(): void {
    if (this._app) {
      this._app.unmount();
      this._app = null;
    }
    if (this._mountPoint) {
      this._mountPoint.remove();
      this._mountPoint = null;
    }
  }

  update(props: any): void {
    // PropertyPanel 传入的 props 包含 config/events/dataSource/animation 等完整结构，
    // 需要从中提取 customProps 来更新 PageBrowser 专有属性
    if (props.config?.customProps) {
      this.setPluginProps(props.config.customProps);
    } else {
      this.setPluginProps(props as Partial<TProps>);
    }
  }

  getComponentProps(): Record<string, any> {
    // 优先从 config.customProps 读取（属性面板直接修改此对象），
    // 回退到 _props（兼容 mount() 路径）
    const cp = this.config.customProps || {};
    const p = this._props || {};
    return {
      pageName: cp.pageName ?? p.pageName,
      displayMode: cp.displayMode || p.displayMode || 'stretch',
      borderStyle: cp.borderStyle || p.borderStyle || 'solid',
      borderWidth: cp.borderWidth ?? p.borderWidth ?? 1,
      borderColor: cp.borderColor || p.borderColor || '#CCCCCC',
      backgroundColor: cp.backgroundColor || p.backgroundColor || '#FFFFFF',
      width: this._width,
      height: this._height,
    };
  }

  getDomElement(): HTMLElement | null {
    return this._mountPoint;
  }

  onMounted(): void {}
  onUnmounted(): void {}
  onPropertyChanged(_changes: Record<string, any>): void {}

  /** 子类实现：返回 PageBrowser.vue 控件 */
  abstract getComponent(): Component;

  /** 从 JSON 反序列化图元状态（兼容 BaseGraphic.fromJSON） */
  fromJSON(data: any): void {
    if (data.version) this.version = data.version;

    if (data.config) {
      this.config = this._deepClone(data.config);
      this.config.id = this.id;
      // 同步 customProps 到 _props
      if (this.config.customProps) {
        this._props = { ...this._props, ...this.config.customProps } as TProps;
      }
      // 同步 geometry
      if (this.config.geometry) {
        this._x = this.config.geometry.x;
        this._y = this.config.geometry.y;
        this._width = this.config.geometry.width;
        this._height = this.config.geometry.height;
      }
    }

    this.id = this.config.id;
  }

  /** 序列化为 JSON（兼容 BaseGraphic.toJSON） */
  toJSON(): any {
    const result: any = {
      id: this.id,
      type: this.type,
      version: this.version || '1.0',
      config: {
        id: this.config.id,
        type: this.config.type,
        name: this.config.name,
        geometry: this.config.geometry ? { ...this.config.geometry } : undefined,
        style: this.config.style ? { ...this.config.style } : undefined,
        isGroup: this.config.isGroup,
        groupId: this.config.groupId,
        groupMembers: this.config.groupMembers ? [...this.config.groupMembers] : [],
        customProps: this.config.customProps ? this._deepClone(this.config.customProps) : undefined,
        locked: this.config.locked,
        visible: this.config.visible,
        disabled: this.config.disabled,
        zIndex: this.config.zIndex,
        createdAt: this.config.createdAt,
        updatedAt: this.config.updatedAt,
      },
    };
    Object.keys(result.config).forEach(key => {
      if (result.config[key] === undefined) delete result.config[key];
    });
    return result;
  }

  private _deepClone(obj: any, visited = new WeakMap()): any {
    if (obj === null || typeof obj !== 'object') return obj;
    if (visited.has(obj)) return undefined;
    visited.set(obj, true);
    if (obj instanceof Date) return new Date(obj.getTime());
    if (Array.isArray(obj)) return obj.map((item) => this._deepClone(item, visited));
    const cloned: any = {};
    for (const key in obj) {
      if (key === 'target' || !Object.prototype.hasOwnProperty.call(obj, key)) continue;
      const val = this._deepClone(obj[key], visited);
      if (val !== undefined) cloned[key] = val;
    }
    return cloned;
  }
}