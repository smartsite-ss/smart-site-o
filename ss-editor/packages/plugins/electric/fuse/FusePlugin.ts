// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, DrawContext, InferSchemaProps } from '@scada-editor/plugin-sdk';
import { fusePropertySchema } from './fusePropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export type FuseProps = InferSchemaProps<typeof fusePropertySchema>;

const defaults: FuseProps = {
  color: '#ff8c00',
  backgroundColor: '#00000000',
  lineWidth: 2,
};


@Graphic({
  type: 'fuse',
  name: i18n.global.t('fuse.label'),
  category: 'electric',
  primaryCategory: 'electric',
  description: i18n.global.t('fuse.description'),
  defaultProps: defaults,
  defaultWidth: 30,
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
export class FusePlugin extends BasePlugin<FuseProps> {
  componentName = 'FuseGraphic';

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

  constructor(x = 0, y = 0, w = 30, h = 60) {
    super('fuse', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}
