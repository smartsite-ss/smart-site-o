// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin } from '../base/BasePlugin';
import { DrawContext } from '../types/DrawContext';
import type { Rect } from '../types/Rect';

const CANVAS_SIZE = 400;

type PluginConstructor<TProps extends Record<string, any>> = new (
  type: string, x?: number, y?: number, w?: number, h?: number
) => BasePlugin<TProps>;

export class PluginTestHarness<TProps extends Record<string, any>> {
  private _plugin: BasePlugin<TProps>;
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;
  private _bounds: Rect;

  constructor(
    PluginClass: PluginConstructor<TProps>,
    props?: Partial<TProps>,
    bounds?: Partial<Rect>,
  ) {
    this._canvas = document.createElement('canvas');
    this._canvas.width = CANVAS_SIZE;
    this._canvas.height = CANVAS_SIZE;
    this._ctx = this._canvas.getContext('2d')!;

    this._bounds = {
      x: bounds?.x ?? 0,
      y: bounds?.y ?? 0,
      width: bounds?.width ?? CANVAS_SIZE,
      height: bounds?.height ?? CANVAS_SIZE,
    };

    this._plugin = new PluginClass(
      '__test__',
      this._bounds.x,
      this._bounds.y,
      this._bounds.width,
      this._bounds.height,
    );

    if (props) {
      (this._plugin as unknown as { setPluginProps(p: Partial<TProps>): void }).setPluginProps(props);
    }
  }

  render(): ImageData {
    this._ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    const dc = new DrawContext(this._ctx, this._bounds, false);
    (this._plugin as any).render(dc);
    return this._ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  }

  assertPixelColor(x: number, y: number, expectedColor: string): void {
    const imageData = this.render();
    const idx = (y * CANVAS_SIZE + x) * 4;
    const r = imageData.data[idx];
    const g = imageData.data[idx + 1];
    const b = imageData.data[idx + 2];
    const a = imageData.data[idx + 3];

    const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
    const expected = expectedColor.toUpperCase();

    if (hex !== expected) {
      throw new Error(`Pixel at (${x}, ${y}) expected ${expected} but got ${hex} (rgba: ${r},${g},${b},${a})`);
    }
  }

  setProps(partial: Partial<TProps>): this {
    (this._plugin as unknown as { setPluginProps(p: Partial<TProps>): void }).setPluginProps(partial);
    return this;
  }

  setSize(width: number, height: number): this {
    (this._plugin as any).setProperty('config.geometry.width', width);
    (this._plugin as any).setProperty('config.geometry.height', height);
    this._bounds.width = width;
    this._bounds.height = height;
    return this;
  }

  get plugin(): BasePlugin<TProps> {
    return this._plugin;
  }

  get imageData(): ImageData {
    return this.render();
  }
}