// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, DrawContext, InferSchemaProps } from '@scada-editor/plugin-sdk';
import { schema } from './flipperNumberPropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
import pkg from './package.json';

export type FlipperNumberProps = InferSchemaProps<typeof schema>;

const defaults: FlipperNumberProps = {
  dataset: '3234',
  flipperLength: 6,
  color1: '#E6F7FF',
  backgroundColor: '#00000000',
  flipperWidth: 30,
  flipperHeight: 50,
  flipperGap: 10,
  showShadow: true,
  hShadow: 0,
  vShadow: 0,
  blurShadow: 8,
  colorShadow: '#0075ff',
};


@Graphic({
  type: 'flipper-number',
  name: i18n.global.t('flipper-number.label'),
  category: 'decorates_other',
  version: pkg.version,
  primaryCategory: 'decoration',
  description: i18n.global.t('flipper-number.description'),
  defaultProps: defaults,
  defaultWidth: 300,
  defaultHeight: 100,
  features: {
    resizable: true,
    rotatable: false,
    cloneable: true,
    groupable: true,
    dataBindable: true,
    animatable: true,
  },
})
export class FlipperNumberPlugin extends BasePlugin<FlipperNumberProps> {
  componentName = 'FlipperNumberGraphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    return {
      w: width,
      h: height,
      dataset: this.pluginProps.dataset ?? defaults.dataset,
      flipperLength: this.pluginProps.flipperLength ?? defaults.flipperLength,
      flipperTextColor: this.pluginProps.color1 ?? defaults.color1,
      flipperWidth: this.pluginProps.flipperWidth ?? defaults.flipperWidth,
      flipperHeight: this.pluginProps.flipperHeight ?? defaults.flipperHeight,
      flipperGap: this.pluginProps.flipperGap ?? defaults.flipperGap,
    };
  };

  protected render(_dc: DrawContext): void {
  }

  constructor(x = 0, y = 0, w = 300, h = 100) {
    super('flipper-number', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}