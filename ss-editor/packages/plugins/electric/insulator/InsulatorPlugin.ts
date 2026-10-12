// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, DrawContext, InferSchemaProps } from '@scada-editor/plugin-sdk';
import { insulatorPropertySchema } from './insulatorPropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export type InsulatorProps = InferSchemaProps<typeof insulatorPropertySchema>;

const defaults: InsulatorProps = {
  color: '#9ca3af',
  backgroundColor: '#00000000',
  lineWidth: 2,
};


@Graphic({
  type: 'insulator',
  name: i18n.global.t('insulator.label'),
  category: 'electric',
  primaryCategory: 'electric',
  description: i18n.global.t('insulator.description'),
  defaultProps: defaults,
  defaultWidth: 24,
  defaultHeight: 50,
  features: {
    resizable: true,
    rotatable: false,
    cloneable: true,
    groupable: true,
    dataBindable: true,
    animatable: false,
  },
})
export class InsulatorPlugin extends BasePlugin<InsulatorProps> {
  componentName = 'InsulatorGraphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    return {
      w: width,
      h: height,
      color: this.pluginProps.color,
      backgroundColor: this.pluginProps.backgroundColor,
      lineWidth: this.pluginProps.lineWidth,
    };
  };

  protected render(_dc: DrawContext): void { }

  constructor(x = 0, y = 0, w = 24, h = 50) {
    super('insulator', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}
