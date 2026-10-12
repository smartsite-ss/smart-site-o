// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, DrawContext, InferSchemaProps } from '@scada-editor/plugin-sdk';
import { ctPropertySchema } from './ctPropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export type CtProps = InferSchemaProps<typeof ctPropertySchema>;

const defaults: CtProps = {
  color: '#8b5cf6',
  backgroundColor: '#00000000',
  lineWidth: 2,
};


@Graphic({
  type: 'ct',
  name: i18n.global.t('ct.label'),
  category: 'electric',
  primaryCategory: 'electric',
  description: i18n.global.t('ct.description'),
  defaultProps: defaults,
  defaultWidth: 50,
  defaultHeight: 60,
  features: {
    resizable: true,
    rotatable: false,
    cloneable: true,
    groupable: true,
    dataBindable: true,
    animatable: false,
  },
})
export class CtPlugin extends BasePlugin<CtProps> {
  componentName = 'CtGraphic';

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

  constructor(x = 0, y = 0, w = 50, h = 60) {
    super('ct', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}
