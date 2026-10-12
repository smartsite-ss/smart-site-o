// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, InferSchemaProps, buildDefaultsFromSchema } from '@scada-editor/plugin-sdk';
import { conveyerbeltPropertySchema } from './conveyerbeltPropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export type ConveyerbeltProps = InferSchemaProps<typeof conveyerbeltPropertySchema> & {
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

const defaults: ConveyerbeltProps = {
  ...buildDefaultsFromSchema(conveyerbeltPropertySchema),
  deviceId: '',
  deviceCode: '',
  deviceName: '',
  tagId: '',
  tagName: '',
  dataType: 'float',
} as ConveyerbeltProps;


@Graphic({
  type: 'conveyerbelt',
  name: i18n.global.t('conveyerbelt.label'),
  category: 'mines',
  primaryCategory: 'mining',
  description: i18n.global.t('conveyerbelt.description'),
  defaultProps: defaults,
  defaultWidth: 370,
  defaultHeight: 50,
  features: {
    resizable: true,
    rotatable: false,
    cloneable: true,
    groupable: true,
    dataBindable: true,
    animatable: true,
  },
})
export class ConveyerbeltPlugin extends BasePlugin<ConveyerbeltProps> {
  componentName = 'ConveyerbeltGraphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    const props = {
      w: width,
      h: height,
      colors: [this.pluginProps.color1, this.pluginProps.color2, this.pluginProps.color3],
      flowColor: [this.pluginProps.flowColor],
      pipeColor: [this.pluginProps.pipeColor],
      bgWidth: this.pluginProps.bgWidth,
      boardWidth: this.pluginProps.boardWidth,
      roate: this.pluginProps.roate,
      cls: this.pluginProps.cls,
      dur: this.pluginProps.dur,
      backgroundColor: this.pluginProps.backgroundColor,
      dataset: this.pluginProps.dataset,
      forwardValue: this.pluginProps.forwardValue,
      backwardValue: this.pluginProps.backwardValue,
      stopValue: this.pluginProps.stopValue,
      defaultCls: this.pluginProps.defaultCls,
      decimalPlaces: this.pluginProps.decimalPlaces,
      deviceId: this.pluginProps.deviceId,
      deviceCode: this.pluginProps.deviceCode,
      deviceName: this.pluginProps.deviceName,
      tagId: this.pluginProps.tagId,
      tagName: this.pluginProps.tagName,
      dataType: this.pluginProps.dataType,
    };
    return props;
  };

  constructor(x = 0, y = 0, w = 370, h = 50) {
    super('conveyerbelt', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}