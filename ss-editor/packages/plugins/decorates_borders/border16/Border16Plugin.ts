// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, DrawContext, InferSchemaProps } from '@scada-editor/plugin-sdk';
import { schema } from './border16PropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
import pkg from './package.json';

export type Border16Props = InferSchemaProps<typeof schema>;

const defaults: Border16Props = {
  color1: '#7d9b76',
  color2: '#c4a882',
  color3: '#e8e0d5',
  backgroundColor: '#00000000',
  showLeaves: true,
  showDots: true,
  animationSpeed: 1,
};


@Graphic({
  type: 'border16',
  name: i18n.global.t('border16.label'),
  category: 'decorates_borders',
  version: pkg.version,
  primaryCategory: 'decoration',
  description: i18n.global.t('border16.description'),
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
export class Border16Plugin extends BasePlugin<Border16Props> {
  componentName = 'Border16Graphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    return {
      w: width,
      h: height,
      colors: [this.pluginProps.color1, this.pluginProps.color2, this.pluginProps.color3],
      backgroundColor: this.pluginProps.backgroundColor,
      showLeaves: this.pluginProps.showLeaves,
      showDots: this.pluginProps.showDots,
      animationSpeed: this.pluginProps.animationSpeed,
    };
  };

  protected render(_dc: DrawContext): void {
  }

  constructor(x = 0, y = 0, w = 400, h = 300) {
    super('border16', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}