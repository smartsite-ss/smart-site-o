// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  IRenderer,
  IRendererV2,
  RenderContext,
  RenderMode,
  RenderOptions,
  RenderStats,
  ViewportRect,
  GPUFeature,
  GPUInfo,
  WebGLRenderOptions,
} from '../types';
import { IGraphic } from '@scada-editor/plugin-sdk';
import { WebGLContextManager } from './WebGLContextManager';
import { BatchRenderer } from './BatchRenderer';
import { WebGLFallbackBridge } from './WebGLFallbackBridge';
import { GridSpatialIndex } from './SpatialIndex';
import { WebGLShaderManager } from './WebGLShaderManager';
import { BatchProcessor } from './BatchProcessor';

const DEFAULT_WEBGL_OPTIONS: WebGLRenderOptions = {
  alpha: true,
  antialias: true,
  premultipliedAlpha: true,
  preserveDrawingBuffer: false,
  powerPreference: 'high-performance',
  minBatchSize: 8,
  maxBatchSize: 256,
};

export class WebGL2DBackend implements IRenderer, IRendererV2 {
  private contextManager: WebGLContextManager;
  private shaderManager: WebGLShaderManager;
  private batchRenderer: BatchRenderer;
  private batchProcessor: BatchProcessor;
  private fallbackBridge: WebGLFallbackBridge;
  private graphics: Map<string, IGraphic> = new Map();
  private scale: number = 1;
  private panX: number = 0;
  private panY: number = 0;
  private viewport: ViewportRect | null = null;
  private cullingEnabled = false;
  private cullingBuffer = 0.05;
  private animationFrameId: number | null = null;
  private dirtyGraphics = new Set<string>();
  private spatialIndex: GridSpatialIndex = new GridSpatialIndex(256);
  private spatialIndexDirty = false;
  private enabledFeatures: Set<GPUFeature> = new Set();
  private stats: RenderStats;
  private canvas: HTMLCanvasElement;
  private webglOptions: WebGLRenderOptions;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private drawCallsAccumulator: number = 0;

  constructor(container: HTMLElement, options?: RenderOptions & { webglOptions?: Partial<WebGLRenderOptions> }) {
    this.webglOptions = { ...DEFAULT_WEBGL_OPTIONS, ...options?.webglOptions };

    this.canvas = options?.canvas || document.createElement('canvas');
    this.canvas.width = options?.width || container.clientWidth;
    this.canvas.height = options?.height || container.clientHeight;

    if (!options?.canvas) {
      container.appendChild(this.canvas);
    }

    this.contextManager = new WebGLContextManager(this.canvas, {
      alpha: this.webglOptions.alpha,
      antialias: this.webglOptions.antialias,
      premultipliedAlpha: this.webglOptions.premultipliedAlpha,
      preserveDrawingBuffer: this.webglOptions.preserveDrawingBuffer,
      powerPreference: this.webglOptions.powerPreference as any,
    });

    const gl = this.contextManager.getContext();

    this.fallbackBridge = new WebGLFallbackBridge(
      container,
      this.canvas.width,
      this.canvas.height,
    );

    this.shaderManager = new WebGLShaderManager(gl!);
    this.batchRenderer = new BatchRenderer(gl!, this.shaderManager.pool, this.webglOptions.minBatchSize);
    this.batchProcessor = new BatchProcessor(gl!, this.shaderManager, this.fallbackBridge, this.canvas);

    this.stats = {
      fps: 0,
      drawCalls: 0,
      graphicCount: 0,
      visibleCount: 0,
      cullingEnabled: false,
      cullingRatio: 0,
      gpuMemoryEstimate: 0,
      backend: 'webgl',
    };

    this.startRenderLoop();
  }

  render(graphic: IGraphic): void {
    this.graphics.set(graphic.id, graphic);
    this.markDirty(graphic.id);
    this.spatialIndexDirty = true;
  }

  update(graphic: IGraphic): void {
    this.graphics.set(graphic.id, graphic);
    this.markDirty(graphic.id);
    this.spatialIndexDirty = true;
  }

  remove(graphicId: string): void {
    this.graphics.delete(graphicId);
    this.spatialIndexDirty = true;
  }

  clear(): void {
    try {
      const gl = this.contextManager.getContext();
      if (gl) {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
      }
    } catch {
      /* empty */
    }
    this.graphics.clear();
    this.dirtyGraphics.clear();
    this.spatialIndex.clear();
    this.spatialIndexDirty = false;
  }

  destroy(): void {
    try {
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
      this.batchRenderer.clear();
      this.shaderManager.clear();
      this.fallbackBridge.destroy();
      this.contextManager.destroy();
      if (this.canvas.parentElement) {
        this.canvas.parentElement.removeChild(this.canvas);
      }
    } catch {
      /* empty */
    }
  }

  resize(width: number, height: number): void {
    this.contextManager.resize(width, height);
    this.markAllDirty();
  }

  setScale(scale: number): void {
    this.scale = scale;
    this.markAllDirty();
  }

  setPan(x: number, y: number): void {
    this.panX = x;
    this.panY = y;
    this.markAllDirty();
  }

