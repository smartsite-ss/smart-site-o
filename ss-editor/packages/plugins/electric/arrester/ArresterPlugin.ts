// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, DrawContext, InferSchemaProps } from '@scada-editor/plugin-sdk';
import { arresterPropertySchema } from './arresterPropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export type ArresterProps = InferSchemaProps<typeof arresterPropertySchema>;

const defaults: ArresterProps = {
  color: '#f59e0b',
  backgroundColor: '#00000000',
  lineWidth: 2,
};


@Graphic({
  type: 'arrester',
  name: i18n.global.t('arrester.label'),
  category: 'electric',
  primaryCategory: 'electric',
  description: i18n.global.t('arrester.description'),
  defaultProps: defaults,
  defaultWidth: 30,
  defaultHeight: 70,
  features: {
    resizable: true,
    rotatable: false,
    cloneable: true,
    groupable: true,
    dataBindable: true,
    animatable: false,
  },
})
export class ArresterPlugin extends BasePlugin<ArresterProps> {
  componentName = 'ArresterGraphic';

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

  constructor(x = 0, y = 0, w = 30, h = 70) {
    super('arrester', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}
