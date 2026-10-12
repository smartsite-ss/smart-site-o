// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, DrawContext, InferSchemaProps } from '@scada-editor/plugin-sdk';
import { groundPropertySchema } from './groundPropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export type GroundProps = InferSchemaProps<typeof groundPropertySchema>;

const defaults: GroundProps = {
  color: '#374151',
  backgroundColor: '#00000000',
  lineWidth: 2,
};


@Graphic({
  type: 'ground',
  name: i18n.global.t('ground.label'),
  category: 'electric',
  primaryCategory: 'electric',
  description: i18n.global.t('ground.description'),
  defaultProps: defaults,
  defaultWidth: 30,
  defaultHeight: 30,
  features: {
    resizable: true,
    rotatable: false,
    cloneable: true,
    groupable: true,
    dataBindable: true,
    animatable: false,
  },
})
export class GroundPlugin extends BasePlugin<GroundProps> {
  componentName = 'GroundGraphic';

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

  constructor(x = 0, y = 0, w = 30, h = 30) {
    super('ground', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}
