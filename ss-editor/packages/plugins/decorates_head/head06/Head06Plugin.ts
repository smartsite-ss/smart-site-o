// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, DrawContext, InferSchemaProps } from '@scada-editor/plugin-sdk';
import { schema } from './head06PropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
import pkg from './package.json';

export type Head06Props = InferSchemaProps<typeof schema>;

const defaults: Head06Props = {
  color1: '#4fd2dd',
  color2: '#235fa7',
  backgroundColor: '#00000000',
  dataset: '我是标题',
  textColor: '#fff',
  textSize: 32,
};


@Graphic({
  type: 'head06',
  name: i18n.global.t('head06.label'),
  category: 'decorates_head',
  version: pkg.version,
  primaryCategory: 'decoration',
  description: i18n.global.t('head06.description'),
  defaultProps: defaults,
  defaultWidth: 500,
  defaultHeight: 70,
  features: {
    resizable: true,
    rotatable: false,
    cloneable: true,
    groupable: true,
    dataBindable: true,
    animatable: true,
  },
})
export class Head06Plugin extends BasePlugin<Head06Props> {
  componentName = 'Head06Graphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    return {
      w: width,
      h: height,
      colors: [this.pluginProps.color1, this.pluginProps.color2],
      dataset: this.pluginProps.dataset,
      textColor: this.pluginProps.textColor,
      textSize: this.pluginProps.textSize,
    };
  };

  protected render(_dc: DrawContext): void {}

  constructor(x = 0, y = 0, w = 500, h = 70) {
    super('head06', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}