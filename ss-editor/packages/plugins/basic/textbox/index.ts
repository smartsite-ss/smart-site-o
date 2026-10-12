// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n, registerLocaleModules } from '@scada-editor/core';
import { createPlugin } from '@scada-editor/plugin-sdk';
import pkg from './package.json';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export { default as TextboxIcon } from './TextboxIcon.vue';
export { default as TextboxConfig } from './TextboxConfig.vue';
import { TextboxPlugin } from './TextboxPlugin';
import { textboxPropertySchema } from './textboxPropertySchema';
export { TextboxPlugin, textboxPropertySchema };

export default createPlugin({
  type: 'textbox',
  category: 'basic',
  version: pkg.version,
  label: () => i18n.global.t('textbox.label'),
  plugin: TextboxPlugin,
  schema: textboxPropertySchema,
  defaultWidth: 120,
  defaultHeight: 30,
});