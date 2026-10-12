// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { IRenderer } from '../types/IRenderer';
import { RenderBackend } from '../types/RenderBackend';
import type { IPluginInstance } from '../types/IPluginInstance';
import { DrawContext } from '../types/DrawContext';
import type { Rect } from '../types/Rect';

interface Canvas2DElement extends IPluginInstance {
  getPosition(): { x: number; y: number };
  getSize(): { width: number; height: number };
  getVisible(): boolean;
  getZIndex(): number;
  getRotation?(): number;
}

export interface Canvas2DRendererOptions {
  canvas?: HTMLCanvasElement;
  width?: number;
  height?: number;
  cullingBufferRatio?: number;
}

export class Canvas2DRenderer implements IRenderer {
  readonly backend = RenderBackend.CANVAS_2D;

  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D | null;
  private _elements = new Map<string, Canvas2DElement>();
  private _frameId: number | null = null;
  private _dirty = new Set<string>();
  private _allDirty = false;

  private _scale = 1;
  private _panX = 0;
  private _panY = 0;

  private _cullingEnabled = false;
  private _cullingBufferRatio: number;

  private _viewport: { x: number; y: number; width: number; height: number } | null = null;
  private _stopped = false;

  constructor(container: HTMLElement, options: Canvas2DRendererOptions = {}) {
    this._canvas = options.canvas || document.createElement('canvas');
    this._canvas.width = options.width || container.clientWidth || 800;
    this._canvas.height = options.height || container.clientHeight || 600;
    this._canvas.style.display = 'block';
    this._cullingBufferRatio = options.cullingBufferRatio ?? 0.05;

    this._ctx = this._canvas.getContext('2d') as CanvasRenderingContext2D | null;

    if (!options.canvas) {
      container.appendChild(this._canvas);
    }

    this._startLoop();
  }

  get canvas(): HTMLCanvasElement {
    return this._canvas;
  }

  mount(_container: HTMLElement, element: IPluginInstance): void {
    this._validateElement(element);
    this._elements.set(element.type + '_' + this._elements.size, element as Canvas2DElement);
    this.markAllDirty();
  }

  unmount(element: IPluginInstance): void {
    for (const [key, el] of this._elements) {
      if (el === element) {
        this._clearElementArea(el as Canvas2DElement);
        this._elements.delete(key);
        this.markAllDirty();
        return;
      }
    }
  }

  update(element: IPluginInstance, _props: Record<string, any>): void {
    for (const [, el] of this._elements) {
      if (el === element) {
        this._dirty.add(el.type);
        return;
      }
    }
  }

  updateGeometry(element: IPluginInstance, _x: number, _y: number, _w: number, _h: number): void {
    for (const [, el] of this._elements) {
      if (el === element) {
        this._clearElementArea(el as Canvas2DElement);
        this._dirty.add(el.type);
        this.markAllDirty();
        return;
      }
    }
  }

  setPanZoom(scale: number, panX: number, panY: number): void {
    this._scale = scale;
    this._panX = panX;
    this._panY = panY;
    this.markAllDirty();
  }

  setViewport(viewport: { x: number; y: number; width: number; height: number }): void {
    this._viewport = viewport;
  }

  setCullingEnabled(enabled: boolean): void {
    this._cullingEnabled = enabled;
    if (enabled) this.markAllDirty();
  }

  renderAll(): void {
    if (!this._ctx) return;
    this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

    const all = Array.from(this._elements.values());
    const visible = this._cullingEnabled && this._viewport
      ? this._getVisibleElements(all)
      : all;

    visible.sort((a, b) => a.getZIndex() - b.getZIndex());

    for (const el of visible) {
      this._drawElement(el);
    }
  }

  resize(width: number, height: number): void {
    this._canvas.width = width;
    this._canvas.height = height;
    this.markAllDirty();
  }

  clear(): void {
    if (this._ctx) {
      this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    }
    this._elements.clear();
    this._dirty.clear();
  }

  destroy(): void {
    this._stopped = true;
    if (this._frameId !== null) {
      cancelAnimationFrame(this._frameId);
      this._frameId = null;
    }
    this.clear();
    if (this._canvas.parentElement) {
      this._canvas.parentElement.removeChild(this._canvas);
    }
  }

  markAllDirty(): void {
    this._allDirty = true;
  }

  getElementCount(): number {
    return this._elements.size;
  }

  private _startLoop(): void {
    const loop = () => {
      if (this._stopped) return;
      if (!this._ctx) {
        this._frameId = requestAnimationFrame(loop);
        return;
      }
      if (this._allDirty) {
        this.renderAll();
        this._allDirty = false;
        this._dirty.clear();
      } else if (this._dirty.size > 0) {
        for (const type of this._dirty) {
          for (const [, el] of this._elements) {
            if (el.type === type) {
              this._clearElementArea(el);
              this._drawElement(el);
            }
          }
        }
        this._dirty.clear();
      }
      this._frameId = requestAnimationFrame(loop);
    };
    this._frameId = requestAnimationFrame(loop);
  }

  private _validateElement(element: IPluginInstance): void {
    const el = element as unknown as Canvas2DElement;
    if (typeof el.getPosition !== 'function') {
      throw new Error(`Canvas2DRenderer: element must implement getPosition()`);
    }
    if (typeof el.getSize !== 'function') {
      throw new Error(`Canvas2DRenderer: element must implement getSize()`);
    }
  }

  private _drawElement(el: Canvas2DElement): void {
    if (!this._ctx) return;
    if (!el.getVisible()) return;

    this._ctx.save();
    this._ctx.setTransform(this._scale, 0, 0, this._scale, this._panX, this._panY);

    const rotation = el.getRotation?.() || 0;
    const pos = el.getPosition();
    if (rotation !== 0) {
      const size = el.getSize();
      const cx = pos.x + size.width / 2;
      const cy = pos.y + size.height / 2;
      this._ctx.translate(cx, cy);
      this._ctx.rotate((rotation * Math.PI) / 180);
      this._ctx.translate(-cx, -cy);
    }

    if (el.render && typeof el.render === 'function') {
      const size = el.getSize();
      const bounds: Rect = { x: pos.x, y: pos.y, width: size.width, height: size.height };
      const dc = new DrawContext(this._ctx, bounds);
      el.render(dc);
    }

    this._ctx.restore();
  }

  private _clearElementArea(el: Canvas2DElement): void {
    if (!this._ctx) return;
    const pos = el.getPosition();
    const size = el.getSize();
    this._ctx.save();
    this._ctx.setTransform(this._scale, 0, 0, this._scale, this._panX, this._panY);
    this._ctx.clearRect(pos.x - 1, pos.y - 1, size.width + 2, size.height + 2);
    this._ctx.restore();
  }

  private _getVisibleElements(all: Canvas2DElement[]): Canvas2DElement[] {
    if (!this._viewport) return all;

    const bufX = this._viewport.width * this._cullingBufferRatio;
    const bufY = this._viewport.height * this._cullingBufferRatio;
    const vp = {
      x: this._viewport.x - bufX,
      y: this._viewport.y - bufY,
      width: this._viewport.width + bufX * 2,
      height: this._viewport.height + bufY * 2,
    };

    return all.filter((el) => {
      try {
        const pos = el.getPosition();
        const size = el.getSize();
        return (
          pos.x + size.width > vp.x &&
          pos.x < vp.x + vp.width &&
          pos.y + size.height > vp.y &&
          pos.y < vp.y + vp.height
        );
      } catch {
        return true;
      }
    });
  }
}