// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, DrawContext, InferSchemaProps, buildDefaultsFromSchema } from '@scada-editor/plugin-sdk';
import { jigmachinePropertySchema } from './jigmachinePropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export type JigmachineProps = InferSchemaProps<typeof jigmachinePropertySchema> & {
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

const defaults: JigmachineProps = {
  ...buildDefaultsFromSchema(jigmachinePropertySchema),
  deviceId: '',
  deviceCode: '',
  deviceName: '',
  tagId: '',
  tagName: '',
  dataType: 'float',
} as JigmachineProps;


@Graphic({
  type: 'jigmachine', name: i18n.global.t('jigmachine.label'),
  category: 'mines', primaryCategory: 'mining',
  description: i18n.global.t('jigmachine.description'),
  defaultProps: defaults, defaultWidth: 120, defaultHeight: 90,
  features: { resizable: true, rotatable: false, cloneable: true, groupable: true, dataBindable: true, animatable: true },
})
export class JigmachinePlugin extends BasePlugin<JigmachineProps> {
  componentName = 'JigmachineGraphic';
  getComponentProps = () => ({ w: this.getSize().width, h: this.getSize().height, ...this.pluginProps });
  protected render(_dc: DrawContext): void { }
  constructor(x = 0, y = 0, w = 120, h = 90) { super('jigmachine', x, y, w, h); this.setDefaultProps({ ...defaults }); }
}
