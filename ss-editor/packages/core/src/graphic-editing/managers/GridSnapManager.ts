// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IGraphic } from '@scada-editor/plugin-sdk';

// ==================== 类型定义 ====================

export interface GridSnapConfig {
  enabled: boolean;
  gridSize: number;
  snapDistance: number;
  snapToGrid: boolean;
  snapToGraphics: boolean;
  showGridLines: boolean;
}

export interface SnapTarget {
  type: 'grid' | 'edge' | 'center';
  position: 'left' | 'right' | 'top' | 'bottom' | 'centerX' | 'centerY';
  value: number;
  graphicId?: string;
}

export interface SnapResult {
  x: number;
  y: number;
  targets: SnapTarget[];
}

// 默认配置
export const DEFAULT_GRID_SNAP_CONFIG: GridSnapConfig = {
  enabled: true,
  gridSize: 20,
  snapDistance: 8,
  snapToGrid: true,
  snapToGraphics: true,
  showGridLines: true
};

/**
 * 网格吸附管理器
 * 处理网格对齐、图形边缘对齐、智能吸附功能
 */
export class GridSnapManager {
  private config: GridSnapConfig = { ...DEFAULT_GRID_SNAP_CONFIG };

  /**
   * 更新配置
   */
  setConfig(config: Partial<GridSnapConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取当前配置
   */
  getConfig(): GridSnapConfig {
    return { ...this.config };
  }

  /**
   * 吸附位置计算
   * @param x - 当前 X 坐标
   * @param y - 当前 Y 坐标
   * @param referenceGraphics - 参考图形（用于吸附到其他图形）
   */
  snapPosition(
    x: number,
    y: number,
    referenceGraphics: IGraphic[] = []
  ): SnapResult {
    let snappedX = x;
    let snappedY = y;
    const targets: SnapTarget[] = [];

    // 启用时才进行吸附
    if (this.config.enabled) {
      // 1. 吸附到网格
      if (this.config.snapToGrid) {
        const gridResult = this.snapToGrid(x, y);
        if (gridResult.targets.length > 0) {
          snappedX = gridResult.x;
          snappedY = gridResult.y;
          targets.push(...gridResult.targets);
        }
      }

      // 2. 吸附到其他图形
      if (this.config.snapToGraphics && referenceGraphics.length > 0) {
        const graphicsResult = this.snapToGraphics(snappedX, snappedY, referenceGraphics);
        if (graphicsResult.targets.length > 0) {
          snappedX = graphicsResult.x;
          snappedY = graphicsResult.y;
          targets.push(...graphicsResult.targets);
        }
      }
    }

    return {
      x: snappedX,
      y: snappedY,
      targets: targets
    };
  }

  /**
   * 获取网格线位置
   * @param bounds - 视口边界
   */
  getGridLines(bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  }): { vertical: number[]; horizontal: number[] } {
    const vertical: number[] = [];
    const horizontal: number[] = [];

    const { gridSize } = this.config;
    const startX = Math.floor(bounds.x / gridSize) * gridSize;
    const startY = Math.floor(bounds.y / gridSize) * gridSize;
    const endX = bounds.x + bounds.width;
    const endY = bounds.y + bounds.height;

    for (let x = startX; x <= endX; x += gridSize) {
      vertical.push(x);
    }

    for (let y = startY; y <= endY; y += gridSize) {
      horizontal.push(y);
    }

    return { vertical, horizontal };
  }

  /**
   * 检测吸附目标
   */
  detectSnapTargets(
    x: number,
    y: number,
    referenceGraphics: IGraphic[] = []
  ): SnapTarget[] {
    const targets: SnapTarget[] = [];

    // 1. 网格吸附目标
    if (this.config.snapToGrid) {
      const gridTargets = this.getGridSnapTargets(x, y);
      targets.push(...gridTargets);
    }

    // 2. 图形吸附目标
    if (this.config.snapToGraphics) {
      const graphicTargets = this.getGraphicSnapTargets(x, y, referenceGraphics);
      targets.push(...graphicTargets);
    }

    return targets;
  }

  // ==================== 内部辅助方法 ====================

