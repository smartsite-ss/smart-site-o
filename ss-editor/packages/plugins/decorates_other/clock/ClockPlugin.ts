// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, DrawContext, InferSchemaProps } from '@scada-editor/plugin-sdk';
import { schema } from './clockPropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
import pkg from './package.json';

export type ClockProps = InferSchemaProps<typeof schema>;

const defaults: ClockProps = {
  color1: '#E6F7FF',
  color2: '#00000000',
  color3: '#0075ff',
  borderWidth: 8,
};


@Graphic({
  type: 'clock',
  name: i18n.global.t('clock.label'),
  category: 'decorates_other',
  version: pkg.version,
  primaryCategory: 'decoration',
  description: i18n.global.t('clock.description'),
  defaultProps: defaults,
  defaultWidth: 200,
  defaultHeight: 200,
  features: {
    resizable: true,
    rotatable: false,
    cloneable: true,
    groupable: true,
    dataBindable: true,
    animatable: true,
  },
})
export class ClockPlugin extends BasePlugin<ClockProps> {
  componentName = 'ClockGraphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    return {
      w: width,
      h: height,
      borderWidth: this.pluginProps.borderWidth ?? defaults.borderWidth,
      color: this.pluginProps.color1 ?? defaults.color1,
      bgColor: this.pluginProps.color2 ?? defaults.color2,
      borderColor: this.pluginProps.color3 ?? defaults.color3,
    };
  };

  protected render(_dc: DrawContext): void {
  }

  constructor(x = 0, y = 0, w = 200, h = 200) {
    super('clock', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}