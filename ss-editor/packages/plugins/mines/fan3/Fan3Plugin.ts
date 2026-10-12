// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, DrawContext, InferSchemaProps, buildDefaultsFromSchema } from '@scada-editor/plugin-sdk';
import { fan3PropertySchema } from './fan3PropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));

export type Fan3Props = InferSchemaProps<typeof fan3PropertySchema> & {
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

const defaults: Fan3Props = {
  ...buildDefaultsFromSchema(fan3PropertySchema),
  deviceId: '',
  deviceCode: '',
  deviceName: '',
  tagId: '',
  tagName: '',
  dataType: 'float',
} as Fan3Props;


@Graphic({
  type: 'fan3',
  name: i18n.global.t('fan3.label'),
  category: 'mines',
  primaryCategory: 'mining',
  description: i18n.global.t('fan3.description'),
  defaultProps: defaults,
  defaultWidth: 175,
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
export class Fan3Plugin extends BasePlugin<Fan3Props> {
  componentName = 'Fan3Graphic';

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

  constructor(x = 0, y = 0, w = 175, h = 210) {
    super('fan3', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}