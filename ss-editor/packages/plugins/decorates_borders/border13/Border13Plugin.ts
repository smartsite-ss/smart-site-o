// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, DrawContext, InferSchemaProps } from '@scada-editor/plugin-sdk';
import { schema } from './border13PropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
import pkg from './package.json';

export type Border13Props = InferSchemaProps<typeof schema>;

const defaults: Border13Props = {
  color1: '#2862b7',
  color2: '#4b77b7',
  backgroundColor: '#00000000',
};


@Graphic({
  type: 'border13',
  name: i18n.global.t('border13.label'),
  category: 'decorates_borders',
  version: pkg.version,
  primaryCategory: 'decoration',
  description: i18n.global.t('border13.description'),
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
export class Border13Plugin extends BasePlugin<Border13Props> {
  componentName = 'Border13Graphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    return {
      w: width,
      h: height,
      colors: [this.pluginProps.color1, this.pluginProps.color2],
      backgroundColor: this.pluginProps.backgroundColor,
    };
  };

  protected render(_dc: DrawContext): void {
  }

  constructor(x = 0, y = 0, w = 400, h = 300) {
    super('border13', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}
