// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IGraphic } from '@scada-editor/plugin-sdk';

export type RenderMode = 'canvas' | 'konva' | 'svg' | 'webgl';

export type GPUFeature = 'gradient' | 'shadow' | 'blur' | 'particle' | 'blend-mode' | 'clip-path' | 'pattern-fill';

export interface GPUInfo {
  renderer: string;
  vendor: string;
  version: string;
  shadingLanguageVersion: string;
  maxTextureSize: number;
  maxRenderbufferSize: number;
  supportedExtensions: string[];
  features: GPUFeature[];
}

export interface RenderStats {
  fps: number;
  drawCalls: number;
  graphicCount: number;
  visibleCount: number;
  cullingEnabled: boolean;
  cullingRatio: number;
  gpuMemoryEstimate: number;
  backend: RenderMode;
}

export interface WebGLRenderOptions {
  alpha?: boolean;
  antialias?: boolean;
  premultipliedAlpha?: boolean;
  preserveDrawingBuffer?: boolean;
  powerPreference?: 'default' | 'high-performance' | 'low-power';
  minBatchSize?: number;
  maxBatchSize?: number;
}

export interface RenderOptions {
  renderMode: RenderMode;
  canvas?: HTMLCanvasElement;
  container?: HTMLElement;
  width?: number;
  height?: number;
  webglOptions?: WebGLRenderOptions;
}

export interface RenderContext {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D | WebGLRenderingContext | WebGL2RenderingContext;
  width: number;
  height: number;
}

export interface ViewportRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ISpatialIndex {
  build(graphics: IGraphic[]): void;
  query(viewport: ViewportRect): IGraphic[];
  clear(): void;
}

export interface IRenderer {
  render(graphic: IGraphic): void;
  update(graphic: IGraphic): void;
  remove(graphicId: string): void;
  clear(): void;
  destroy(): void;
  resize(width: number, height: number): void;
  setScale(scale: number): void;
  /** 设置非均匀缩放（X/Y 轴独立缩放），用于 stretch 模式 */
  setScaleXY?(scaleX: number, scaleY: number): void;
  setPan(x: number, y: number): void;
  getContext(): RenderContext | null;

  setViewport(viewport: ViewportRect): void;
  getViewport(): ViewportRect | null;
  setViewportCulling(enabled: boolean): void;
  isViewportCullingEnabled(): boolean;
  setCullingBuffer(ratio: number): void;
}

export interface IRendererV2 extends IRenderer {
  getMode(): RenderMode;
  getStats(): RenderStats;
}

export interface RendererConstructor {
  new(container: HTMLElement, options?: RenderOptions): IRenderer;
}

export interface RenderManagerConfig {
  defaultMode: RenderMode;
  autoDetect: boolean;
  enableFallback: boolean;
  allowedModes: RenderMode[];
}

export interface GraphicAssignment {
  graphicId: string;
  assignedBackend: RenderMode;
  reason: string;
}

export interface SVGRenderOptions {
  staticLayerOnly: boolean;
  exportIncludeInlineImages: boolean;
}