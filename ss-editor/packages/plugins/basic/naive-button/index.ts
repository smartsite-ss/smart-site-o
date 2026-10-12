// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export { default as NaiveButtonIcon } from './NaiveButtonIcon.vue';
export { default as NaiveButtonConfig } from './NaiveButtonConfig.vue';
import { NaiveButtonPlugin } from './NaiveButtonPlugin';
import { naiveButtonPropertySchema } from './naiveButtonPropertySchema';
export { NaiveButtonPlugin, naiveButtonPropertySchema };

export default createPlugin({
  type: 'naive-button',
  category: 'basic',
  version: pkg.version,
  label: () => i18n.global.t('naiveButton.label'),
  plugin: NaiveButtonPlugin,
  schema: naiveButtonPropertySchema,
  defaultWidth: 100,
  defaultHeight: 40,
});