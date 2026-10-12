// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, InferSchemaProps, buildDefaultsFromSchema } from '@scada-editor/plugin-sdk';
import { mixingpoolPropertySchema } from './mixingpoolPropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export type MixingpoolProps = InferSchemaProps<typeof mixingpoolPropertySchema> & {
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

const defaults: MixingpoolProps = {
  ...buildDefaultsFromSchema(mixingpoolPropertySchema),
  deviceId: '',
  deviceCode: '',
  deviceName: '',
  tagId: '',
  tagName: '',
  dataType: 'float',
} as MixingpoolProps;


@Graphic({
  type: 'mixingpool',
  name: i18n.global.t('mixingpool.label'),
  category: 'mines',
  primaryCategory: 'mining',
  description: i18n.global.t('mixingpool.description'),
  defaultProps: defaults,
  defaultWidth: 140,
  defaultHeight: 200,
  features: {
    resizable: true,
    rotatable: false,
    cloneable: true,
    groupable: true,
    dataBindable: true,
    animatable: true,
  },
})
export class MixingpoolPlugin extends BasePlugin<MixingpoolProps> {
  componentName = 'MixingpoolGraphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    return {
      w: width,
      h: height,
      ...this.pluginProps,
    };
  };

  constructor(x = 0, y = 0, w = 140, h = 200) {
    super('mixingpool', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}