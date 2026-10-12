// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, DrawContext, InferSchemaProps, buildDefaultsFromSchema } from '@scada-editor/plugin-sdk';
import { coolingtowerPropertySchema } from './coolingtowerPropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export type CoolingtowerProps = InferSchemaProps<typeof coolingtowerPropertySchema> & {
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

const defaults: CoolingtowerProps = {
  ...buildDefaultsFromSchema(coolingtowerPropertySchema),
  deviceId: '',
  deviceCode: '',
  deviceName: '',
  tagId: '',
  tagName: '',
  dataType: 'float',
} as CoolingtowerProps;


@Graphic({
  type: 'coolingtower',
  name: i18n.global.t('coolingtower.label'),
  category: 'mines',
  primaryCategory: 'mining',
  description: i18n.global.t('coolingtower.description'),
  defaultProps: defaults,
  defaultWidth: 100,
  defaultHeight: 140,
  features: {
    resizable: true,
    rotatable: false,
    cloneable: true,
    groupable: true,
    dataBindable: true,
    animatable: true,
  },
})
export class CoolingtowerPlugin extends BasePlugin<CoolingtowerProps> {
  componentName = 'CoolingtowerGraphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    return {
      w: width,
      h: height,
      ...this.pluginProps,
    };
  };

  protected render(_dc: DrawContext): void { }

  constructor(x = 0, y = 0, w = 100, h = 140) {
    super('coolingtower', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}
