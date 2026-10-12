// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IGraphic, DrawContext } from '@scada-editor/plugin-sdk'
import {
  IRenderer,
  IRendererV2,
  RenderContext,
  RenderMode,
  RenderOptions,
  RenderStats,
  ViewportRect,
} from '../types'
import { performanceMonitor } from '../../../utils/core/PerformanceMonitor'

interface Canvas2DBackendOptions extends RenderOptions {
  onBackgroundRender?: (ctx: CanvasRenderingContext2D) => void
}

class GridSpatialIndex {
  private cellSize: number
  private grid: Map<string, Set<IGraphic>> = new Map()
  private graphicCells: Map<string, string[]> = new Map()

  constructor(cellSize: number = 256) {
    this.cellSize = cellSize
  }

  build(graphics: IGraphic[]): void {
    this.clear()
    for (const graphic of graphics) {
      this.insert(graphic)
    }
  }

  query(viewport: ViewportRect): IGraphic[] {
    const result: IGraphic[] = []
    const visited = new Set<string>()

    const minCx = Math.floor(viewport.x / this.cellSize)
    const minCy = Math.floor(viewport.y / this.cellSize)
    const maxCx = Math.floor((viewport.x + viewport.width) / this.cellSize)
    const maxCy = Math.floor((viewport.y + viewport.height) / this.cellSize)

    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const key = `${cx},${cy}`
        const cell = this.grid.get(key)
        if (cell) {
          for (const graphic of cell) {
            if (!visited.has(graphic.id)) {
              visited.add(graphic.id)
              if (this.intersectsViewport(graphic, viewport)) {
                result.push(graphic)
              }
            }
          }
        }
      }
    }
    return result
  }

  clear(): void {
    this.grid.clear()
    this.graphicCells.clear()
  }

  private insert(graphic: IGraphic): void {
    try {
      const pos = graphic.getPosition()
      const size = graphic.getSize()
      let bounds: { x: number; y: number; width: number; height: number }
      const rotation = graphic.getRotation?.() || 0
      if (rotation !== 0 && typeof (graphic as any).getBounds === 'function') {
        const b = (graphic as any).getBounds()
        bounds = { x: b.x, y: b.y, width: b.width, height: b.height }
      } else {
        bounds = { x: pos.x, y: pos.y, width: size.width, height: size.height }
      }

      const minCx = Math.floor(bounds.x / this.cellSize)
      const minCy = Math.floor(bounds.y / this.cellSize)
      const maxCx = Math.floor((bounds.x + bounds.width) / this.cellSize)
      const maxCy = Math.floor((bounds.y + bounds.height) / this.cellSize)

      const cells: string[] = []
      for (let cy = minCy; cy <= maxCy; cy++) {
        for (let cx = minCx; cx <= maxCx; cx++) {
          const key = `${cx},${cy}`
          let cell = this.grid.get(key)
          if (!cell) {
            cell = new Set()
            this.grid.set(key, cell)
          }
          cell.add(graphic)
          cells.push(key)
        }
      }
      this.graphicCells.set(graphic.id, cells)
    } catch {
      /* empty */
    }
  }

  private intersectsViewport(graphic: IGraphic, viewport: ViewportRect): boolean {
    try {
      const pos = graphic.getPosition()
      const size = graphic.getSize()
      return (
        pos.x + size.width > viewport.x &&
        pos.x < viewport.x + viewport.width &&
        pos.y + size.height > viewport.y &&
        pos.y < viewport.y + viewport.height
      )
    } catch {
      return true
    }
  }
}

export class Canvas2DBackend implements IRenderer, IRendererV2 {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private graphics: Map<string, IGraphic> = new Map()
  private dirtyGraphics: Set<string> = new Set()
  private scaleX: number = 1
  private scaleY: number = 1
  private panX: number = 0
  private panY: number = 0
  private animationFrameId: number | null = null
  private viewport: ViewportRect | null = null
  private cullingEnabled: boolean = false
  private cullingBufferRatio: number = 0.05
  private spatialIndex: GridSpatialIndex = new GridSpatialIndex(256)
  private spatialIndexDirty: boolean = false
  private lastFrameTime: number = 0
  private frameCount: number = 0
  private drawCallsAccumulator: number = 0
  private stats: RenderStats
  private onBackgroundRender?: (ctx: CanvasRenderingContext2D) => void

