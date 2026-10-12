// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, DrawContext, InferSchemaProps } from '@scada-editor/plugin-sdk';
import { upsPropertySchema } from './upsPropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export type UpsProps = InferSchemaProps<typeof upsPropertySchema>;

const defaults: UpsProps = {
  color: '#ca8a04',
  backgroundColor: '#00000000',
  lineWidth: 2,
  state: 'online',
};


@Graphic({
  type: 'ups',
  name: i18n.global.t('ups.label'),
  category: 'electric',
  primaryCategory: 'electric',
  description: i18n.global.t('ups.description'),
  defaultProps: defaults,
  defaultWidth: 50,
  defaultHeight: 70,
  features: {
    resizable: true,
    rotatable: false,
    cloneable: true,
    groupable: true,
    dataBindable: true,
    animatable: true,
  },
})
export class UpsPlugin extends BasePlugin<UpsProps> {
  componentName = 'UpsGraphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    return {
      w: width,
      h: height,
      color: this.pluginProps.color,
      backgroundColor: this.pluginProps.backgroundColor,
      lineWidth: this.pluginProps.lineWidth,
      state: this.pluginProps.state,
    };
  };

  protected render(_dc: DrawContext): void { }

  constructor(x = 0, y = 0, w = 50, h = 70) {
    super('ups', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}
