// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, DrawContext, InferSchemaProps } from '@scada-editor/plugin-sdk';
import { schema } from './border17PropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
import pkg from './package.json';

export type Border17Props = InferSchemaProps<typeof schema>;

const defaults: Border17Props = {
  color1: '#00ffff',
  color2: '#ff00ff',
  color3: '#0a0a1a',
  backgroundColor: '#00000000',
  showCircuit: true,
  showScanline: true,
  animationSpeed: 1,
};


@Graphic({
  type: 'border17',
  name: i18n.global.t('border17.label'),
  category: 'decorates_borders',
  version: pkg.version,
  primaryCategory: 'decoration',
  description: i18n.global.t('border17.description'),
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
export class Border17Plugin extends BasePlugin<Border17Props> {
  componentName = 'Border17Graphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    return {
      w: width,
      h: height,
      colors: [this.pluginProps.color1, this.pluginProps.color2, this.pluginProps.color3],
      backgroundColor: this.pluginProps.backgroundColor,
      showCircuit: this.pluginProps.showCircuit,
      showScanline: this.pluginProps.showScanline,
      animationSpeed: this.pluginProps.animationSpeed,
    };
  };

  protected render(_dc: DrawContext): void {
  }

  constructor(x = 0, y = 0, w = 400, h = 300) {
    super('border17', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}