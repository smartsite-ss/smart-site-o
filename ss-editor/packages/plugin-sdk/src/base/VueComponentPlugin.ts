// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { Component, App } from 'vue';

export abstract class VueComponentPlugin<TProps extends Record<string, any>> {
  readonly type: string;

  private _props!: TProps;
  private _app: App | null = null;
  private _mountPoint: HTMLDivElement | null = null;

  protected _x: number;
  protected _y: number;
  protected _width: number;
  protected _height: number;

  constructor(type: string, x: number = 0, y: number = 0, width: number = 100, height: number = 100) {
    this.type = type;
    this._x = x;
    this._y = y;
    this._width = width;
    this._height = height;
  }

  get pluginProps(): Readonly<TProps> {
    return this._props;
  }

  setDefaultProps(props: TProps): void {
    this._props = { ...props };
  }

  protected setPluginProps(partial: Partial<TProps>): void {
    const keys = Object.keys(partial) as Array<keyof TProps>;
    for (const k of keys) {
      (this._props as Record<string, any>)[k as string] = partial[k];
    }
    if (this._mountPoint) {
      (this._mountPoint as any).__pluginProps = { ...this._props };
    }
  }

  getSize(): { width: number; height: number } {
    return { width: this._width, height: this._height };
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
    }
  }

  async mount(container: HTMLElement): Promise<void> {
    const { createApp, h } = await import('vue');

    this._mountPoint = document.createElement('div');
    this._mountPoint.className = 'ss-plugin-vue-component';
    this._mountPoint.style.position = 'absolute';
    this._mountPoint.style.left = `${this._x}px`;
    this._mountPoint.style.top = `${this._y}px`;
    this._mountPoint.style.width = `${this._width}px`;
    this._mountPoint.style.height = `${this._height}px`;
    this._mountPoint.style.overflow = 'visible';
    (this._mountPoint as any).__pluginProps = { ...this._props };

    const component = this.getComponent();
    this._app = createApp({
      render() {
        const el = this.$el?.parentElement as any;
        const props = el?.__pluginProps || {};
        return h(component, props);
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

  update(props: Partial<TProps>): void {
    this.setPluginProps(props);
  }

  getDomElement(): HTMLElement | null {
    return this._mountPoint;
  }

  onMounted(): void {}
  onUnmounted(): void {}
  onPropertyChanged(_changes: Record<string, any>): void {}
  onThemeChanged(_themeName: string): void {}

  abstract getComponent(): Component;
}