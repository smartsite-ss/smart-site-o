// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, DrawContext, InferSchemaProps } from '@scada-editor/plugin-sdk';
import { navigationButtonPropertySchema } from './navigationButtonPropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
import pkg from './package.json';

export type NavigationButtonProps = InferSchemaProps<typeof navigationButtonPropertySchema>;

const defaults: NavigationButtonProps = {
  text: '导航按钮',
  type: 'primary',
  size: 'default',
  disabled: false,
  transparent: false,
  backgroundColor: '',
  fontColor: '',
  borderColor: '',
  borderWidth: 1,
  borderStyle: 'solid',
  borderRadius: 4,
  fontSize: 13,
  fontWeight: 'normal',
  textAlign: 'center',
  shadowColor: '',
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  shadowBlur: 0,
  targetType: 'none',
  targetPage: '',
  targetUrl: '',
};

@Graphic({
  type: 'navigation-button',
  name: i18n.global.t('navigationButton.label'),
  category: 'system',
  version: pkg.version,
  description: i18n.global.t('navigationButton.description'),
  defaultProps: defaults,
  defaultWidth: 100,
  defaultHeight: 40,
  features: {
    resizable: true,
    rotatable: false,
    cloneable: true,
    groupable: true,
    dataBindable: true,
    animatable: false,
  },
})
export class NavigationButtonPlugin extends BasePlugin<NavigationButtonProps> {
  componentName = 'NavigationButtonGraphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    return {
      w: width,
      h: height,
      text: this.pluginProps.text,
      type: this.pluginProps.type,
      size: this.pluginProps.size,
      disabled: this.pluginProps.disabled,
      transparent: this.pluginProps.transparent,
      backgroundColor: this.pluginProps.backgroundColor,
      fontColor: this.pluginProps.fontColor,
      borderColor: this.pluginProps.borderColor,
      borderWidth: this.pluginProps.borderWidth,
      borderStyle: this.pluginProps.borderStyle,
      borderRadius: this.pluginProps.borderRadius,
      fontSize: this.pluginProps.fontSize,
      fontWeight: this.pluginProps.fontWeight,
      textAlign: this.pluginProps.textAlign,
      shadowColor: this.pluginProps.shadowColor,
      shadowOffsetX: this.pluginProps.shadowOffsetX,
      shadowOffsetY: this.pluginProps.shadowOffsetY,
      shadowBlur: this.pluginProps.shadowBlur,
      targetType: this.pluginProps.targetType,
      targetPage: this.pluginProps.targetPage,
      targetUrl: this.pluginProps.targetUrl,
    };
  };

  protected render(_dc: DrawContext): void {
    // Vue SFC 模式：主渲染由 Vue DOM 层完成
  }

  constructor(x = 0, y = 0, w = 100, h = 40) {
    super('navigation-button', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}
