// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, DrawContext, InferSchemaProps } from '@scada-editor/plugin-sdk';
import { schema } from './head05PropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
import pkg from './package.json';

export type Head05Props = InferSchemaProps<typeof schema>;

const defaults: Head05Props = {
  colors: ['#4fd2dd', '#235fa7'],
  backgroundColor: '#00000000',
};


@Graphic({
  type: 'head05',
  name: i18n.global.t('head05.label'),
  category: 'decorates_head',
  version: pkg.version,
  primaryCategory: 'decoration',
  description: i18n.global.t('head05.description'),
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
export class Head05Plugin extends BasePlugin<Head05Props> {
  componentName = 'Head05Graphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    return {
      w: width,
      h: height,
      colors: [this.pluginProps.color1, this.pluginProps.color2],
      dur: this.pluginProps.dur,
    };
  };

  protected render(_dc: DrawContext): void {}

  constructor(x = 0, y = 0, w = 400, h = 30) {
    super('head05', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}