// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IGraphic } from '@scada-editor/plugin-sdk';

// ==================== 类型定义 ====================

export interface GuideLine {
  id: string;
  position: number;
  direction: 'horizontal' | 'vertical';
  color?: string;
}

export interface AlignTarget {
  type: 'left' | 'right' | 'top' | 'bottom' | 'centerX' | 'centerY';
  value: number;
  referenceGraphicId?: string;
  referenceLineId?: string;
}

export type AlignType = 'left' | 'right' | 'top' | 'bottom' | 'centerX' | 'centerY';

/**
 * 智能对齐管理器
 * 处理实时对齐检测、参考线管理、等分布局
 */
export class SmartAlignManager {
  private guideLines: GuideLine[] = [];
  private alignDistance: number = 8; // 默认对齐距离

  /**
   * 设置对齐距离
   */
  setAlignDistance(distance: number): void {
    this.alignDistance = distance;
  }

  /**
   * 检测对齐目标（拖拽时实时调用）
   * @param draggingGraphic - 正在拖拽的图形
   * @param otherGraphics - 其他可参考的图形
   */
  detectAlignTargets(
    draggingGraphic: IGraphic,
    otherGraphics: IGraphic[]
  ): AlignTarget[] {
    const targets: AlignTarget[] = [];
    const draggingGeo = this.getSafeGeometry(draggingGraphic);
    if (!draggingGeo) return targets;

    const { x, y, width, height } = draggingGeo;
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    // 1. 检测其他图形对齐
    for (const graphic of otherGraphics) {
      if (graphic.id === draggingGraphic.id) continue;

      const otherGeo = this.getSafeGeometry(graphic);
      if (!otherGeo) continue;

      const { x: ox, y: oy, width: ow, height: oh } = otherGeo;
      const otherCenterX = ox + ow / 2;
      const otherCenterY = oy + oh / 2;

      // 左对齐
      if (Math.abs(x - ox) <= this.alignDistance) {
        targets.push({ type: 'left', value: ox, referenceGraphicId: graphic.id });
      }
      // 右对齐
      if (Math.abs(x + width - (ox + ow)) <= this.alignDistance) {
        targets.push({ type: 'right', value: ox + ow, referenceGraphicId: graphic.id });
      }
      // 上对齐
      if (Math.abs(y - oy) <= this.alignDistance) {
        targets.push({ type: 'top', value: oy, referenceGraphicId: graphic.id });
      }
      // 下对齐
      if (Math.abs(y + height - (oy + oh)) <= this.alignDistance) {
        targets.push({ type: 'bottom', value: oy + oh, referenceGraphicId: graphic.id });
      }
      // 水平居中对齐
      if (Math.abs(centerX - otherCenterX) <= this.alignDistance) {
        targets.push({ type: 'centerX', value: otherCenterX, referenceGraphicId: graphic.id });
      }
      // 垂直居中对齐
      if (Math.abs(centerY - otherCenterY) <= this.alignDistance) {
        targets.push({ type: 'centerY', value: otherCenterY, referenceGraphicId: graphic.id });
      }
    }

    // 2. 检测参考线对齐
    for (const line of this.guideLines) {
      if (line.direction === 'vertical') {
        if (Math.abs(x - line.position) <= this.alignDistance) {
          targets.push({ type: 'left', value: line.position, referenceLineId: line.id });
        }
        if (Math.abs(x + width - line.position) <= this.alignDistance) {
          targets.push({ type: 'right', value: line.position, referenceLineId: line.id });
        }
        if (Math.abs(centerX - line.position) <= this.alignDistance) {
          targets.push({ type: 'centerX', value: line.position, referenceLineId: line.id });
        }
      } else {
        if (Math.abs(y - line.position) <= this.alignDistance) {
          targets.push({ type: 'top', value: line.position, referenceLineId: line.id });
        }
        if (Math.abs(y + height - line.position) <= this.alignDistance) {
          targets.push({ type: 'bottom', value: line.position, referenceLineId: line.id });
        }
        if (Math.abs(centerY - line.position) <= this.alignDistance) {
          targets.push({ type: 'centerY', value: line.position, referenceLineId: line.id });
        }
      }
    }

    return targets;
  }

  /**
   * 应用对齐
   * @param graphic - 要对齐的图形
   * @param target - 对齐目标
   */
  applyAlignment(graphic: IGraphic, target: AlignTarget): void {
    const geometry = this.getSafeGeometry(graphic);
    if (!geometry) return;

    const { type, value } = target;
    const { width, height } = geometry;
    const currentPos = graphic.getPosition();

    switch (type) {
      case 'left':
        graphic.setPosition(value, currentPos.y);
        break;
      case 'right':
        graphic.setPosition(value - width, currentPos.y);
        break;
      case 'top':
        graphic.setPosition(currentPos.x, value);
        break;
      case 'bottom':
        graphic.setPosition(currentPos.x, value - height);
        break;
      case 'centerX':
        graphic.setPosition(value - width / 2, currentPos.y);
        break;
      case 'centerY':
        graphic.setPosition(currentPos.x, value - height / 2);
        break;
    }
  }

