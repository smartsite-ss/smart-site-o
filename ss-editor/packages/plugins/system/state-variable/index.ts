// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';

// 动态扫描 locales 目录，新增语言只需添加对应 json 文件，无需改动本文件
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));

import { StateVariablePlugin } from './StateVariablePlugin';
import { stateVariablePropertySchema } from './stateVariablePropertySchema';
import StateVariableGraphicComponent from './StateVariableGraphic.vue';
import StateVariableConfigComponent from './StateVariableConfig.vue';

export const StateVariableGraphic = StateVariableGraphicComponent;
export { StateVariablePlugin, stateVariablePropertySchema };
export type { StateVariableProps } from './StateVariablePlugin';
export type { StateRule, StateOperator } from './stateVariableUtils';

export default createPlugin({
  type: 'state-variable',
  category: 'system',
  version: pkg.version,
  label: () => i18n.global.t('stateVariable.label'),
  plugin: StateVariablePlugin,
  schema: stateVariablePropertySchema,
  config: StateVariableConfigComponent,
  defaultWidth: 100,
  defaultHeight: 100,
  graphicComponent: StateVariableGraphicComponent,
  graphicComponentName: 'StateVariableGraphic',
});
