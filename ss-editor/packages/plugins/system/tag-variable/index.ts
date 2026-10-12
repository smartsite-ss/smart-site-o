// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';

// 动态扫描 locales 目录，新增语言只需添加对应 json 文件，无需改动本文件
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));

import { TagVariablePlugin } from './TagVariablePlugin';
import { tagVariablePropertySchema } from './tagVariablePropertySchema';
import TagVariableGraphicComponent from './TagVariableGraphic.vue';
import TagVariableConfigComponent from './TagVariableConfig.vue';

export const TagVariableGraphic = TagVariableGraphicComponent;
export { TagVariablePlugin, tagVariablePropertySchema };
export type { TagVariableProps } from './TagVariablePlugin';

export default createPlugin({
  type: 'tag-variable',
  category: 'system',
  version: pkg.version,
  label: () => i18n.global.t('tagVariable.label'),
  plugin: TagVariablePlugin,
  schema: tagVariablePropertySchema,
  config: TagVariableConfigComponent,
  defaultWidth: 120,
  defaultHeight: 40,
  graphicComponent: TagVariableGraphicComponent,
  graphicComponentName: 'TagVariableGraphic',
});
