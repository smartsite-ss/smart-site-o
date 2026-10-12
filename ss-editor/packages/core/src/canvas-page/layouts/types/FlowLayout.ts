// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BaseLayout } from '../base/BaseLayout';
import { IGraphic } from '@scada-editor/plugin-sdk';

// 流式布局类
export class FlowLayout extends BaseLayout {
  clone(): FlowLayout {
    const cloned = new FlowLayout();
    cloned.properties = { ...this.properties };
    return cloned;
  }
  constructor() {
    super('flow', {
      direction: 'horizontal', // horizontal, vertical
      spacing: 10,
      padding: 10,
    });
  }

  // 应用布局
  applyLayout(graphics: IGraphic[]): void {
    this.arrange(graphics);
  }

  // 排列图形
  arrange(graphics: IGraphic[]): void {
    const { direction, spacing, padding } = this.properties;
    let x = padding;
    let y = padding;
    let maxHeight = 0;

    for (const graphic of graphics) {
      if (direction === 'horizontal') {
        // 水平方向布局
        if (x + graphic.config.geometry.width > 800) {
          // 假设容器宽度为 800
          x = padding;
          y += maxHeight + spacing;
          maxHeight = 0;
        }

        graphic.config.geometry.x = x;
        graphic.config.geometry.y = y;

        x += graphic.config.geometry.width + spacing;
        maxHeight = Math.max(maxHeight, graphic.config.geometry.height);
      } else {
        // 垂直方向布局
        graphic.config.geometry.x = x;
        graphic.config.geometry.y = y;

        y += graphic.config.geometry.height + spacing;
      }
    }
  }
}
