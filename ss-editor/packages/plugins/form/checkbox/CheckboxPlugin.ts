// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, DrawContext, InferSchemaProps, buildDefaultsFromSchema } from '@scada-editor/plugin-sdk';
import { checkboxPropertySchema } from './checkboxPropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
import pkg from './package.json';

export type CheckboxProps = InferSchemaProps<typeof checkboxPropertySchema>;

const defaults: CheckboxProps = buildDefaultsFromSchema(checkboxPropertySchema) as CheckboxProps;

@Graphic({
  type: 'checkbox',
  name: i18n.global.t('checkbox.label'),
  category: 'form',
  version: pkg.version,
  primaryCategory: 'general',
  description: i18n.global.t('checkbox.description'),
  defaultProps: defaults,
  defaultWidth: 24,
  defaultHeight: 24,
  features: { resizable: true, rotatable: false, cloneable: true, groupable: true, dataBindable: true },
})
export class CheckboxPlugin extends BasePlugin<CheckboxProps> {
  componentName = 'CheckboxGraphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    return {
      w: width,
      h: height,
      checked: this.pluginProps.checked,
      label: this.pluginProps.label,
      disabled: this.pluginProps.disabled,
      indeterminate: this.pluginProps.indeterminate,
      color: this.pluginProps.color,
      labelPosition: this.pluginProps.labelPosition,
      size: this.pluginProps.size,
    };
  };

  protected render(_dc: DrawContext): void {
    // Vue SFC 模式：主渲染由 Vue DOM 层完成
  }

  constructor(x = 0, y = 0, w = 24, h = 24) {
    super('checkbox', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}
