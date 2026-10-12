// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { IGraphic } from '@scada-editor/plugin-sdk';

/**
 * 对齐工具函数
 */
export class AlignmentUtils {
  /**
   * 获取多个图形的边界框
   */
  static getBounds(graphics: IGraphic[]): {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  } {
    if (graphics.length === 0) {
      return {
        minX: 0,
        minY: 0,
        maxX: 0,
        maxY: 0,
        width: 0,
        height: 0,
      };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const graphic of graphics) {
      const pos = graphic.getPosition();
      const size = graphic.getSize();

      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + size.width);
      maxY = Math.max(maxY, pos.y + size.height);
    }

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /**
   * 对齐到左边
   */
  static alignLeft(graphics: IGraphic[]): void {
    if (graphics.length < 2) return;

    const bounds = this.getBounds(graphics);
    const targetX = bounds.minX;

    for (const graphic of graphics) {
      if (graphic.getLocked()) continue;
      const pos = graphic.getPosition();
      graphic.setPosition(targetX, pos.y);
    }
  }

  /**
   * 对齐到右边
   */
  static alignRight(graphics: IGraphic[]): void {
    if (graphics.length < 2) return;

    const bounds = this.getBounds(graphics);

    for (const graphic of graphics) {
      if (graphic.getLocked()) continue;
      const pos = graphic.getPosition();
      const size = graphic.getSize();
      const targetX = bounds.maxX - size.width;
      graphic.setPosition(targetX, pos.y);
    }
  }

  /**
   * 对齐到顶部
   */
  static alignTop(graphics: IGraphic[]): void {
    if (graphics.length < 2) return;

    const bounds = this.getBounds(graphics);
    const targetY = bounds.minY;

    for (const graphic of graphics) {
      if (graphic.getLocked()) continue;
      const pos = graphic.getPosition();
      graphic.setPosition(pos.x, targetY);
    }
  }

  /**
   * 对齐到底部
   */
  static alignBottom(graphics: IGraphic[]): void {
    if (graphics.length < 2) return;

    const bounds = this.getBounds(graphics);

    for (const graphic of graphics) {
      if (graphic.getLocked()) continue;
      const pos = graphic.getPosition();
      const size = graphic.getSize();
      const targetY = bounds.maxY - size.height;
      graphic.setPosition(pos.x, targetY);
    }
  }

  /**
   * 水平居中对齐
   */
  static alignCenter(graphics: IGraphic[]): void {
    if (graphics.length < 2) return;

    const bounds = this.getBounds(graphics);
    const centerX = bounds.minX + bounds.width / 2;

    for (const graphic of graphics) {
      if (graphic.getLocked()) continue;
      const pos = graphic.getPosition();
      const size = graphic.getSize();
      const targetX = centerX - size.width / 2;
      graphic.setPosition(targetX, pos.y);
    }
  }

  /**
   * 垂直居中对齐
   */
  static alignMiddle(graphics: IGraphic[]): void {
    if (graphics.length < 2) return;

    const bounds = this.getBounds(graphics);
    const centerY = bounds.minY + bounds.height / 2;

    for (const graphic of graphics) {
      if (graphic.getLocked()) continue;
      const pos = graphic.getPosition();
      const size = graphic.getSize();
      const targetY = centerY - size.height / 2;
      graphic.setPosition(pos.x, targetY);
    }
  }

  /**
   * 水平等间距分布
   */
  static distributeHorizontal(graphics: IGraphic[]): void {
    if (graphics.length < 3) return;

    // 按 x 坐标排序
    const sortedGraphics = [...graphics].sort(
      (a, b) => a.getPosition().x - b.getPosition().x
    );

    const bounds = this.getBounds(sortedGraphics);
    const totalWidth = bounds.width;

    // 计算所有图形的总宽度
    let allGraphicsWidth = 0;
    for (const graphic of sortedGraphics) {
      allGraphicsWidth += graphic.getSize().width;
    }

    // 计算间距
    const gapCount = sortedGraphics.length - 1;
    const gap = (totalWidth - allGraphicsWidth) / gapCount;

    // 重新放置图形
    let currentX = bounds.minX;
    for (const graphic of sortedGraphics) {
      if (!graphic.getLocked()) {
        const pos = graphic.getPosition();
        graphic.setPosition(currentX, pos.y);
      }
      currentX += graphic.getSize().width + gap;
    }
  }

  /**
   * 垂直等间距分布
   */
  static distributeVertical(graphics: IGraphic[]): void {
    if (graphics.length < 3) return;

    // 按 y 坐标排序
    const sortedGraphics = [...graphics].sort(
      (a, b) => a.getPosition().y - b.getPosition().y
    );

    const bounds = this.getBounds(sortedGraphics);
    const totalHeight = bounds.height;

    // 计算所有图形的总高度
    let allGraphicsHeight = 0;
    for (const graphic of sortedGraphics) {
      allGraphicsHeight += graphic.getSize().height;
    }

    // 计算间距
    const gapCount = sortedGraphics.length - 1;
    const gap = (totalHeight - allGraphicsHeight) / gapCount;

    // 重新放置图形
    let currentY = bounds.minY;
    for (const graphic of sortedGraphics) {
      if (!graphic.getLocked()) {
        const pos = graphic.getPosition();
        graphic.setPosition(pos.x, currentY);
      }
      currentY += graphic.getSize().height + gap;
    }
  }

  /**
   * 执行对齐操作
   */
  static executeAlign(
    graphics: IGraphic[],
    alignment: 'left' | 'right' | 'top' | 'bottom' | 'center' | 'middle'
  ): void {
    switch (alignment) {
      case 'left':
        this.alignLeft(graphics);
        break;
      case 'right':
        this.alignRight(graphics);
        break;
      case 'top':
        this.alignTop(graphics);
        break;
      case 'bottom':
        this.alignBottom(graphics);
        break;
      case 'center':
        this.alignCenter(graphics);
        break;
      case 'middle':
        this.alignMiddle(graphics);
        break;
    }
  }

  /**
   * 执行分布操作
   */
  static executeDistribute(
    graphics: IGraphic[],
    direction: 'horizontal' | 'vertical'
  ): void {
    switch (direction) {
      case 'horizontal':
        this.distributeHorizontal(graphics);
        break;
      case 'vertical':
        this.distributeVertical(graphics);
        break;
    }
  }
}

// 导出独立函数
export function alignLeft(graphics: IGraphic[]): void {
  AlignmentUtils.alignLeft(graphics);
}

export function alignRight(graphics: IGraphic[]): void {
  AlignmentUtils.alignRight(graphics);
}

export function alignTop(graphics: IGraphic[]): void {
  AlignmentUtils.alignTop(graphics);
}

export function alignBottom(graphics: IGraphic[]): void {
  AlignmentUtils.alignBottom(graphics);
}

export function alignCenter(graphics: IGraphic[]): void {
  AlignmentUtils.alignCenter(graphics);
}

export function alignMiddle(graphics: IGraphic[]): void {
  AlignmentUtils.alignMiddle(graphics);
}

export function distributeHorizontal(graphics: IGraphic[]): void {
  AlignmentUtils.distributeHorizontal(graphics);
}

export function distributeVertical(graphics: IGraphic[]): void {
  AlignmentUtils.distributeVertical(graphics);
}
