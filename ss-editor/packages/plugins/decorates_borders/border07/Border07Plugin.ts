// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, InferSchemaProps, DrawContext } from '@scada-editor/plugin-sdk';
import { schema } from './border07PropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
import pkg from './package.json';

export type Border07Props = InferSchemaProps<typeof schema>;

const defaults: Border07Props = {
  color1: '#11eefd',
  color2: '#0078d2',
  backgroundColor: '#00000000',
};


@Graphic({
  type: 'border07',
  name: i18n.global.t('border07.label'),
  category: 'decorates_borders',
  version: pkg.version,
  primaryCategory: 'decoration',
  description: i18n.global.t('border07.description'),
  defaultProps: defaults,
  defaultWidth: 400,
  defaultHeight: 300,
  features: {
    resizable: true,
    rotatable: false,
    cloneable: true,
    groupable: true,
    dataBindable: true,
    animatable: true,
  },
})
export class Border07Plugin extends BasePlugin<Border07Props> {
  componentName = 'Border07Graphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    return {
      w: width,
      h: height,
      colors: [this.pluginProps.color1, this.pluginProps.color2],
      backgroundColor: this.pluginProps.backgroundColor,
    };
  };

  protected render(_dc: DrawContext): void {}

  constructor(x = 0, y = 0, w = 400, h = 300) {
    super('border07', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}
