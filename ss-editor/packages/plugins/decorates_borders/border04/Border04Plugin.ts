// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, DrawContext, InferSchemaProps  } from '@scada-editor/plugin-sdk';
import { schema } from './border04PropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
import pkg from './package.json';

export type Border04Props = InferSchemaProps<typeof schema>;

const defaults: Border04Props = {
  colors: ['#8aaafb', '#1f33a2'],
  backgroundColor: '#00000000',
  borderTitle: '边框-04',
  borderTitleWidth: 250,
  borderTitleHeight: 32,
  borderTitleSize: 18,
  borderTitleColor: '#fff',
};


@Graphic({
  type: 'border04',
  name: i18n.global.t('border04.label'),
  category: 'decorates_borders',
  version: pkg.version,
  primaryCategory: 'decoration',
  description: i18n.global.t('border04.description'),
  defaultProps: defaults,
  defaultWidth: 400,
  defaultHeight: 300,
  features: {
    resizable: true,
    rotatable: false,
    cloneable: true,
    groupable: true,
    dataBindable: false,
  },
})
export class Border04Plugin extends BasePlugin<Border04Props> {
  componentName = 'Border04Graphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    return {
      w: width,
      h: height,
      colors: this.pluginProps.colors,
      backgroundColor: this.pluginProps.backgroundColor,
      borderTitle: this.pluginProps.borderTitle,
      borderTitleWidth: this.pluginProps.borderTitleWidth,
      borderTitleHeight: this.pluginProps.borderTitleHeight,
      borderTitleSize: this.pluginProps.borderTitleSize,
      borderTitleColor: this.pluginProps.borderTitleColor,
    };
  };

  protected render(_dc: DrawContext): void {
  }

  constructor(x = 0, y = 0, w = 400, h = 300) {
    super('border04', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}