  constructor(container: HTMLElement, options?: Canvas2DBackendOptions) {
    this.canvas = options?.canvas || document.createElement('canvas')
    this.canvas.width = options?.width || container.clientWidth
    this.canvas.height = options?.height || container.clientHeight
    this.ctx = this.canvas.getContext('2d')!

    if (!options?.canvas) {
      container.appendChild(this.canvas)
    }

    this.onBackgroundRender = options?.onBackgroundRender

    this.stats = {
      fps: 0,
      drawCalls: 0,
      graphicCount: 0,
      visibleCount: 0,
      cullingEnabled: false,
      cullingRatio: 0,
      gpuMemoryEstimate: 0,
      backend: 'canvas',
    }

    this.startRenderLoop()
  }

  render(graphic: IGraphic): void {
    this.graphics.set(graphic.id, graphic)
    graphic.onMounted?.()
    this.markDirty(graphic.id)
    this.spatialIndexDirty = true
  }

  update(graphic: IGraphic): void {
    this.graphics.set(graphic.id, graphic)
    this.markDirty(graphic.id)
    this.spatialIndexDirty = true
  }

  remove(graphicId: string): void {
    const graphic = this.graphics.get(graphicId)
    graphic?.onUnmounted?.()
    this.graphics.delete(graphicId)
    this.markDirty(graphicId)
    this.spatialIndexDirty = true
  }

