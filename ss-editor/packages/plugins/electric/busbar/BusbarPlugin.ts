// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, DrawContext, InferSchemaProps } from '@scada-editor/plugin-sdk';
import { busbarPropertySchema } from './busbarPropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export type BusbarProps = InferSchemaProps<typeof busbarPropertySchema>;

const defaults: BusbarProps = {
  color: '#dc2626',
  backgroundColor: '#00000000',
  lineWidth: 4,
  labelText: '',
};


@Graphic({
  type: 'busbar',
  name: i18n.global.t('busbar.label'),
  category: 'electric',
  primaryCategory: 'electric',
  description: i18n.global.t('busbar.description'),
  defaultProps: defaults,
  defaultWidth: 120,
  defaultHeight: 16,
  features: {
    resizable: true,
    rotatable: false,
    cloneable: true,
    groupable: true,
    dataBindable: true,
    animatable: false,
  },
})
export class BusbarPlugin extends BasePlugin<BusbarProps> {
  componentName = 'BusbarGraphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    return {
      w: width,
      h: height,
      color: this.pluginProps.color,
      backgroundColor: this.pluginProps.backgroundColor,
      lineWidth: this.pluginProps.lineWidth,
      labelText: this.pluginProps.labelText,
    };
  };

  protected render(_dc: DrawContext): void { }

  constructor(x = 0, y = 0, w = 120, h = 16) {
    super('busbar', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}
