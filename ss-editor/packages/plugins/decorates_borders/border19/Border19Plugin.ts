// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, DrawContext, InferSchemaProps } from '@scada-editor/plugin-sdk';
import { schema } from './border19PropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
import pkg from './package.json';

export type Border19Props = InferSchemaProps<typeof schema>;

const defaults: Border19Props = {
  color1: '#1a1a1a',
  color2: '#e63946',
  color3: '#f1f5f9',
  backgroundColor: '#00000000',
  showBlocks: true,
  showAccents: true,
  animationSpeed: 1,
};


@Graphic({
  type: 'border19',
  name: i18n.global.t('border19.label'),
  category: 'decorates_borders',
  version: pkg.version,
  primaryCategory: 'decoration',
  description: i18n.global.t('border19.description'),
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
export class Border19Plugin extends BasePlugin<Border19Props> {
  componentName = 'Border19Graphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    return {
      w: width,
      h: height,
      colors: [this.pluginProps.color1, this.pluginProps.color2, this.pluginProps.color3],
      backgroundColor: this.pluginProps.backgroundColor,
      showBlocks: this.pluginProps.showBlocks,
      showAccents: this.pluginProps.showAccents,
      animationSpeed: this.pluginProps.animationSpeed,
    };
  };

  protected render(_dc: DrawContext): void {
  }

  constructor(x = 0, y = 0, w = 400, h = 300) {
    super('border19', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}