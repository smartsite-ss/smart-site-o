// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import Konva from 'konva';
import { IRenderer, RenderContext, RenderOptions, ViewportRect } from './types';
import { IGraphic } from '@scada-editor/plugin-sdk';

/**
 * 图层类型枚举
 */
export enum KonvaLayerType {
  Background = 'background',
  Static = 'static',
  Dynamic = 'dynamic',
  Overlay = 'overlay',
}

/**
 * 多层 Konva 渲染器
 * 
 * 架构优势：
 * - Background 层：网格、背景（极少重绘）
 * - Static 层：静态图元（形状、标签、图片）（低频重绘）
 * - Dynamic 层：动态图元（图表、仪表、按钮）（高频重绘）
 * - Overlay 层：选择框、辅助线、控制点（实时重绘）
 * 
 * 性能优化：
 * - 使用 batchDraw() 批量渲染，减少重绘次数
 * - 使用 requestAnimationFrame 合并渲染请求
 * - 分层渲染，避免无关图元重绘
 */
export class KonvaRenderer implements IRenderer {
  private stage: Konva.Stage;
  
  /** 四层独立图层 */
  private layers: Record<KonvaLayerType, Konva.Layer>;
  
  /** 图元到图层的映射 */
  private graphicLayerMap: Map<string, KonvaLayerType> = new Map();
  
  /** 图元节点映射 */
  private nodes: Map<string, Konva.Node> = new Map();
  
  /** 渲染状态 */
  private scale: number = 1;
  private panX: number = 0;
  private panY: number = 0;
  
  /** 批量渲染控制 */
  private pendingRenders = new Set<string>();
  private animationFrameId: number | null = null;

  /** 性能统计 */
  private renderCount: number = 0;
  private batchCount: number = 0;
  
  constructor(container: HTMLElement, options?: RenderOptions) {
    this.stage = new Konva.Stage({
      container: container as HTMLDivElement,
      width: options?.width || container.clientWidth,
      height: options?.height || container.clientHeight,
    });
    
    this.layers = {
      background: new Konva.Layer({ name: KonvaLayerType.Background }),
      static: new Konva.Layer({ name: KonvaLayerType.Static }),
      dynamic: new Konva.Layer({ name: KonvaLayerType.Dynamic }),
      overlay: new Konva.Layer({ name: KonvaLayerType.Overlay }),
    };
    
    Object.values(this.layers).forEach(layer => {
      this.stage.add(layer);
    });
  }

  render(graphic: IGraphic): void {
    const layer = this.getLayerForGraphic(graphic);
    const node = this.createKonvaNode(graphic);
    
    if (node) {
      this.nodes.set(graphic.id, node);
      this.graphicLayerMap.set(graphic.id, this.getLayerTypeForGraphic(graphic));
      layer.add(node as any);
      this.scheduleBatchRender();
    }
  }

  update(graphic: IGraphic): void {
    const node = this.nodes.get(graphic.id);
    if (node) {
      this.updateKonvaNode(node, graphic);
      this.scheduleBatchRender();
    }
  }

  remove(graphicId: string): void {
    const node = this.nodes.get(graphicId);
    if (node) {
      node.destroy();
      this.nodes.delete(graphicId);
      this.graphicLayerMap.delete(graphicId);
      this.scheduleBatchRender();
    }
  }

  clear(): void {
    Object.values(this.layers).forEach(layer => {
      layer.destroyChildren();
    });
    this.nodes.clear();
    this.graphicLayerMap.clear();
    this.flushBatchRender();
  }

  destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.stage.destroy();
    this.nodes.clear();
    this.graphicLayerMap.clear();
  }

  resize(width: number, height: number): void {
    this.stage.width(width);
    this.stage.height(height);
    this.scheduleBatchRender();
  }

  setScale(scale: number): void {
    this.scale = scale;
    Object.values(this.layers).forEach(layer => {
      layer.scale({ x: scale, y: scale });
    });
    this.scheduleBatchRender();
  }

  setPan(x: number, y: number): void {
    this.panX = x;
    this.panY = y;
    Object.values(this.layers).forEach(layer => {
      layer.position({ x, y });
    });
    this.scheduleBatchRender();
  }

  getScale(): number {
    return this.scale;
  }

  getPan(): { x: number; y: number } {
    return { x: this.panX, y: this.panY };
  }

  getContext(): RenderContext | null {
    const canvas = this.stage.toCanvas();
    if (!canvas) return null;
    
    return {
      canvas,
      context: canvas.getContext('2d')!,
      width: this.stage.width(),
      height: this.stage.height(),
    };
  }

  /**
   * 获取图层实例
   */
  getLayer(type: KonvaLayerType): Konva.Layer {
    return this.layers[type];
  }

  /**
   * 获取所有图层
   */
  getAllLayers(): Konva.Layer[] {
    return Object.values(this.layers);
  }

  /**
   * 获取舞台实例
   */
  getStage(): Konva.Stage {
    return this.stage;
  }

  /**
   * 强制立即渲染指定图层
   */
  forceRenderLayer(type: KonvaLayerType): void {
    this.layers[type].batchDraw();
  }

  /**
   * 强制立即渲染所有图层
   */
  forceRenderAll(): void {
    Object.values(this.layers).forEach(layer => layer.batchDraw());
  }

  /**
   * 获取性能统计
   */
  getStats(): { renderCount: number; batchCount: number; nodeCount: number } {
    return {
      renderCount: this.renderCount,
      batchCount: this.batchCount,
      nodeCount: this.nodes.size,
    };
  }

  // ====== 视口裁剪实现 ======

  /** Konva 自身有 clipFunc 可用于视口裁剪 */
  private _viewport: ViewportRect | null = null;
  private _cullingEnabled = false;

  setViewport(viewport: ViewportRect): void {
    this._viewport = viewport;
    // Konva Stage 支持 clipFunc，但更高效的方式是控制各 Layer 的可见性
    // 这里记录视口信息，供外部查询使用
  }

  getViewport(): ViewportRect | null {
    return this._viewport ? { ...this._viewport } : null;
  }

  setViewportCulling(enabled: boolean): void {
    this._cullingEnabled = enabled;
  }

  isViewportCullingEnabled(): boolean {
    return this._cullingEnabled;
  }

  setCullingBuffer(_ratio: number): void {
    // Culling buffer will be used when viewport culling is fully implemented
  }

  /**
   * 批量渲染调度器
   * 使用 requestAnimationFrame 合并多个渲染请求
   */
  private scheduleBatchRender(): void {
    if (!this.animationFrameId) {
      this.animationFrameId = requestAnimationFrame(() => {
        this.batchRender();
        this.animationFrameId = null;
      });
    }
  }

  /**
   * 执行批量渲染
   * 只渲染有变化的图层，减少不必要的重绘
   */
  private batchRender(): void {
    this.batchCount++;
    
    /** 判断哪些图层需要重绘 */
    const needsBackgroundRender = this.pendingRenders.size === 0;
    const needsStaticRender = this.pendingRenders.size > 0;
    const needsDynamicRender = this.pendingRenders.size > 0;
    
    /** 分层渲染策略 */
    if (needsBackgroundRender) {
      this.layers.background.batchDraw();
    }
    
    if (needsStaticRender) {
      this.layers.static.batchDraw();
    }
    
    if (needsDynamicRender) {
      this.layers.dynamic.batchDraw();
    }
    
    /** Overlay 层始终需要渲染（选择框等） */
    this.layers.overlay.batchDraw();
    
    this.pendingRenders.clear();
    this.renderCount++;
  }

  /**
   * 刷新批量渲染队列
   */
  private flushBatchRender(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    Object.values(this.layers).forEach(layer => layer.draw());
    this.pendingRenders.clear();
  }

  /**
   * 根据图元类型确定所属图层
   */
  private getLayerTypeForGraphic(graphic: IGraphic): KonvaLayerType {
    const type = graphic.type;
    
    if (['grid', 'background', 'guide'].includes(type)) {
      return KonvaLayerType.Background;
    }
    
    if (['shape', 'label', 'image', 'textbox'].includes(type)) {
      return KonvaLayerType.Static;
    }
    
    if (['button', 'input', 'checkbox', 'chart', 'pump', 'valve', 'tank', 'gauge'].includes(type)) {
      return KonvaLayerType.Dynamic;
    }
    
    return KonvaLayerType.Dynamic;
  }

  /**
   * 获取图元对应的图层实例
   */
  private getLayerForGraphic(graphic: IGraphic): Konva.Layer {
    const layerType = this.getLayerTypeForGraphic(graphic);
    return this.layers[layerType];
  }

  private createKonvaNode(graphic: IGraphic): Konva.Node | null {
    const type = graphic.type;
    const geometry = graphic.config.geometry;
    const style = graphic.config.style;
    
    switch (type) {
      case 'button':
      case 'shape':
        return new Konva.Rect({
          id: graphic.id,
          x: geometry.x,
          y: geometry.y,
          width: geometry.width,
          height: geometry.height,
          fill: style.backgroundColor,
          stroke: style.borderColor,
          strokeWidth: style.borderWidth || 0,
          cornerRadius: style.borderRadius || 0,
          rotation: geometry.rotation || 0,
          scaleX: geometry.scaleX || 1,
          scaleY: geometry.scaleY || 1,
        });
        
      case 'label':
      case 'textbox':
        return new Konva.Text({
          id: graphic.id,
          x: geometry.x,
          y: geometry.y,
          width: geometry.width,
          height: geometry.height,
          text: graphic.config.customProps?.text || '',
          fontSize: style.fontSize || 14,
          fontFamily: style.fontFamily || 'Arial',
          fill: style.color || '#000',
          align: (style.textAlign as any) || 'left',
          rotation: geometry.rotation || 0,
          scaleX: geometry.scaleX || 1,
          scaleY: geometry.scaleY || 1,
        });
        
      case 'input':
        return new Konva.Rect({
          id: graphic.id,
          x: geometry.x,
          y: geometry.y,
          width: geometry.width,
          height: geometry.height,
          fill: style.backgroundColor || '#fff',
          stroke: style.borderColor || '#ccc',
          strokeWidth: style.borderWidth || 1,
          cornerRadius: style.borderRadius || 4,
          rotation: geometry.rotation || 0,
          scaleX: geometry.scaleX || 1,
          scaleY: geometry.scaleY || 1,
        });
        
      case 'checkbox':
        return new Konva.Group({ id: graphic.id });
        
      case 'image':
        return new Konva.Image({
          id: graphic.id,
          x: geometry.x,
          y: geometry.y,
          width: geometry.width,
          height: geometry.height,
          rotation: geometry.rotation || 0,
          scaleX: geometry.scaleX || 1,
          scaleY: geometry.scaleY || 1,
          image: document.createElement('img'),
        } as any);
        
      case 'chart':
        return new Konva.Rect({
          id: graphic.id,
          x: geometry.x,
          y: geometry.y,
          width: geometry.width,
          height: geometry.height,
          fill: style.backgroundColor || '#fff',
          stroke: style.borderColor,
          strokeWidth: style.borderWidth || 1,
          cornerRadius: style.borderRadius || 4,
          rotation: geometry.rotation || 0,
          scaleX: geometry.scaleX || 1,
          scaleY: geometry.scaleY || 1,
        });
        
      default:
        return new Konva.Group({ id: graphic.id });
    }
  }

  private updateKonvaNode(node: Konva.Node, graphic: IGraphic): void {
    const geometry = graphic.config.geometry;
    const style = graphic.config.style;
    
    if ((node as any).className === 'Rect') {
      (node as any).position({ x: geometry.x, y: geometry.y })
        .size({ width: geometry.width, height: geometry.height })
        .rotation(geometry.rotation || 0)
        .scale({ x: geometry.scaleX || 1, y: geometry.scaleY || 1 })
        .fill(style.backgroundColor)
        .stroke(style.borderColor)
        .strokeWidth(style.borderWidth || 0)
        .cornerRadius(style.borderRadius || 0);
    } else if ((node as any).className === 'Text') {
      (node as any).position({ x: geometry.x, y: geometry.y })
        .size({ width: geometry.width, height: geometry.height })
        .rotation(geometry.rotation || 0)
        .scale({ x: geometry.scaleX || 1, y: geometry.scaleY || 1 })
        .text(graphic.config.customProps?.text || '')
        .fontSize(style.fontSize || 14)
        .fontFamily(style.fontFamily || 'Arial')
        .fill(style.color || '#000')
        .align((style.textAlign as any) || 'left');
    } else if ((node as any).className === 'Image') {
      (node as any).position({ x: geometry.x, y: geometry.y })
        .size({ width: geometry.width, height: geometry.height })
        .rotation(geometry.rotation || 0)
        .scale({ x: geometry.scaleX || 1, y: geometry.scaleY || 1 });
    }
  }
}
