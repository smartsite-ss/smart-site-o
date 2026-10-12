// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { BasePlugin, Graphic, InferSchemaProps, buildDefaultsFromSchema, DrawContext } from '@scada-editor/plugin-sdk';
import { tankPropertySchema } from './tankPropertySchema';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));

export type TankProps = InferSchemaProps<typeof tankPropertySchema> & {
  deviceId: string;
  deviceCode: string;
  deviceName: string;
  tagId: string;
  tagName: string;
  dataType: string;
};

const defaultTankProps: TankProps = {
  ...buildDefaultsFromSchema(tankPropertySchema),
  deviceId: '',
  deviceCode: '',
  deviceName: '',
  tagId: '',
  tagName: '',
  dataType: 'float',
} as TankProps;

@Graphic({
  type: 'tank',
  name: i18n.global.t('tank.label'),
  category: 'industrial',
  primaryCategory: 'industrial',
  description: i18n.global.t('tank.description'),
  defaultProps: defaultTankProps,
  defaultWidth: 100,
  defaultHeight: 80,
  features: { resizable: true, rotatable: false, cloneable: true, groupable: true, dataBindable: true },
})
export class TankPlugin extends BasePlugin<TankProps> {
  componentName = 'TankGraphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    return { w: width, h: height, ...this.pluginProps };
  };

  constructor(x = 0, y = 0, w = 100, h = 80) {
    super('tank', x, y, w, h);
    this.setDefaultProps({ ...defaultTankProps });
  }

  onThemeChanged(themeName: string): void {
    if (themeName === 'dark') {
      this.setPluginProps({ bodyColor: '#4A5A6A', rimColor: '#5D6D7E' } as any);
    }
  }

  protected render(_dc: DrawContext): void {
    // Vue SFC 模式：主渲染由 Vue DOM 层完成（见 TankGraphic.vue）
  }
}
