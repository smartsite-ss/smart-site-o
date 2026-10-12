// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, DrawContext, InferSchemaProps, buildDefaultsFromSchema } from '@scada-editor/plugin-sdk';
import { fan5PropertySchema } from './fan5PropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));

export type Fan5Props = InferSchemaProps<typeof fan5PropertySchema> & {
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

const defaults: Fan5Props = {
  ...buildDefaultsFromSchema(fan5PropertySchema),
  deviceId: '',
  deviceCode: '',
  deviceName: '',
  tagId: '',
  tagName: '',
  dataType: 'float',
} as Fan5Props;


@Graphic({
  type: 'fan5',
  name: i18n.global.t('fan5.label'),
  category: 'mines',
  primaryCategory: 'mining',
  description: i18n.global.t('fan5.description'),
  defaultProps: defaults,
  defaultWidth: 140,
  defaultHeight: 210,
  features: {
    resizable: true,
    rotatable: false,
    cloneable: true,
    groupable: true,
    dataBindable: true,
    animatable: true,
  },
})
export class Fan5Plugin extends BasePlugin<Fan5Props> {
  componentName = 'Fan5Graphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    return {
      w: width,
      h: height,
      ...this.pluginProps,
    };
  };

  protected render(_dc: DrawContext): void {
  }

  constructor(x = 0, y = 0, w = 140, h = 210) {
    super('fan5', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}