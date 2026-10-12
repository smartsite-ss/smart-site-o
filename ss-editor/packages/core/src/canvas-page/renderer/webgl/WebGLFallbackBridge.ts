// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { GPUFeature } from '../types';
import { IGraphic } from '@scada-editor/plugin-sdk';
import { CanvasRenderer } from '../CanvasRenderer';
import { WebGLContextManager } from './WebGLContextManager';

export class WebGLFallbackBridge {
  private canvasRenderer: CanvasRenderer | null = null;
  private container: HTMLElement;
  private width: number;
  private height: number;

  constructor(container: HTMLElement, width: number, height: number) {
    this.container = container;
    this.width = width;
    this.height = height;
  }

  isWebGLAvailable(): boolean {
    return WebGLContextManager.isWebGLAvailable();
  }

  supportsFeature(feature: GPUFeature): boolean {
    if (feature === 'shadow' || feature === 'clip-path') {
      return false;
    }
    return true;
  }

  renderWithFallback(graphic: IGraphic, _feature?: GPUFeature): void {
    try {
      const renderer = this.getCanvasRenderer();
      renderer.render(graphic);
    } catch {
      /* empty */
    }
  }

  getCanvasRenderer(): CanvasRenderer {
    if (!this.canvasRenderer) {
      this.canvasRenderer = new CanvasRenderer(this.container, {
        renderMode: 'canvas' as any,
        width: this.width,
        height: this.height,
      });
    }
    return this.canvasRenderer;
  }

  destroy(): void {
    try {
      if (this.canvasRenderer) {
        this.canvasRenderer.destroy();
        this.canvasRenderer = null;
      }
    } catch {
      /* empty */
    }
  }
}