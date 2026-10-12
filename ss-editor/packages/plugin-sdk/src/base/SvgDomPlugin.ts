// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export abstract class SvgDomPlugin<TProps extends Record<string, any>> {
  readonly type: string;

  private _props!: TProps;
  private _container: HTMLElement | null = null;

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
  }

  getSize(): { width: number; height: number } {
    return { width: this._width, height: this._height };
  }

  updateGeometry(x: number, y: number, w: number, h: number): void {
    this._x = x;
    this._y = y;
    this._width = w;
    this._height = h;
    if (this._container) {
      this._container.style.left = `${x}px`;
      this._container.style.top = `${y}px`;
      this._container.style.width = `${w}px`;
      this._container.style.height = `${h}px`;
    }
  }

  mount(container: HTMLElement): void {
    this._container = container;
    this._render();
  }

  unmount(): void {
    if (this._container) {
      this._container.innerHTML = '';
      this._container = null;
    }
  }

  update(props: Partial<TProps>): void {
    this.setPluginProps(props);
    this._render();
  }

  getDomElement(): HTMLElement | null {
    return this._container;
  }

  onMounted(): void {}
  onUnmounted(): void {}
  onPropertyChanged(_changes: Record<string, any>): void {}
  onThemeChanged(_themeName: string): void {}

  abstract getSvgTemplate(props: TProps): string;

  private _render(): void {
    if (!this._container) return;
    const svgString = this.getSvgTemplate(this._props);
    this._container.innerHTML = svgString;
  }
}