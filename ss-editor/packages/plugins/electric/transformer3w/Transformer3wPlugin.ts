// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, DrawContext, InferSchemaProps } from '@scada-editor/plugin-sdk';
import { transformer3wPropertySchema } from './transformer3wPropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export type Transformer3wProps = InferSchemaProps<typeof transformer3wPropertySchema>;

const defaults: Transformer3wProps = {
  color: '#1e90ff',
  backgroundColor: '#00000000',
  lineWidth: 2,
};


@Graphic({
  type: 'transformer3w',
  name: i18n.global.t('transformer3w.label'),
  category: 'electric',
  primaryCategory: 'electric',
  description: i18n.global.t('transformer3w.description'),
  defaultProps: defaults,
  defaultWidth: 100,
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
export class Transformer3wPlugin extends BasePlugin<Transformer3wProps> {
  componentName = 'Transformer3wGraphic';

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

  constructor(x = 0, y = 0, w = 100, h = 100) {
    super('transformer3w', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}
