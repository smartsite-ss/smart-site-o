// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, DrawContext, InferSchemaProps } from '@scada-editor/plugin-sdk';
import { schema } from './countdownPropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
import pkg from './package.json';

export type CountDownProps = InferSchemaProps<typeof schema>;

const defaults: CountDownProps = {
  dataset: 600,
  showDay: true,
  color1: '#E6F7FF',
  color2: '#00000000',
  flipperWidth: 30,
  flipperHeight: 50,
  flipperGap: 10,
};


@Graphic({
  type: 'countdown',
  name: i18n.global.t('countdown.label'),
  category: 'decorates_other',
  version: pkg.version,
  primaryCategory: 'decoration',
  description: i18n.global.t('countdown.description'),
  defaultProps: defaults,
  defaultWidth: 500,
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
export class CountDownPlugin extends BasePlugin<CountDownProps> {
  componentName = 'CountDownGraphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    return {
      w: width,
      h: height,
      dataset: this.pluginProps.dataset ?? defaults.dataset,
      showDay: this.pluginProps.showDay ?? defaults.showDay,
      flipperBgColor: this.pluginProps.color1 ?? defaults.color1,
      flipperTextColor: this.pluginProps.color2 ?? defaults.color2,
      flipperWidth: this.pluginProps.flipperWidth ?? defaults.flipperWidth,
      flipperHeight: this.pluginProps.flipperHeight ?? defaults.flipperHeight,
      flipperGap: this.pluginProps.flipperGap ?? defaults.flipperGap,
    };
  };

  protected render(_dc: DrawContext): void {
  }

  constructor(x = 0, y = 0, w = 500, h = 100) {
    super('countdown', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}