// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, DrawContext, InferSchemaProps, buildDefaultsFromSchema } from '@scada-editor/plugin-sdk';
import { inputPropertySchema } from './inputPropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
import pkg from './package.json';

export type InputProps = InferSchemaProps<typeof inputPropertySchema>;

const defaults: InputProps = buildDefaultsFromSchema(inputPropertySchema) as InputProps;

@Graphic({
  type: 'input',
  name: i18n.global.t('input.label'),
  category: 'form',
  version: pkg.version,
  primaryCategory: 'general',
  description: i18n.global.t('input.description'),
  defaultProps: defaults,
  defaultWidth: 160,
  defaultHeight: 36,
  features: { resizable: true, rotatable: false, cloneable: true, groupable: true, dataBindable: true },
})
export class InputPlugin extends BasePlugin<InputProps> {
  componentName = 'InputGraphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    return {
      w: width,
      h: height,
      value: this.pluginProps.value,
      placeholder: this.pluginProps.placeholder,
      backgroundColor: this.pluginProps.backgroundColor,
      borderColor: this.pluginProps.borderColor,
      borderWidth: this.pluginProps.borderWidth,
      borderStyle: this.pluginProps.borderStyle,
      borderRadius: this.pluginProps.borderRadius,
      textColor: this.pluginProps.textColor,
      fontSize: this.pluginProps.fontSize,
      fontWeight: this.pluginProps.fontWeight,
      textAlign: this.pluginProps.textAlign,
      shadowColor: this.pluginProps.shadowColor,
      shadowOffsetX: this.pluginProps.shadowOffsetX,
      shadowOffsetY: this.pluginProps.shadowOffsetY,
      shadowBlur: this.pluginProps.shadowBlur,
    };
  };

  protected render(_dc: DrawContext): void {
    // Vue SFC 模式：主渲染由 Vue DOM 层完成
  }

  constructor(x = 0, y = 0, w = 160, h = 36) {
    super('input', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}