  clear(): void {
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    }
    this.graphics.clear()
    this.dirtyGraphics.clear()
    this.spatialIndex.clear()
    this.spatialIndexDirty = false
  }

  destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
    this.clear()
    if (this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas)
    }
  }

  resize(width: number, height: number): void {
    this.canvas.width = width
    this.canvas.height = height
    this.markAllDirty()
  }

  setScale(scale: number): void {
    this.scaleX = scale
    this.scaleY = scale
    this.markAllDirty()
  }

  setScaleXY(scaleX: number, scaleY: number): void {
    this.scaleX = scaleX
    this.scaleY = scaleY
    this.markAllDirty()
  }

  setPan(x: number, y: number): void {
    this.panX = x
    this.panY = y
    this.markAllDirty()
  }

  getGraphic(graphicId: string): IGraphic | undefined {
    return this.graphics.get(graphicId);
  }

  getContext(): RenderContext | null {
    return {
      canvas: this.canvas,
      context: this.ctx,
      width: this.canvas.width,
      height: this.canvas.height,
    }
  }

  setViewport(viewport: ViewportRect): void {
    this.viewport = viewport
    this.spatialIndexDirty = true
  }

  getViewport(): ViewportRect | null {
    return this.viewport ? { ...this.viewport } : null
  }

  setViewportCulling(enabled: boolean): void {
    this.cullingEnabled = enabled
    if (enabled) {
      this.spatialIndexDirty = true
    }
  }

  isViewportCullingEnabled(): boolean {
    return this.cullingEnabled
  }

  setCullingBuffer(ratio: number): void {
    this.cullingBufferRatio = Math.max(0, Math.min(1, ratio))
  }

  getMode(): RenderMode {
    return 'canvas'
  }

  getStats(): RenderStats {
    return { ...this.stats }
  }

  private startRenderLoop(): void {
    this.lastFrameTime = performance.now()
    this.renderLoop()
  }

  private renderLoop(): void {
    try {
      if (this.graphics.size > 0) {
        this.renderAll();
      } else if (this.onBackgroundRender) {
        const ctx = this.ctx;
        if (!ctx) return;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        try {
          this.onBackgroundRender(ctx);
        } catch (bgErr) {
          console.warn('[Canvas2DBackend] Background render error:', bgErr);
        }
      }
    } catch (e) {
      console.warn('[Canvas2DBackend] Render loop error, attempting recovery:', e);
    }
    this.animationFrameId = requestAnimationFrame(() => this.renderLoop());
  }

  renderAll(): void {
    const startTime = performance.now()

    if (this.cullingEnabled && this.viewport) {
      this.renderAllWithCulling()
    } else {
      this.renderAllFull()
    }

    // ★ 将渲染性能数据注入全局 PerformanceMonitor
    const renderTime = performance.now() - startTime
    performanceMonitor.recordRenderTime(renderTime)
    performanceMonitor.recordFullRender()
    performanceMonitor.recordGraphicCount(this.graphics.size)
    performanceMonitor.recordDrawCalls(this.drawCallsAccumulator)

    this.updateStats()
    this.dirtyGraphics.clear()
  }

  private renderAllFull(): void {
    const ctx = this.ctx
    if (!ctx) return

    const cw = this.canvas.width;
    const ch = this.canvas.height;
    if (cw <= 0 || ch <= 0) {
      console.warn('[Canvas2DBackend] renderAllFull: invalid canvas size', cw, ch);
      return;
    }

    ctx.clearRect(0, 0, cw, ch)

    try {
      this.onBackgroundRender?.(ctx)
    } catch (bgErr) {
      console.warn('[Canvas2DBackend] Background render error:', bgErr);
    }

    ctx.save()
    ctx.translate(this.panX, this.panY)
    ctx.scale(this.scaleX, this.scaleY)

    const sorted = Array.from(this.graphics.values()).sort(
      (a, b) => (a.getZIndex?.() || 0) - (b.getZIndex?.() || 0)
    )

    for (const graphic of sorted) {
      if (graphic.getVisible?.() === false) {
        continue;
      }
      ctx.save()
      try {
        this.drawGraphic(ctx, graphic)
      } catch (e) {
        console.warn(
          `[Canvas2DBackend] Error rendering graphic type="${graphic?.type}" id="${graphic?.id}":`,
          e,
        )
      }
      ctx.restore()
    }

    ctx.restore()
  }

  private renderAllWithCulling(): void {
    const ctx = this.ctx
    if (!ctx) {
      return
    }
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    try {
      this.onBackgroundRender?.(ctx);
    } catch (bgErr) {
      console.warn('[Canvas2DBackend] renderAllWithCulling background render error:', bgErr);
    }

    if (this.spatialIndexDirty) {
      this.spatialIndex.build(Array.from(this.graphics.values()))
      this.spatialIndexDirty = false
    }

    const bufferedVp = this.getBufferedViewport()!
    const visibleGraphics = this.spatialIndex.query(bufferedVp)

    const sorted = visibleGraphics.sort(
      (a, b) => (a.getZIndex?.() || 0) - (b.getZIndex?.() || 0)
    )

    ctx.save()
    ctx.translate(this.panX, this.panY)
    ctx.scale(this.scaleX, this.scaleY)

    for (const graphic of sorted) {
      if (graphic.getVisible?.() === false) continue
      ctx.save()
      try {
        this.drawGraphic(ctx, graphic)
      } catch (e) {
        console.warn(
          `[Canvas2DBackend] Error rendering graphic type="${graphic?.type}" id="${graphic?.id}":`,
          e,
        )
      }
      ctx.restore()
    }

    ctx.restore()
  }

  private drawGraphic(ctx: CanvasRenderingContext2D, graphic: IGraphic): void {
    if (typeof graphic.draw === 'function') {
      graphic.draw(ctx)
    } else if (typeof (graphic as any).render === 'function') {
      // 兼容仅实现 render(dc) 的图元（如 BasePlugin 子类）
      const pos = graphic.getPosition()
      const size = graphic.getSize()
      const dc = new DrawContext(ctx, { x: pos.x, y: pos.y, width: size.width, height: size.height }, false)
      ;(graphic as any).render(dc)
    } else {
      return
    }
    this.drawCallsAccumulator++
  }

  private getBufferedViewport(): ViewportRect | null {
    if (!this.viewport) return null
    const bufX = this.viewport.width * this.cullingBufferRatio
    const bufY = this.viewport.height * this.cullingBufferRatio
    return {
      x: this.viewport.x - bufX,
      y: this.viewport.y - bufY,
      width: this.viewport.width + bufX * 2,
      height: this.viewport.height + bufY * 2,
    }
  }

  private markDirty(graphicId: string): void {
    this.dirtyGraphics.add(graphicId)
  }

  private markAllDirty(): void {
    this.graphics.forEach((_, id) => this.dirtyGraphics.add(id))
  }

  private updateStats(): void {
    this.frameCount++
    const now = performance.now()
    const elapsed = now - this.lastFrameTime

    if (elapsed >= 1000) {
      this.stats.fps = Math.round(this.frameCount / (elapsed / 1000))
      this.stats.drawCalls = this.drawCallsAccumulator
      this.stats.graphicCount = this.graphics.size
      this.stats.visibleCount = this.graphics.size
      this.stats.cullingEnabled = this.cullingEnabled
      this.stats.cullingRatio = 0
      this.stats.gpuMemoryEstimate = this.canvas.width * this.canvas.height * 4 + this.graphics.size * 1024
      this.stats.backend = 'canvas'

      // ★ 同步注入全局 PerformanceMonitor（FPS 每秒只需记录一次）
      performanceMonitor.recordFps(this.stats.fps)

      this.frameCount = 0
      this.drawCallsAccumulator = 0
      this.lastFrameTime = now
    }
  }
}