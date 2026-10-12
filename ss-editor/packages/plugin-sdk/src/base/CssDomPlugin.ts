// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export abstract class CssDomPlugin<TProps extends Record<string, any>> {
  readonly type: string;

  private _props!: TProps;
  private _element: HTMLElement | null = null;

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
    if (this._element) {
      this._element.style.left = `${x}px`;
      this._element.style.top = `${y}px`;
      this._element.style.width = `${w}px`;
      this._element.style.height = `${h}px`;
    }
  }

  mount(container: HTMLElement): void {
    this._element = document.createElement('div');
    this._element.className = 'ss-plugin-css-dom';
    this._element.style.position = 'absolute';
    this._element.style.left = `${this._x}px`;
    this._element.style.top = `${this._y}px`;
    this._element.style.width = `${this._width}px`;
    this._element.style.height = `${this._height}px`;
    this._element.style.overflow = 'hidden';
    this._element.innerHTML = this.getHtmlTemplate(this._props);
    container.appendChild(this._element);
    this.applyCssVariables(this._props);
  }

  unmount(): void {
    if (this._element) {
      this._element.remove();
      this._element = null;
    }
  }

  update(props: Partial<TProps>): void {
    this.setPluginProps(props);
    if (this._element) {
      this._element.innerHTML = this.getHtmlTemplate(this._props);
    }
    this.applyCssVariables(this._props);
  }

  getDomElement(): HTMLElement | null {
    return this._element;
  }

  protected applyCssVariables(_props: TProps): void {
    if (!this._element) return;
  }

  onMounted(): void {}
  onUnmounted(): void {}
  onPropertyChanged(_changes: Record<string, any>): void {}
  onThemeChanged(_themeName: string): void {}

  abstract getHtmlTemplate(props: TProps): string;
}