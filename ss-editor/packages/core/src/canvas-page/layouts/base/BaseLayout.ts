// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { v4 as uuidv4 } from 'uuid';
import { ILayout } from './ILayout';
import { IGraphic } from '@scada-editor/plugin-sdk';

// 基础布局类
export abstract class BaseLayout implements ILayout {
  id: string;
  type: string;
  properties: Record<string, any>;

  constructor(type: string, properties: Record<string, any> = {}) {
    this.id = uuidv4();
    this.type = type;
    this.properties = properties;
  }

  abstract applyLayout(graphics: IGraphic[]): void;

  abstract arrange(graphics: IGraphic[]): void;

  update(properties: Partial<Record<string, any>>): void {
    this.properties = { ...this.properties, ...properties };
  }

  toJSON(): any {
    return {
      id: this.id,
      type: this.type,
      properties: this.properties
    };
  }

  fromJSON(data: any): void {
    if (data) {
      this.id = data.id || this.id;
      this.type = data.type || this.type;
      this.properties = data.properties || this.properties;
    }
  }

  clone(): ILayout {
    const cloned = Object.create(Object.getPrototypeOf(this)) as ILayout;
    cloned.id = uuidv4();
    cloned.type = this.type;
    cloned.properties = { ...this.properties };
    return cloned;
  }
}