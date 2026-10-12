// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, DrawContext, InferSchemaProps } from '@scada-editor/plugin-sdk';
import { schema } from './head01PropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
import pkg from './package.json';

export type Head01Props = InferSchemaProps<typeof schema>;

const defaults: Head01Props = {
  color1: '#4fd2dd',
  color2: '#235fa7',
  backgroundColor: '#00000000',
  dur: 3,
  lineHeight: 2,
  endWidth: 5,
};


@Graphic({
  type: 'head01',
  name: i18n.global.t('head01.label'),
  category: 'decorates_head',
  version: pkg.version,
  primaryCategory: 'decoration',
  description: i18n.global.t('head01.description'),
  defaultProps: defaults,
  defaultWidth: 400,
  defaultHeight: 30,
  features: {
    resizable: true,
    rotatable: false,
    cloneable: true,
    groupable: true,
    dataBindable: true,
    animatable: true,
  },
})
export class Head01Plugin extends BasePlugin<Head01Props> {
  componentName = 'Head01Graphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    return {
      w: width,
      h: height,
      colors: [this.pluginProps.color1, this.pluginProps.color2],
      backgroundColor: this.pluginProps.backgroundColor,
      dur: this.pluginProps.dur,
      lineHeight: this.pluginProps.lineHeight,
      endWidth: this.pluginProps.endWidth,
    };
  };

  protected render(_dc: DrawContext): void {}

  constructor(x = 0, y = 0, w = 400, h = 30) {
    super('head01', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}