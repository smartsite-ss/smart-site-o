// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IRenderer, RenderContext, RenderOptions, ViewportRect } from './types';
import { IGraphic } from '@scada-editor/plugin-sdk';

/**
 * 简单网格空间索引，用于加速视口可见性查询
 * 将画布划分为固定大小的网格单元格，每个图元根据其边界框归属到对应单元格
 * 查询时仅检查与视口相交的单元格中的图元
 */
class GridSpatialIndex {
  private cellSize: number;
  private grid: Map<string, Set<IGraphic>> = new Map();
  private graphicCells: Map<string, string[]> = new Map(); // 图元ID → 所属网格key列表

  constructor(cellSize: number = 256) {
    this.cellSize = cellSize;
  }

  build(graphics: IGraphic[]): void {
    this.clear();
    for (const graphic of graphics) {
      this.insert(graphic);
    }
  }

  query(viewport: ViewportRect): IGraphic[] {
    const result: IGraphic[] = [];
    const visited = new Set<string>();

    // 计算视口覆盖的网格范围
    const minCx = Math.floor(viewport.x / this.cellSize);
    const minCy = Math.floor(viewport.y / this.cellSize);
    const maxCx = Math.floor((viewport.x + viewport.width) / this.cellSize);
    const maxCy = Math.floor((viewport.y + viewport.height) / this.cellSize);

    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const key = `${cx},${cy}`;
        const cell = this.grid.get(key);
        if (cell) {
          for (const graphic of cell) {
            if (!visited.has(graphic.id)) {
              visited.add(graphic.id);
              // 二次精确检测（AABB 相交）
              if (this.intersectsViewport(graphic, viewport)) {
                result.push(graphic);
              }
            }
          }
        }
      }
    }

    return result;
  }

  clear(): void {
    this.grid.clear();
    this.graphicCells.clear();
  }

  private insert(graphic: IGraphic): void {
    try {
      const pos = graphic.getPosition();
      const size = graphic.getSize();
      // 获取图元的实际渲染边界（考虑旋转）
      let bounds: { x: number; y: number; width: number; height: number };
      const rotation = graphic.getRotation?.() || 0;
      if (rotation !== 0 && typeof (graphic as any).getBounds === 'function') {
        const b = (graphic as any).getBounds();
        bounds = { x: b.x, y: b.y, width: b.width, height: b.height };
      } else {
        bounds = { x: pos.x, y: pos.y, width: size.width, height: size.height };
      }

      const minCx = Math.floor(bounds.x / this.cellSize);
      const minCy = Math.floor(bounds.y / this.cellSize);
      const maxCx = Math.floor((bounds.x + bounds.width) / this.cellSize);
      const maxCy = Math.floor((bounds.y + bounds.height) / this.cellSize);

      const cells: string[] = [];
      for (let cy = minCy; cy <= maxCy; cy++) {
        for (let cx = minCx; cx <= maxCx; cx++) {
          const key = `${cx},${cy}`;
          let cell = this.grid.get(key);
          if (!cell) {
            cell = new Set();
            this.grid.set(key, cell);
          }
          cell.add(graphic);
          cells.push(key);
        }
      }
      this.graphicCells.set(graphic.id, cells);
    } catch {
      // 图元可能尚未完全初始化，跳过
    }
  }

  private intersectsViewport(graphic: IGraphic, viewport: ViewportRect): boolean {
    try {
      const pos = graphic.getPosition();
      const size = graphic.getSize();
      return (
        pos.x + size.width > viewport.x &&
        pos.x < viewport.x + viewport.width &&
        pos.y + size.height > viewport.y &&
        pos.y < viewport.y + viewport.height
      );
    } catch {
      return true; // 无法判断时默认可见
    }
  }
}

export class CanvasRenderer implements IRenderer {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private graphics: Map<string, IGraphic> = new Map();
  private scale: number = 1;
  private panX: number = 0;
  private panY: number = 0;
  private animationFrameId: number | null = null;
  private dirtyGraphics = new Set<string>();

  // ====== 视口裁剪相关 ======
  private viewport: ViewportRect | null = null;
  private cullingEnabled = false;
  private cullingBufferRatio = 0.05; // 默认5%缓冲区
  private spatialIndex: GridSpatialIndex = new GridSpatialIndex(256);
  private spatialIndexDirty = false;

  constructor(container: HTMLElement, options?: RenderOptions) {
    this.canvas = options?.canvas || document.createElement('canvas');
    this.canvas.width = options?.width || container.clientWidth;
    this.canvas.height = options?.height || container.clientHeight;
    this.context = this.canvas.getContext('2d')!;
    
    if (!options?.canvas) {
      container.appendChild(this.canvas);
    }
    
    this.startRenderLoop();
  }

  private startRenderLoop(): void {
    this.renderLoop();
  }

  private renderLoop(): void {
    if (this.dirtyGraphics.size > 0) {
      this.renderDirtyGraphics();
    }
    this.animationFrameId = requestAnimationFrame(() => this.renderLoop());
  }

