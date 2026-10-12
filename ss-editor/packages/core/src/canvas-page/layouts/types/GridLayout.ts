// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BaseLayout } from '../base/BaseLayout';
import { IGraphic } from '@scada-editor/plugin-sdk';

// 网格布局类
export class GridLayout extends BaseLayout {
  constructor() {
    super('grid', {
      rows: 2,
      columns: 2,
      spacing: 10,
      padding: 10,
    });
  }

  clone(): GridLayout {
    const cloned = new GridLayout();
    cloned.properties = { ...this.properties };
    return cloned;
  }

  // 应用布局
  applyLayout(graphics: IGraphic[]): void {
    this.arrange(graphics);
  }

  // 排列图形
  arrange(graphics: IGraphic[]): void {
    const { rows, columns, spacing, padding } = this.properties;
    const totalItems = graphics.length;
    const itemsPerPage = rows * columns;
    const pageCount = Math.ceil(totalItems / itemsPerPage);

    for (let page = 0; page < pageCount; page++) {
      const startIndex = page * itemsPerPage;
      const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
      const pageGraphics = graphics.slice(startIndex, endIndex);

      for (let i = 0; i < pageGraphics.length; i++) {
        const graphic = pageGraphics[i];
        const row = Math.floor(i / columns);
        const col = i % columns;

        // 计算图形位置
        const x =
          padding + col * (graphic.config.geometry.width + spacing);
        const y =
          padding + row * (graphic.config.geometry.height + spacing);

        // 更新图形位置
        graphic.config.geometry.x = x;
        graphic.config.geometry.y = y;
      }
    }
  }
}
