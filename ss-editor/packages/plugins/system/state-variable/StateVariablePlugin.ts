// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, DrawContext, InferSchemaProps, buildDefaultsFromSchema } from '@scada-editor/plugin-sdk';
import { i18n, registerLocaleModules } from '@scada-editor/core';
import { stateVariablePropertySchema } from './stateVariablePropertySchema';
import type { StateRule } from './stateVariableUtils';

// 动态扫描 locales 目录，新增语言只需添加对应 json 文件，无需改动本文件
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));

import pkg from './package.json';

export type StateVariableProps = InferSchemaProps<typeof stateVariablePropertySchema> & {
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
  /** 标签数据类型（用于比较匹配适配） */
  dataType: string;
  /** 状态规则数组，顺序即匹配优先级 */
  states: StateRule[];
  /** 未命中任何规则时显示的默认图片 */
  defaultImage: string;
};

const defaults: StateVariableProps = {
  ...buildDefaultsFromSchema(stateVariablePropertySchema),
  deviceId: '',
  deviceCode: '',
  deviceName: '',
  tagId: '',
  tagName: '',
  dataType: 'float',
  states: [],
  defaultImage: '',
} as StateVariableProps;

@Graphic({
  type: 'state-variable',
  name: i18n.global.t('stateVariable.label'),
  category: 'system',
  version: pkg.version,
  description: i18n.global.t('stateVariable.description'),
  defaultProps: defaults,
  defaultWidth: 100,
  defaultHeight: 100,
  features: {
    resizable: true,
    rotatable: false,
    cloneable: true,
    groupable: true,
    dataBindable: false,
    animatable: false,
  },
})
export class StateVariablePlugin extends BasePlugin<StateVariableProps> {
  componentName = 'StateVariableGraphic';

  getComponentProps = () => {
    const { width, height } = this.getSize();
    return { w: width, h: height, ...this.pluginProps };
  };

  protected render(_dc: DrawContext): void {
    // Vue SFC 模式：主渲染由 Vue DOM 层完成
  }

  constructor(x = 0, y = 0, w = 100, h = 100) {
    super('state-variable', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }
}
