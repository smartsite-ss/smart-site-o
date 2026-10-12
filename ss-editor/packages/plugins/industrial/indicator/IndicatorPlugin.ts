// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { BasePlugin, Graphic, InferSchemaProps, buildDefaultsFromSchema, DrawContext } from '@scada-editor/plugin-sdk';
import { indicatorPropertySchema } from './indicatorPropertySchema';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));

export type IndicatorProps = InferSchemaProps<typeof indicatorPropertySchema> & {
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

const defaultIndicatorProps: IndicatorProps = {
  ...buildDefaultsFromSchema(indicatorPropertySchema),
  deviceId: '',
  deviceCode: '',
  deviceName: '',
  tagId: '',
  tagName: '',
  dataType: 'float',
} as IndicatorProps;

@Graphic({
  type: 'indicator',
  name: i18n.global.t('indicator.label'),
  category: 'industrial',
  primaryCategory: 'industrial',
  description: i18n.global.t('indicator.description'),
  defaultProps: defaultIndicatorProps,
  defaultWidth: 40,
  defaultHeight: 40,
  features: { resizable: true, rotatable: false, cloneable: true, groupable: true, dataBindable: true },
})
export class IndicatorPlugin extends BasePlugin<IndicatorProps> {
  componentName = 'IndicatorGraphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    return { w: width, h: height, ...this.pluginProps };
  };

  constructor(x = 0, y = 0, w = 40, h = 40) {
    super('indicator', x, y, w, h);
    this.setDefaultProps({ ...defaultIndicatorProps });
  }

  protected render(_dc: DrawContext): void {
    // Vue SFC 模式：主渲染由 Vue DOM 层完成（见 IndicatorGraphic.vue）
  }
}
