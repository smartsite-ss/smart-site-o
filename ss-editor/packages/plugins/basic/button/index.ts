// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export { default as ButtonIcon } from './ButtonIcon.vue';
export { default as ButtonConfig } from './ButtonConfig.vue';
import { ButtonPlugin } from './ButtonPlugin';
import { buttonPropertySchema } from './buttonPropertySchema';
export { ButtonPlugin, buttonPropertySchema };

export default createPlugin({
  type: 'button',
  category: 'basic',
  version: pkg.version,
  label: () => i18n.global.t('button.label'),
  plugin: ButtonPlugin,
  schema: buttonPropertySchema,
  defaultWidth: 100,
  defaultHeight: 40,
});