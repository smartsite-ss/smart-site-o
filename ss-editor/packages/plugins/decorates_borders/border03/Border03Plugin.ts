// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, DrawContext, InferSchemaProps  } from '@scada-editor/plugin-sdk';
import { schema } from './border03PropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
import pkg from './package.json';

export type Border03Props = InferSchemaProps<typeof schema>;

const defaults: Border03Props = {
  colors: ['#6586ec', '#2cf7fe'],
  backgroundColor: '#00000000',
};


@Graphic({
  type: 'border03',
  name: i18n.global.t('border03.label'),
  category: 'decorates_borders',
  version: pkg.version,
  primaryCategory: 'decoration',
  description: i18n.global.t('border03.description'),
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
export class Border03Plugin extends BasePlugin<Border03Props> {
  componentName = 'Border03Graphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    return {
      w: width,
      h: height,
      colors: this.pluginProps.colors,
      backgroundColor: this.pluginProps.backgroundColor,
    };
  };

  protected render(_dc: DrawContext): void {
  }

  constructor(x = 0, y = 0, w = 400, h = 300) {
    super('border03', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}