  private renderDirtyGraphics(): void {
    const dirtyIds = Array.from(this.dirtyGraphics);
    
    dirtyIds.forEach(id => {
      const graphic = this.graphics.get(id);
      if (graphic) {
        this.clearGraphicArea(graphic);
        this.drawGraphic(graphic);
      }
    });
    
    this.dirtyGraphics.clear();
  }

  private clearGraphicArea(graphic: IGraphic): void {
    const { x, y } = graphic.getPosition();
    const { width, height } = graphic.getSize();
    
    this.context.save();
    this.context.setTransform(this.scale, 0, 0, this.scale, this.panX, this.panY);
    this.context.clearRect(x, y, width, height);
    this.context.restore();
  }

  private drawGraphic(graphic: IGraphic): void {
    if (!graphic.getVisible()) return;
    
    this.context.save();
    this.context.setTransform(this.scale, 0, 0, this.scale, this.panX, this.panY);
    
    const rotation = graphic.getRotation?.() || 0;
    if (rotation !== 0) {
      const { x, y } = graphic.getPosition();
      const { width, height } = graphic.getSize();
      const centerX = x + width / 2;
      const centerY = y + height / 2;
      this.context.translate(centerX, centerY);
      this.context.rotate((rotation * Math.PI) / 180);
      this.context.translate(-centerX, -centerY);
    }
    
    graphic.draw(this.context);
    this.context.restore();
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
    const graphic = this.graphics.get(graphicId);
    if (graphic) {
      this.clearGraphicArea(graphic);
      this.graphics.delete(graphicId);
      this.spatialIndexDirty = true;
    }
  }

  clear(): void {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.graphics.clear();
    this.dirtyGraphics.clear();
    this.spatialIndex.clear();
    this.spatialIndexDirty = false;
  }

  destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.clear();
    if (this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
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

  getContext(): RenderContext {
    return {
      canvas: this.canvas,
      context: this.context,
      width: this.canvas.width,
      height: this.canvas.height,
    };
  }

  // ====== 视口裁剪实现 ======

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
    this.cullingBufferRatio = Math.max(0, Math.min(1, ratio));
  }

  /**
   * 获取带缓冲区的视口矩形（扩大检测范围防止边缘闪烁）
   */
  private getBufferedViewport(): ViewportRect | null {
    if (!this.viewport) return null;

    const bufX = this.viewport.width * this.cullingBufferRatio;
    const bufY = this.viewport.height * this.cullingBufferRatio;

    return {
      x: this.viewport.x - bufX,
      y: this.viewport.y - bufY,
      width: this.viewport.width + bufX * 2,
      height: this.viewport.height + bufY * 2,
    };
  }

  /**
   * 获取当前视口内的可见图元列表
   * 当视口裁剪启用时返回裁剪结果，否则返回全部图元
   */
  getVisibleGraphics(): IGraphic[] {
    if (!this.cullingEnabled || !this.viewport) {
      return Array.from(this.graphics.values());
    }

    // 空间索引脏时重建
    if (this.spatialIndexDirty) {
      this.spatialIndex.build(Array.from(this.graphics.values()));
      this.spatialIndexDirty = false;
    }

    const bufferedVp = this.getBufferedViewport()!;
    return this.spatialIndex.query(bufferedVp);
  }

  /**
   * 带视口裁剪的全量渲染
   * 仅绘制视口内的可见图元，大幅减少 draw调用次数
   */
  renderAllWithCulling(): void {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const visibleGraphics = this.getVisibleGraphics();

    // 按 zIndex 排序
    visibleGraphics.sort(
      (a, b) => (a.getZIndex?.() || 0) - (b.getZIndex?.() || 0)
    );

    for (const graphic of visibleGraphics) {
      this.drawGraphic(graphic);
    }
  }

  private markDirty(graphicId: string): void {
    this.dirtyGraphics.add(graphicId);
  }

  private markAllDirty(): void {
    this.graphics.forEach((_, id) => this.dirtyGraphics.add(id));
  }

  renderAll(): void {
    if (this.cullingEnabled && this.viewport) {
      this.renderAllWithCulling();
      return;
    }

    // 原始全量渲染逻辑（向后兼容）
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    const sortedGraphics = Array.from(this.graphics.values()).sort(
      (a, b) => (a.getZIndex?.() || 0) - (b.getZIndex?.() || 0)
    );
    
    sortedGraphics.forEach(graphic => this.drawGraphic(graphic));
  }

  /**
   * 获取性能统计信息（用于调试和基准测试）
   */
  getCullingStats(): { totalGraphics: number; visibleGraphics: number; cullingRatio: number } | null {
    if (!this.cullingEnabled || !this.viewport) return null;
    const total = this.graphics.size;
    const visible = this.getVisibleGraphics().length;
    return {
      totalGraphics: total,
      visibleGraphics: visible,
      cullingRatio: total > 0 ? ((total - visible) / total) : 0,
    };
  }
}