  // ==================== 参考线管理 ====================

  /**
   * 添加参考线
   */
  addGuideLine(position: number, direction: 'horizontal' | 'vertical'): string {
    const id = `guide-${Date.now()}-${Math.random()}`;
    this.guideLines.push({ id, position, direction });
    return id;
  }

  /**
   * 移除参考线
   */
  removeGuideLine(id: string): void {
    this.guideLines = this.guideLines.filter(line => line.id !== id);
  }

  /**
   * 移除所有参考线
   */
  clearAllGuideLines(): void {
    this.guideLines = [];
  }

  /**
   * 获取所有参考线
   */
  getAllGuideLines(): GuideLine[] {
    return [...this.guideLines];
  }

  /**
   * 更新参考线位置
   */
  updateGuideLinePosition(id: string, position: number): void {
    const line = this.guideLines.find(l => l.id === id);
    if (line) {
      line.position = position;
    }
  }

  /**
   * 获取参考线
   */
  getGuideLine(id: string): GuideLine | null {
    return this.guideLines.find(l => l.id === id) || null;
  }

  /**
   * 序列化为JSON
   */
  toJSON(): GuideLine[] {
    return [...this.guideLines];
  }

  /**
   * 从JSON反序列化
   */
  fromJSON(data: GuideLine[]): void {
    this.guideLines = data ? [...data] : [];
  }

  // ==================== 增强对齐功能 ====================

  /**
   * 等宽等高对齐
   */
  makeSameSize(graphics: IGraphic[]): void {
    if (graphics.length < 2) return;

    // 计算最大宽高
    let maxWidth = 0;
    let maxHeight = 0;
    for (const graphic of graphics) {
      const geo = this.getSafeGeometry(graphic);
      if (!geo) continue;
      maxWidth = Math.max(maxWidth, geo.width);
      maxHeight = Math.max(maxHeight, geo.height);
    }

    // 统一应用
    for (const graphic of graphics) {
      graphic.setSize(maxWidth, maxHeight);
    }
  }

  /**
   * 等宽对齐
   */
  makeSameWidth(graphics: IGraphic[]): void {
    if (graphics.length < 2) return;

    let maxWidth = 0;
    for (const graphic of graphics) {
      const geo = this.getSafeGeometry(graphic);
      if (!geo) continue;
      maxWidth = Math.max(maxWidth, geo.width);
    }

    for (const graphic of graphics) {
      const currentSize = graphic.getSize();
      graphic.setSize(maxWidth, currentSize.height);
    }
  }

  /**
   * 等高对齐
   */
  makeSameHeight(graphics: IGraphic[]): void {
    if (graphics.length < 2) return;

    let maxHeight = 0;
    for (const graphic of graphics) {
      const geo = this.getSafeGeometry(graphic);
      if (!geo) continue;
      maxHeight = Math.max(maxHeight, geo.height);
    }

    for (const graphic of graphics) {
      const currentSize = graphic.getSize();
      graphic.setSize(currentSize.width, maxHeight);
    }
  }

  /**
   * 对齐到页面边缘
   */
  alignToPageEdge(
    graphics: IGraphic[],
    type: 'left' | 'right' | 'top' | 'bottom',
    pageWidth: number,
    pageHeight: number,
    margin: number = 0
  ): void {
    for (const graphic of graphics) {
      const currentPos = graphic.getPosition();
      const currentSize = graphic.getSize();

      switch (type) {
        case 'left':
          graphic.setPosition(margin, currentPos.y);
          break;
        case 'right':
          graphic.setPosition(pageWidth - currentSize.width - margin, currentPos.y);
          break;
        case 'top':
          graphic.setPosition(currentPos.x, margin);
          break;
        case 'bottom':
          graphic.setPosition(currentPos.x, pageHeight - currentSize.height - margin);
          break;
      }
    }
  }

  /**
   * 图形居中（相对于页面）
   */
  centerOnPage(
    graphics: IGraphic[],
    pageWidth: number,
    pageHeight: number,
    direction: 'horizontal' | 'vertical' | 'both' = 'both'
  ): void {
    if (graphics.length === 0) return;

    for (const graphic of graphics) {
      const currentPos = graphic.getPosition();
      const currentSize = graphic.getSize();

      let newX = currentPos.x;
      let newY = currentPos.y;

      if (direction === 'horizontal' || direction === 'both') {
        newX = (pageWidth - currentSize.width) / 2;
      }
      if (direction === 'vertical' || direction === 'both') {
        newY = (pageHeight - currentSize.height) / 2;
      }

      graphic.setPosition(newX, newY);
    }
  }

  // ==================== 内部辅助方法 ====================

  private getSafeGeometry(graphic: IGraphic): any {
    if (!graphic || !graphic.config) {
      return null;
    }
    if (!graphic.config.geometry) {
      graphic.config.geometry = {
        x: 0, y: 0, width: 0, height: 0, rotation: 0, scale: 1
      };
    }
    return graphic.config.geometry;
  }
}
