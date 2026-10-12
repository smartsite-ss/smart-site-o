// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, DrawContext, InferSchemaProps, buildDefaultsFromSchema } from '@scada-editor/plugin-sdk';
import { ballmillPropertySchema } from './ballmillPropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));

export type BallMillProps = InferSchemaProps<typeof ballmillPropertySchema> & {
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

const defaults: BallMillProps = {
  ...buildDefaultsFromSchema(ballmillPropertySchema),
  deviceId: '',
  deviceCode: '',
  deviceName: '',
  tagId: '',
  tagName: '',
  dataType: 'float',
} as BallMillProps;


@Graphic({
  type: 'ballmill',
  name: i18n.global.t('ballmill.label'),
  category: 'mines',
  primaryCategory: 'mining',
  description: i18n.global.t('ballmill.description'),
  defaultProps: defaults,
  defaultWidth: 180,
  defaultHeight: 90,
  features: {
    resizable: true,
    rotatable: false,
    cloneable: true,
    groupable: true,
    dataBindable: true,
    animatable: true,
  },
})
export class BallmillPlugin extends BasePlugin<BallMillProps> {
  componentName = 'BallmillGraphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    return {
      w: width,
      h: height,
      ...this.pluginProps,
    };
  };

  protected render(_dc: DrawContext): void { }

  constructor(x = 0, y = 0, w = 180, h = 90) {
    super('ballmill', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}
