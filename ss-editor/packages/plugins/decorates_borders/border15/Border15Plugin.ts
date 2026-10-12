// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, DrawContext, InferSchemaProps } from '@scada-editor/plugin-sdk';
import { schema } from './border15PropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
import pkg from './package.json';

export type Border15Props = InferSchemaProps<typeof schema>;

const defaults: Border15Props = {
  color1: '#d4a853',
  color2: '#b8860b',
  color3: '#1a1a2e',
  backgroundColor: '#00000000',
  showSunburst: true,
  showCorners: true,
  animationSpeed: 1,
};


@Graphic({
  type: 'border15',
  name: i18n.global.t('border15.label'),
  category: 'decorates_borders',
  version: pkg.version,
  primaryCategory: 'decoration',
  description: i18n.global.t('border15.description'),
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
export class Border15Plugin extends BasePlugin<Border15Props> {
  componentName = 'Border15Graphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    return {
      w: width,
      h: height,
      colors: [this.pluginProps.color1, this.pluginProps.color2, this.pluginProps.color3],
      backgroundColor: this.pluginProps.backgroundColor,
      showSunburst: this.pluginProps.showSunburst,
      showCorners: this.pluginProps.showCorners,
      animationSpeed: this.pluginProps.animationSpeed,
    };
  };

  protected render(_dc: DrawContext): void {
  }

  constructor(x = 0, y = 0, w = 400, h = 300) {
    super('border15', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}