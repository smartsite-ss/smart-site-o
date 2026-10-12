// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, DrawContext, InferSchemaProps } from '@scada-editor/plugin-sdk';
import { schema } from './border18PropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
import pkg from './package.json';

export type Border18Props = InferSchemaProps<typeof schema>;

const defaults: Border18Props = {
  color1: '#1a6b6b',
  color2: '#c1784b',
  color3: '#d4a853',
  backgroundColor: '#00000000',
  showStars: true,
  showArches: true,
  animationSpeed: 1,
};


@Graphic({
  type: 'border18',
  name: i18n.global.t('border18.label'),
  category: 'decorates_borders',
  version: pkg.version,
  primaryCategory: 'decoration',
  description: i18n.global.t('border18.description'),
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
export class Border18Plugin extends BasePlugin<Border18Props> {
  componentName = 'Border18Graphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    return {
      w: width,
      h: height,
      colors: [this.pluginProps.color1, this.pluginProps.color2, this.pluginProps.color3],
      backgroundColor: this.pluginProps.backgroundColor,
      showStars: this.pluginProps.showStars,
      showArches: this.pluginProps.showArches,
      animationSpeed: this.pluginProps.animationSpeed,
    };
  };

  protected render(_dc: DrawContext): void {
  }

  constructor(x = 0, y = 0, w = 400, h = 300) {
    super('border18', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}