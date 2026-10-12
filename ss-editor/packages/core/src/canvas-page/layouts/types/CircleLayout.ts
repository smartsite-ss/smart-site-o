// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BaseLayout } from '../base/BaseLayout';
import { IGraphic } from '@scada-editor/plugin-sdk';

export class CircleLayout extends BaseLayout {
  constructor() {
    super('circle', {
      centerX: 400,
      centerY: 300,
      radius: 200,
      startAngle: -90,
      clockwise: true,
    });
  }

  clone(): CircleLayout {
    const cloned = new CircleLayout();
    cloned.properties = { ...this.properties };
    return cloned;
  }

  applyLayout(graphics: IGraphic[]): void {
    this.arrange(graphics);
  }

  arrange(graphics: IGraphic[]): void {
    const { centerX, centerY, radius, startAngle, clockwise } = this.properties;
    const count = graphics.length;

    if (count === 0) return;

    const direction = clockwise ? 1 : -1;
    const startRad = (startAngle * Math.PI) / 180;

    for (let i = 0; i < count; i++) {
      const graphic = graphics[i];
      const angle = startRad + direction * (i / count) * Math.PI * 2;
      const size = graphic.getSize();

      graphic.config.geometry.x = centerX + Math.cos(angle) * radius - size.width / 2;
      graphic.config.geometry.y = centerY + Math.sin(angle) * radius - size.height / 2;
    }
  }
}