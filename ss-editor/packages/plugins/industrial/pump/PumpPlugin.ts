// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { BasePlugin, Graphic, InferSchemaProps, buildDefaultsFromSchema, DrawContext } from '@scada-editor/plugin-sdk';
import { pumpPropertySchema } from './pumpPropertySchema';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));

export type PumpProps = InferSchemaProps<typeof pumpPropertySchema> & {
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

const defaultPumpProps: PumpProps = {
  ...buildDefaultsFromSchema(pumpPropertySchema),
  deviceId: '',
  deviceCode: '',
  deviceName: '',
  tagId: '',
  tagName: '',
  dataType: 'float',
} as PumpProps;

@Graphic({
  type: 'pump',
  name: i18n.global.t('pump.label'),
  category: 'industrial',
  primaryCategory: 'industrial',
  description: i18n.global.t('pump.description'),
  defaultProps: defaultPumpProps,
  defaultWidth: 80,
  defaultHeight: 80,
  minWidth: 40,
  minHeight: 50,
  features: { resizable: true, rotatable: false, cloneable: true, groupable: true, dataBindable: true, animatable: true },
  themeColors: {
    bodyColor: { light: '#4A90A4', dark: '#6BA5B8' },
    impellerColor: { light: '#2E6B7D', dark: '#3E7D8F' },
  },
})
export class PumpPlugin extends BasePlugin<PumpProps> {
  componentName = 'PumpGraphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    return { w: width, h: height, ...this.pluginProps };
  };

  constructor(x = 0, y = 0, w = 80, h = 80) {
    super('pump', x, y, w, h);
    this.setDefaultProps({ ...defaultPumpProps });
  }

  onThemeChanged(themeName: string): void {
    if (themeName === 'dark') {
      this.setPluginProps({ bodyColor: '#6BA5B8', impellerColor: '#3E7D8F' } as any);
    } else {
      this.setPluginProps({ bodyColor: defaultPumpProps.bodyColor, impellerColor: defaultPumpProps.impellerColor } as any);
    }
  }

  protected render(_dc: DrawContext): void {
    // Vue SFC 模式：主渲染由 Vue DOM 层完成（见 PumpGraphic.vue）
  }
}
