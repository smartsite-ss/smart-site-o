// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { IGraphic } from '@scada-editor/plugin-sdk';

// 布局接口
export interface ILayout {
  id: string;
  type: string;
  properties: Record<string, any>;

  // 应用布局
  applyLayout(graphics: IGraphic[]): void;

  // 更新属性
  update(properties: Partial<Record<string, any>>): void;

  // 序列化
  toJSON(): any;

  // 反序列化
  fromJSON(data: any): void;

  // 克隆方法
  clone(): ILayout;
}
