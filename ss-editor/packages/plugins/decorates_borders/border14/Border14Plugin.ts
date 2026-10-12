// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, DrawContext, InferSchemaProps } from '@scada-editor/plugin-sdk';
import { schema } from './border14PropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
import pkg from './package.json';

export type Border14Props = InferSchemaProps<typeof schema>;

const defaults: Border14Props = {
  color1: '#00d4ff',
  color2: '#0066cc',
  backgroundColor: '#00000000',
  showHexGrid: true,
  showScanLine: true,
  showCoreLines: true,
  animationSpeed: 1,
};


@Graphic({
  type: 'border14',
  name: i18n.global.t('border14.label'),
  category: 'decorates_borders',
  version: pkg.version,
  primaryCategory: 'decoration',
  description: i18n.global.t('border14.description'),
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
export class Border14Plugin extends BasePlugin<Border14Props> {
  componentName = 'Border14Graphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    return {
      w: width,
      h: height,
      colors: [this.pluginProps.color1, this.pluginProps.color2],
      backgroundColor: this.pluginProps.backgroundColor,
      showHexGrid: this.pluginProps.showHexGrid,
      showScanLine: this.pluginProps.showScanLine,
      showCoreLines: this.pluginProps.showCoreLines,
      animationSpeed: this.pluginProps.animationSpeed,
    };
  };

  protected render(_dc: DrawContext): void {
  }

  constructor(x = 0, y = 0, w = 400, h = 300) {
    super('border14', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}