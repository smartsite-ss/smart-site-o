// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';

// ★ 必须在 InputPlugin 导入前 merge locale，
// 否则 @Graphic 装饰器中的 i18n.global.t() 会找不到 key
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));

export { default as InputIcon } from './InputIcon.vue';
export { default as InputConfig } from './InputConfig.vue';
import { InputPlugin } from './InputPlugin';
import { inputPropertySchema } from './inputPropertySchema';
import InputGraphicComponent from './InputGraphic.vue';

export const InputGraphic = InputGraphicComponent;
export { InputPlugin, inputPropertySchema };
export type { InputProps } from './InputPlugin';

export default createPlugin({
  type: 'input',
  category: 'form',
  version: pkg.version,
  label: () => i18n.global.t('input.label'),
  plugin: InputPlugin,
  schema: inputPropertySchema,
  defaultWidth: 160,
  defaultHeight: 36,
  graphicComponent: InputGraphicComponent,
  graphicComponentName: 'InputGraphic',
});
