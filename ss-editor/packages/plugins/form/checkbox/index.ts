// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';

// ★ 必须在 CheckboxPlugin 导入前 merge locale，
// 否则 @Graphic 装饰器中的 i18n.global.t() 会找不到 key
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));

export { default as CheckboxIcon } from './CheckboxIcon.vue';
export { default as CheckboxConfig } from './CheckboxConfig.vue';
import { CheckboxPlugin } from './CheckboxPlugin';
import { checkboxPropertySchema } from './checkboxPropertySchema';
import CheckboxGraphicComponent from './CheckboxGraphic.vue';

export const CheckboxGraphic = CheckboxGraphicComponent;
export { CheckboxPlugin, checkboxPropertySchema };
export type { CheckboxProps } from './CheckboxPlugin';

export default createPlugin({
  type: 'checkbox',
  category: 'form',
  version: pkg.version,
  label: () => i18n.global.t('checkbox.label'),
  plugin: CheckboxPlugin,
  schema: checkboxPropertySchema,
  defaultWidth: 24,
  defaultHeight: 24,
  graphicComponent: CheckboxGraphicComponent,
  graphicComponentName: 'CheckboxGraphic',
});
