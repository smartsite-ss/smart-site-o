// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, DrawContext, InferSchemaProps, buildDefaultsFromSchema } from '@scada-editor/plugin-sdk';
import { thickenerPropertySchema } from './thickenerPropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export type ThickenerProps = InferSchemaProps<typeof thickenerPropertySchema> & {
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

const defaults: ThickenerProps = {
  ...buildDefaultsFromSchema(thickenerPropertySchema),
  deviceId: '',
  deviceCode: '',
  deviceName: '',
  tagId: '',
  tagName: '',
  dataType: 'float',
} as ThickenerProps;


@Graphic({
  type: 'thickener',
  name: i18n.global.t('thickener.label'),
  category: 'mines',
  primaryCategory: 'mining',
  description: i18n.global.t('thickener.description'),
  defaultProps: defaults,
  defaultWidth: 160,
  defaultHeight: 130,
  features: {
    resizable: true,
    rotatable: false,
    cloneable: true,
    groupable: true,
    dataBindable: true,
    animatable: true,
  },
})
export class ThickenerPlugin extends BasePlugin<ThickenerProps> {
  componentName = 'ThickenerGraphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    return {
      w: width,
      h: height,
      ...this.pluginProps,
    };
  };

  protected render(_dc: DrawContext): void { }

  constructor(x = 0, y = 0, w = 160, h = 130) {
    super('thickener', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}
