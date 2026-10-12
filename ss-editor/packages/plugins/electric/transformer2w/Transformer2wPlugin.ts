// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, DrawContext, InferSchemaProps } from '@scada-editor/plugin-sdk';
import { transformer2wPropertySchema } from './transformer2wPropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export type Transformer2wProps = InferSchemaProps<typeof transformer2wPropertySchema>;

const defaults: Transformer2wProps = {
  color: '#1e90ff',
  backgroundColor: '#00000000',
  lineWidth: 2,
};


@Graphic({
  type: 'transformer2w',
  name: i18n.global.t('transformer2w.label'),
  category: 'electric',
  primaryCategory: 'electric',
  description: i18n.global.t('transformer2w.description'),
  defaultProps: defaults,
  defaultWidth: 70,
  defaultHeight: 100,
  features: {
    resizable: true,
    rotatable: false,
    cloneable: true,
    groupable: true,
    dataBindable: true,
    animatable: false,
  },
})
export class Transformer2wPlugin extends BasePlugin<Transformer2wProps> {
  componentName = 'Transformer2wGraphic';

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

  constructor(x = 0, y = 0, w = 70, h = 100) {
    super('transformer2w', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}
