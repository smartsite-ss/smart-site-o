// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, DrawContext, InferSchemaProps } from '@scada-editor/plugin-sdk';
import { schema } from './timeCommonPropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
import pkg from './package.json';

export type TimeCommonProps = InferSchemaProps<typeof schema>;

const defaults: TimeCommonProps = {
  timeSize: 24,
  timeLineHeight: 50,
  timeTextIndent: 2,
  color1: '#E6F7FF',
  fontWeight: 'normal',
  backgroundColor: '#00000000',
  showShadow: true,
  hShadow: 0,
  vShadow: 0,
  blurShadow: 8,
  colorShadow: '#0075ff',
};


@Graphic({
  type: 'time-common',
  name: i18n.global.t('time-common.label'),
  category: 'decorates_other',
  version: pkg.version,
  primaryCategory: 'decoration',
  description: i18n.global.t('time-common.description'),
  defaultProps: defaults,
  defaultWidth: 300,
  defaultHeight: 50,
  features: {
    resizable: true,
    rotatable: false,
    cloneable: true,
    groupable: true,
    dataBindable: true,
    animatable: true,
  },
})
export class TimeCommonPlugin extends BasePlugin<TimeCommonProps> {
  componentName = 'TimeCommonGraphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    return {
      w: width,
      h: height,
      timeSize: this.pluginProps.timeSize ?? defaults.timeSize,
      timeLineHeight: height,
      timeTextIndent: this.pluginProps.timeTextIndent ?? defaults.timeTextIndent,
      timeColor: this.pluginProps.color1 ?? defaults.color1,
      fontWeight: this.pluginProps.fontWeight ?? defaults.fontWeight,
      showShadow: this.pluginProps.showShadow ?? defaults.showShadow,
      hShadow: this.pluginProps.hShadow ?? defaults.hShadow,
      vShadow: this.pluginProps.vShadow ?? defaults.vShadow,
      blurShadow: this.pluginProps.blurShadow ?? defaults.blurShadow,
      colorShadow: this.pluginProps.colorShadow ?? defaults.colorShadow,
    };
  };

  protected render(_dc: DrawContext): void {}

  constructor(x = 0, y = 0, w = 300, h = 50) {
    super('time-common', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}