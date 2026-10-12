// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BaseLayout } from '../base/BaseLayout';
import { IGraphic } from '@scada-editor/plugin-sdk';

// 自由布局类
export class FreeLayout extends BaseLayout {
  constructor() {
    super('free', {
      // 自由布局没有特定的属性
    });
  }

  arrange(_graphics: IGraphic[]): void {
    // 自由布局不做任何处理，图形保持原来的位置
  }

  // 应用布局
  applyLayout(_graphics: IGraphic[]): void {
    // 自由布局不做任何处理，图形保持原来的位置
  }

  // 克隆方法
  clone(): FreeLayout {
    const newLayout = new FreeLayout();
    newLayout.properties = { ...this.properties };
    return newLayout;
  }
}