  getContext(): RenderContext | null {
    const gl = this.contextManager.getContext();
    if (!gl) return null;

    return {
      canvas: this.canvas,
      context: gl,
      width: this.canvas.width,
      height: this.canvas.height,
    };
  }

  setViewport(viewport: ViewportRect): void {
    this.viewport = viewport;
    this.spatialIndexDirty = true;
  }

  getViewport(): ViewportRect | null {
    return this.viewport ? { ...this.viewport } : null;
  }

  setViewportCulling(enabled: boolean): void {
    this.cullingEnabled = enabled;
    if (enabled) {
      this.spatialIndexDirty = true;
    }
  }

  isViewportCullingEnabled(): boolean {
    return this.cullingEnabled;
  }

  setCullingBuffer(ratio: number): void {
    this.cullingBuffer = Math.max(0, Math.min(1, ratio));
  }

  getMode(): RenderMode {
    return 'webgl';
  }

  getStats(): RenderStats {
    return { ...this.stats };
  }

  enableGPUFeature(feature: GPUFeature): void {
    if (this.contextManager.checkFeature(feature)) {
      this.enabledFeatures.add(feature);
    }
  }

  disableGPUFeature(feature: GPUFeature): void {
    this.enabledFeatures.delete(feature);
  }

  registerCustomShader(name: string, vs: string, fs: string): void {
    this.shaderManager.registerCustomShader(name, vs, fs);
  }

  getGPUInfo(): GPUInfo {
    return this.contextManager.getGPUInfo();
  }

  renderAll(): void {
    try {
      const gl = this.contextManager.getContext();
      if (!gl || this.contextManager.isContextLost()) {
        this.batchProcessor.renderAllWithFallback(this.graphics);
        return;
      }

      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      gl.clearColor(1.0, 1.0, 1.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

      const visibleGraphics = this.getVisibleGraphics();

      const sortedGraphics = [...visibleGraphics].sort(
        (a, b) => (a.getZIndex?.() || 0) - (b.getZIndex?.() || 0),
      );

      let drawCalls = 0;

      for (const graphic of sortedGraphics) {
        const shaderName = this.shaderManager.getShaderForGraphic(graphic);
        if (shaderName && this.shaderManager.getProgram(shaderName)) {
          this.batchProcessor.drawGraphic(graphic, shaderName, this.scale, this.panX, this.panY);
          drawCalls++;
        } else {
          this.fallbackBridge.renderWithFallback(graphic);
          drawCalls++;
        }
      }

      this.drawCallsAccumulator += drawCalls;
      this.updateFpsStats();

      this.stats = {
        ...this.stats,
        drawCalls,
        graphicCount: this.graphics.size,
        visibleCount: visibleGraphics.length,
        cullingEnabled: this.cullingEnabled,
        cullingRatio: this.cullingEnabled && this.graphics.size > 0
          ? (this.graphics.size - visibleGraphics.length) / this.graphics.size
          : 0,
        gpuMemoryEstimate: this.estimateGpuMemory(),
      };

      this.dirtyGraphics.clear();
    } catch {
      this.batchProcessor.renderAllWithFallback(this.graphics);
    }
  }

  private startRenderLoop(): void {
    this.lastFrameTime = performance.now();
    this.renderLoop();
  }

  private renderLoop(): void {
    if (this.dirtyGraphics.size > 0) {
      this.renderAll();
    } else {
      this.updateFpsStats();
    }
    this.animationFrameId = requestAnimationFrame(() => this.renderLoop());
  }

  private getVisibleGraphics(): IGraphic[] {
    if (!this.cullingEnabled || !this.viewport) {
      return Array.from(this.graphics.values());
    }

    if (this.spatialIndexDirty) {
      this.spatialIndex.build(Array.from(this.graphics.values()));
      this.spatialIndexDirty = false;
    }

    const bufferedVp = this.getBufferedViewport()!;
    return this.spatialIndex.query(bufferedVp);
  }

  private getBufferedViewport(): ViewportRect | null {
    if (!this.viewport) return null;

    const bufX = this.viewport.width * this.cullingBuffer;
    const bufY = this.viewport.height * this.cullingBuffer;

    return {
      x: this.viewport.x - bufX,
      y: this.viewport.y - bufY,
      width: this.viewport.width + bufX * 2,
      height: this.viewport.height + bufY * 2,
    };
  }

  private markDirty(graphicId: string): void {
    this.dirtyGraphics.add(graphicId);
  }

  private markAllDirty(): void {
    this.graphics.forEach((_, id) => this.dirtyGraphics.add(id));
  }

  private updateFpsStats(): void {
    this.frameCount++;
    const now = performance.now();
    const elapsed = now - this.lastFrameTime;

    if (elapsed >= 1000) {
      this.stats.fps = Math.round(this.frameCount / (elapsed / 1000));
      this.stats.drawCalls = this.drawCallsAccumulator;
      this.frameCount = 0;
      this.drawCallsAccumulator = 0;
      this.lastFrameTime = now;
    }
  }

  private estimateGpuMemory(): number {
    try {
      let estimate = 0;
      const gl = this.contextManager.getContext();
      if (!gl) return 0;

      estimate += this.canvas.width * this.canvas.height * 4;
      estimate += this.graphics.size * 1024;

      return estimate;
    } catch {
      return 0;
    }
  }
}