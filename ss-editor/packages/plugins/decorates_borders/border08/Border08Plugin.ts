// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, InferSchemaProps, DrawContext } from '@scada-editor/plugin-sdk';
import { schema } from './border08PropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
import pkg from './package.json';

export type Border08Props = InferSchemaProps<typeof schema>;

const defaults: Border08Props = {
  color1: '#235fa7',
  color2: '#4fd2dd',
  backgroundColor: '#00000000',
  dur: 3,
  reverse: false,
};


@Graphic({
  type: 'border08',
  name: i18n.global.t('border08.label'),
  category: 'decorates_borders',
  version: pkg.version,
  primaryCategory: 'decoration',
  description: i18n.global.t('border08.description'),
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
export class Border08Plugin extends BasePlugin<Border08Props> {
  componentName = 'Border08Graphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    return {
      w: width,
      h: height,
      colors: [this.pluginProps.color1, this.pluginProps.color2],
      backgroundColor: this.pluginProps.backgroundColor,
      dur: this.pluginProps.dur,
      reverse: this.pluginProps.reverse,
    };
  };

  protected render(_dc: DrawContext): void {}

  constructor(x = 0, y = 0, w = 400, h = 300) {
    super('border08', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}
