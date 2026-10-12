// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { BasePlugin, Graphic, InferSchemaProps, buildDefaultsFromSchema, DrawContext } from '@scada-editor/plugin-sdk';
import { valvePropertySchema } from './valvePropertySchema';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));

export type ValveProps = InferSchemaProps<typeof valvePropertySchema> & {
  deviceId: string;
  deviceCode: string;
  deviceName: string;
  tagId: string;
  tagName: string;
  dataType: string;
};

const defaultValveProps: ValveProps = {
  ...buildDefaultsFromSchema(valvePropertySchema),
  deviceId: '',
  deviceCode: '',
  deviceName: '',
  tagId: '',
  tagName: '',
  dataType: 'float',
} as ValveProps;

@Graphic({
  type: 'valve',
  name: i18n.global.t('valve.label'),
  category: 'industrial',
  primaryCategory: 'industrial',
  description: i18n.global.t('valve.description'),
  defaultProps: defaultValveProps,
  defaultWidth: 60,
  defaultHeight: 80,
  features: { resizable: true, rotatable: false, cloneable: true, groupable: true, dataBindable: true },
  themeColors: { bodyColor: { light: '#4A90A4', dark: '#6BA5B8' } },
})
export class ValvePlugin extends BasePlugin<ValveProps> {
  componentName = 'ValveGraphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    return { w: width, h: height, ...this.pluginProps };
  };

  constructor(x = 0, y = 0, w = 60, h = 80) {
    super('valve', x, y, w, h);
    this.setDefaultProps({ ...defaultValveProps });
  }

  onThemeChanged(themeName: string): void {
    if (themeName === 'dark') {
      this.setPluginProps({ bodyColor: '#6BA5B8' } as any);
    } else {
      this.setPluginProps({ bodyColor: defaultValveProps.bodyColor } as any);
    }
  }

  protected render(_dc: DrawContext): void {
    // Vue SFC 模式：主渲染由 Vue DOM 层完成（见 ValveGraphic.vue）
  }
}
