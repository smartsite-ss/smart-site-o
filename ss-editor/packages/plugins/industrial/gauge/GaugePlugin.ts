// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { BasePlugin, Graphic, InferSchemaProps, buildDefaultsFromSchema, DrawContext } from '@scada-editor/plugin-sdk';
import { gaugePropertySchema } from './gaugePropertySchema';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));

export type GaugeProps = InferSchemaProps<typeof gaugePropertySchema> & {
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

const defaultGaugeProps: GaugeProps = {
  ...buildDefaultsFromSchema(gaugePropertySchema),
  deviceId: '',
  deviceCode: '',
  deviceName: '',
  tagId: '',
  tagName: '',
  dataType: 'float',
} as GaugeProps;

@Graphic({
  type: 'gauge',
  name: i18n.global.t('gauge.label'),
  category: 'industrial',
  primaryCategory: 'industrial',
  description: i18n.global.t('gauge.description'),
  defaultProps: defaultGaugeProps,
  defaultWidth: 120,
  defaultHeight: 120,
  features: { resizable: true, rotatable: false, cloneable: true, groupable: true, dataBindable: true },
})
export class GaugePlugin extends BasePlugin<GaugeProps> {
  componentName = 'GaugeGraphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    return { w: width, h: height, ...this.pluginProps };
  };

  constructor(x = 0, y = 0, w = 120, h = 120) {
    super('gauge', x, y, w, h);
    this.setDefaultProps({ ...defaultGaugeProps });
  }

  onThemeChanged(themeName: string): void {
    if (themeName === 'dark') {
      this.setPluginProps({ faceColor: '#2A3A4A', rimColor: '#5D6D7E' } as any);
    } else {
      this.setPluginProps({ faceColor: defaultGaugeProps.faceColor, rimColor: defaultGaugeProps.rimColor } as any);
    }
  }

  protected render(_dc: DrawContext): void {
    // Vue SFC 模式：主渲染由 Vue DOM 层完成（见 GaugeGraphic.vue）
  }
}