  /**
   * 吸附到网格
   */
  private snapToGrid(x: number, y: number): SnapResult {
    const { gridSize, snapDistance } = this.config;
    let snappedX = x;
    let snappedY = y;
    const targets: SnapTarget[] = [];

    const gridX = Math.round(x / gridSize) * gridSize;
    const gridY = Math.round(y / gridSize) * gridSize;

    if (Math.abs(x - gridX) <= snapDistance) {
      snappedX = gridX;
      targets.push({
        type: 'grid',
        position: 'centerX',
        value: gridX
      });
    }

    if (Math.abs(y - gridY) <= snapDistance) {
      snappedY = gridY;
      targets.push({
        type: 'grid',
        position: 'centerY',
        value: gridY
      });
    }

    return { x: snappedX, y: snappedY, targets };
  }

  /**
   * 获取网格吸附目标
   */
  private getGridSnapTargets(x: number, y: number): SnapTarget[] {
    const { gridSize, snapDistance } = this.config;
    const targets: SnapTarget[] = [];

    const gridX = Math.round(x / gridSize) * gridSize;
    const gridY = Math.round(y / gridSize) * gridSize;

    if (Math.abs(x - gridX) <= snapDistance) {
      targets.push({
        type: 'grid',
        position: 'centerX',
        value: gridX
      });
    }

    if (Math.abs(y - gridY) <= snapDistance) {
      targets.push({
        type: 'grid',
        position: 'centerY',
        value: gridY
      });
    }

    return targets;
  }

  /**
   * 吸附到其他图形
   */
  private snapToGraphics(
    x: number,
    y: number,
    graphics: IGraphic[]
  ): SnapResult {
    let snappedX = x;
    let snappedY = y;
    const targets: SnapTarget[] = [];

    for (const graphic of graphics) {
      const geometry = this.getSafeGeometry(graphic);
      if (!geometry) continue;

      const graphicTargetPositions = this.getGraphicTargetPositions(geometry);

      for (const target of graphicTargetPositions) {
        const targetValue = target.value;

        if (target.position === 'left' || target.position === 'right' ||
            target.position === 'centerX') {
          if (Math.abs(x - targetValue) <= this.config.snapDistance) {
            snappedX = targetValue;
            targets.push({ ...target, graphicId: graphic.id });
          }
        } else {
          if (Math.abs(y - targetValue) <= this.config.snapDistance) {
            snappedY = targetValue;
            targets.push({ ...target, graphicId: graphic.id });
          }
        }
      }
    }

    return { x: snappedX, y: snappedY, targets };
  }

  /**
   * 获取图形吸附目标
   */
  private getGraphicSnapTargets(
    x: number,
    y: number,
    graphics: IGraphic[]
  ): SnapTarget[] {
    const targets: SnapTarget[] = [];

    for (const graphic of graphics) {
      const geometry = this.getSafeGeometry(graphic);
      if (!geometry) continue;

      const graphicTargetPositions = this.getGraphicTargetPositions(geometry);

      for (const target of graphicTargetPositions) {
        const targetValue = target.value;
        let distance = 0;

        if (target.position === 'left' || target.position === 'right' ||
            target.position === 'centerX') {
          distance = Math.abs(x - targetValue);
        } else {
          distance = Math.abs(y - targetValue);
        }

        if (distance <= this.config.snapDistance) {
          targets.push({ ...target, graphicId: graphic.id });
        }
      }
    }

    return targets;
  }

  /**
   * 获取图形的关键位置（用于吸附）
   */
  private getGraphicTargetPositions(geometry: any): Omit<SnapTarget, 'graphicId'>[] {
    const { x, y, width, height } = geometry;
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    return [
      // 边缘
      { type: 'edge', position: 'left', value: x },
      { type: 'edge', position: 'right', value: x + width },
      { type: 'edge', position: 'top', value: y },
      { type: 'edge', position: 'bottom', value: y + height },
      // 中心点
      { type: 'center', position: 'centerX', value: centerX },
      { type: 'center', position: 'centerY', value: centerY }
    ];
  }

  /**
   * 安全获取图形几何信息
   */
  private getSafeGeometry(graphic: IGraphic): any {
    if (!graphic || !graphic.config) {
      return null;
    }
    return graphic.config.geometry;
  }
}
