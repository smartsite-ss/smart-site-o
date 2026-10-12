// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, DrawContext, InferSchemaProps } from '@scada-editor/plugin-sdk';
import { capacitorPropertySchema } from './capacitorPropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export type CapacitorProps = InferSchemaProps<typeof capacitorPropertySchema>;

const defaults: CapacitorProps = {
  color: '#22c55e',
  backgroundColor: '#00000000',
  lineWidth: 2,
};


@Graphic({
  type: 'capacitor',
  name: i18n.global.t('capacitor.label'),
  category: 'electric',
  primaryCategory: 'electric',
  description: i18n.global.t('capacitor.description'),
  defaultProps: defaults,
  defaultWidth: 30,
  defaultHeight: 50,
  features: {
    resizable: true,
    rotatable: false,
    cloneable: true,
    groupable: true,
    dataBindable: true,
    animatable: false,
  },
})
export class CapacitorPlugin extends BasePlugin<CapacitorProps> {
  componentName = 'CapacitorGraphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    return {
      w: width,
      h: height,
      color: this.pluginProps.color,
      backgroundColor: this.pluginProps.backgroundColor,
      lineWidth: this.pluginProps.lineWidth,
    };
  };

  protected render(_dc: DrawContext): void { }

  constructor(x = 0, y = 0, w = 30, h = 50) {
    super('capacitor', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}
