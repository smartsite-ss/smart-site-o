// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, DrawContext, InferSchemaProps } from '@scada-editor/plugin-sdk';
import { arccoilPropertySchema } from './arccoilPropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export type ArccoilProps = InferSchemaProps<typeof arccoilPropertySchema>;

const defaults: ArccoilProps = {
  color: '#3b82f6',
  backgroundColor: '#00000000',
  lineWidth: 2,
};


@Graphic({
  type: 'arccoil',
  name: i18n.global.t('arccoil.label'),
  category: 'electric',
  primaryCategory: 'electric',
  description: i18n.global.t('arccoil.description'),
  defaultProps: defaults,
  defaultWidth: 40,
  defaultHeight: 70,
  features: {
    resizable: true,
    rotatable: false,
    cloneable: true,
    groupable: true,
    dataBindable: true,
    animatable: false,
  },
})
export class ArccoilPlugin extends BasePlugin<ArccoilProps> {
  componentName = 'ArccoilGraphic';

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

  constructor(x = 0, y = 0, w = 40, h = 70) {
    super('arccoil', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}
