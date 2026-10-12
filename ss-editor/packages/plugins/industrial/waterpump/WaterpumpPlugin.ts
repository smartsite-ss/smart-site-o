// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { BasePlugin, Graphic, InferSchemaProps, buildDefaultsFromSchema, DrawContext } from '@scada-editor/plugin-sdk';
import { waterpumpPropertySchema } from './waterpumpPropertySchema';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));

export type WaterpumpProps = InferSchemaProps<typeof waterpumpPropertySchema> & {
  /** 设备 UUID 主键（绑定回显/反查用） */
  deviceId: string;
  /** 设备编码（用户可读，展示用） */
  deviceCode: string;
  /** 设备名称（展示用） */
  deviceName: string;
  /** 标签 ID（运行态订阅的唯一标识） */
  tagId: string;
  /** 标签名称（展示用） */
  tagName: string;
  /** 标签数据类型（用于格式化判断） */
  dataType: string;
};

const defaultWaterpumpProps: WaterpumpProps = {
  ...buildDefaultsFromSchema(waterpumpPropertySchema),
  deviceId: '',
  deviceCode: '',
  deviceName: '',
  tagId: '',
  tagName: '',
  dataType: 'float',
} as WaterpumpProps;

@Graphic({
  type: 'waterpump',
  name: i18n.global.t('waterpump.label'),
  category: 'industrial',
  primaryCategory: 'industrial',
  description: i18n.global.t('waterpump.description'),
  defaultProps: defaultWaterpumpProps,
  defaultWidth: 120,
  defaultHeight: 60,
  minWidth: 60,
  minHeight: 40,
  features: { resizable: true, rotatable: false, cloneable: true, groupable: true, dataBindable: true, animatable: true },
  themeColors: {
    bodyColor: { light: '#5D6D7E', dark: '#7F8C8D' },
    impellerColor: { light: '#2C3E50', dark: '#34495E' },
  },
})
export class WaterpumpPlugin extends BasePlugin<WaterpumpProps> {
  componentName = 'WaterpumpGraphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    return { w: width, h: height, ...this.pluginProps };
  };

  constructor(x = 0, y = 0, w = 120, h = 60) {
    super('waterpump', x, y, w, h);
    this.setDefaultProps({ ...defaultWaterpumpProps });
  }

  onThemeChanged(themeName: string): void {
    if (themeName === 'dark') {
      this.setPluginProps({ bodyColor: '#7F8C8D', impellerColor: '#34495E' } as any);
    } else {
      this.setPluginProps({ bodyColor: defaultWaterpumpProps.bodyColor, impellerColor: defaultWaterpumpProps.impellerColor } as any);
    }
  }

  protected render(_dc: DrawContext): void {
    // Vue SFC 模式：主渲染由 Vue DOM 层完成（见 WaterpumpGraphic.vue）
  }
}
