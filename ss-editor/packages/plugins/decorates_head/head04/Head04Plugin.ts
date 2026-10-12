// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, DrawContext, InferSchemaProps } from '@scada-editor/plugin-sdk';
import { schema } from './head04PropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
import pkg from './package.json';

export type Head04Props = InferSchemaProps<typeof schema>;

const defaults: Head04Props = {
  color1: '#4fd2dd',
  color2: '#235fa7',
  backgroundColor: '#00000000',
  reverse: false,
};


@Graphic({
  type: 'head04',
  name: i18n.global.t('head04.label'),
  category: 'decorates_head',
  version: pkg.version,
  primaryCategory: 'decoration',
  description: i18n.global.t('head04.description'),
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
export class Head04Plugin extends BasePlugin<Head04Props> {
  componentName = 'Head04Graphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    return {
      w: width,
      h: height,
      colors: [this.pluginProps.color1, this.pluginProps.color2],
      backgroundColor: this.pluginProps.backgroundColor,
      reverse: this.pluginProps.reverse,
    };
  };

  protected render(_dc: DrawContext): void {}

  constructor(x = 0, y = 0, w = 400, h = 30) {
    super('head04', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}