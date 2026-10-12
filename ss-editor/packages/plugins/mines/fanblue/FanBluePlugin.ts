// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, DrawContext, InferSchemaProps, buildDefaultsFromSchema } from '@scada-editor/plugin-sdk';
import { fanbluePropertySchema } from './fanbluePropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));

export type FanBlueProps = InferSchemaProps<typeof fanbluePropertySchema> & {
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

const defaults: FanBlueProps = {
  ...buildDefaultsFromSchema(fanbluePropertySchema),
  deviceId: '',
  deviceCode: '',
  deviceName: '',
  tagId: '',
  tagName: '',
  dataType: 'float',
} as FanBlueProps;


@Graphic({
  type: 'fanblue',
  name: i18n.global.t('fanblue.label'),
  category: 'mines',
  primaryCategory: 'mining',
  description: i18n.global.t('fanblue.description'),
  defaultProps: defaults,
  defaultWidth: 200,
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
export class FanBluePlugin extends BasePlugin<FanBlueProps> {
  componentName = 'FanBlueGraphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    const props = {
      w: width,
      h: height,
      dur: this.pluginProps.dur,
      roate: this.pluginProps.roate,
      cls: this.pluginProps.cls,
      backgroundColor: this.pluginProps.backgroundColor,
      colors: this.pluginProps.colors,
      dataset: this.pluginProps.dataset,
    };
    return props;
  };

  protected render(_dc: DrawContext): void {
  }

  constructor(x = 0, y = 0, w = 200, h = 200) {
    super('fanblue', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}