// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, DrawContext, InferSchemaProps, buildDefaultsFromSchema } from '@scada-editor/plugin-sdk';
import { circscreenPropertySchema } from './circscreenPropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export type CircscreenProps = InferSchemaProps<typeof circscreenPropertySchema> & {
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

const defaults: CircscreenProps = {
  ...buildDefaultsFromSchema(circscreenPropertySchema),
  deviceId: '',
  deviceCode: '',
  deviceName: '',
  tagId: '',
  tagName: '',
  dataType: 'float',
} as CircscreenProps;


@Graphic({
  type: 'circscreen', name: i18n.global.t('circscreen.label'),
  category: 'mines', primaryCategory: 'mining',
  description: i18n.global.t('circscreen.description'),
  defaultProps: defaults, defaultWidth: 120, defaultHeight: 120,
  features: { resizable: true, rotatable: false, cloneable: true, groupable: true, dataBindable: true, animatable: true },
})
export class CircscreenPlugin extends BasePlugin<CircscreenProps> {
  componentName = 'CircscreenGraphic';
  getComponentProps = () => ({ w: this.getSize().width, h: this.getSize().height, ...this.pluginProps });
  protected render(_dc: DrawContext): void { }
  constructor(x = 0, y = 0, w = 120, h = 120) { super('circscreen', x, y, w, h); this.setDefaultProps({ ...defaults }); }
}
