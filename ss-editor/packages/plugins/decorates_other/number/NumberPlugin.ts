// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, DrawContext, InferSchemaProps } from '@scada-editor/plugin-sdk';
import { schema } from './numberPropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
import pkg from './package.json';

export type NumberProps = InferSchemaProps<typeof schema>;

const defaults: NumberProps = {
  dataset: 100000,
  from: 0,
  dur: 3,
  precision: 0,
  showSeparator: true,
  numberSize: 34,
  color1: '#E6F7FF',
  prefixText: '￥',
  color2: '#0075ff',
  suffixText: '元',
  color3: '#0075ff',
};


@Graphic({
  type: 'number',
  name: i18n.global.t('number.label'),
  category: 'decorates_other',
  version: pkg.version,
  primaryCategory: 'decoration',
  description: i18n.global.t('number.description'),
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
export class NumberPlugin extends BasePlugin<NumberProps> {
  componentName = 'NumberGraphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    return {
      w: width,
      h: height,
      dataset: this.pluginProps.dataset ?? defaults.dataset,
      from: this.pluginProps.from ?? defaults.from,
      dur: this.pluginProps.dur ?? defaults.dur,
      precision: this.pluginProps.precision ?? defaults.precision,
      showSeparator: this.pluginProps.showSeparator ?? defaults.showSeparator,
      numberSize: this.pluginProps.numberSize ?? defaults.numberSize,
      numberColor: this.pluginProps.color1 ?? defaults.color1,
      prefixText: this.pluginProps.prefixText ?? defaults.prefixText,
      prefixColor: this.pluginProps.color2 ?? defaults.color2,
      suffixText: this.pluginProps.suffixText ?? defaults.suffixText,
      suffixColor: this.pluginProps.color3 ?? defaults.color3,
    };
  };

  protected render(_dc: DrawContext): void {
  }

  constructor(x = 0, y = 0, w = 300, h = 100) {
    super('number', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}