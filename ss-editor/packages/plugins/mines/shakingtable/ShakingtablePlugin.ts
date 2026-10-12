// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, DrawContext, InferSchemaProps, buildDefaultsFromSchema } from '@scada-editor/plugin-sdk';
import { shakingtablePropertySchema } from './shakingtablePropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export type ShakingtableProps = InferSchemaProps<typeof shakingtablePropertySchema> & {
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

const defaults: ShakingtableProps = {
  ...buildDefaultsFromSchema(shakingtablePropertySchema),
  deviceId: '',
  deviceCode: '',
  deviceName: '',
  tagId: '',
  tagName: '',
  dataType: 'float',
} as ShakingtableProps;


@Graphic({
  type: 'shakingtable',
  name: i18n.global.t('shakingtable.label'),
  category: 'mines',
  primaryCategory: 'mining',
  description: i18n.global.t('shakingtable.description'),
  defaultProps: defaults,
  defaultWidth: 180,
  defaultHeight: 85,
  features: {
    resizable: true,
    rotatable: false,
    cloneable: true,
    groupable: true,
    dataBindable: true,
    animatable: true,
  },
})
export class ShakingtablePlugin extends BasePlugin<ShakingtableProps> {
  componentName = 'ShakingtableGraphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    return {
      w: width,
      h: height,
      ...this.pluginProps,
    };
  };

  protected render(_dc: DrawContext): void { }

  constructor(x = 0, y = 0, w = 180, h = 85) {
    super('shakingtable', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}
