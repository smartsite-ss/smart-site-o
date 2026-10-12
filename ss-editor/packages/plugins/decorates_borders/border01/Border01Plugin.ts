// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, DrawContext, InferSchemaProps } from '@scada-editor/plugin-sdk';
import { border01PropertySchema } from './border01PropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
import pkg from './package.json';

export type Border01Props = InferSchemaProps<typeof border01PropertySchema>;

const defaults: Border01Props = {
  color1: '#4fd2dd',
  color2: '#235fa7',
  backgroundColor: '#00000000',
  borderColor: '#00000000',
  dur: 0.5,
  showAnimation: false,
};


@Graphic({
  type: 'border01',
  name: i18n.global.t('border01.label'),
  category: 'decorates_borders',
  version: pkg.version,
  primaryCategory: 'decoration',
  description: i18n.global.t('border01.description'),
  defaultProps: defaults,
  defaultWidth: 400,
  defaultHeight: 300,
  features: {
    resizable: true,
    rotatable: false,
    cloneable: true,
    groupable: true,
    dataBindable: true,
    animatable: true,
  },
})
export class Border01Plugin extends BasePlugin<Border01Props> {
  componentName = 'Border01Graphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    const props = {
      w: width,
      h: height,
      colors: [this.pluginProps.color1, this.pluginProps.color2],
      backgroundColor: this.pluginProps.backgroundColor,
      borderColor: this.pluginProps.borderColor,
      dur: this.pluginProps.dur,
      showAnimation: this.pluginProps.showAnimation,
    };
    return props;
  };

  protected render(_dc: DrawContext): void {
  }

  constructor(x = 0, y = 0, w = 400, h = 300) {
    super('border01', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}